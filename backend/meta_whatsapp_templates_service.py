import os
import re
import httpx
from fastapi import UploadFile, HTTPException
from typing import Optional, Tuple, List, Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("whatsapp_service")

META_GRAPH_VERSION = os.getenv("META_GRAPH_VERSION", "v21.0")

class WhatsAppTemplateService:
    def __init__(self, app_id: str, token: str):
        self.app_id = app_id
        self.token = token
        self.base_url = f"https://graph.facebook.com/{META_GRAPH_VERSION}"

    def _get_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

    async def download_image(self, url: str) -> Tuple[bytes, str, int]:
        """
        Downloads image from URL.
        Returns: (file_bytes, mime_type, file_length)
        """
        logger.info(f"Downloading image from URL: {url}")
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url)
                response.raise_for_status()
                
                content = response.content
                mime_type = response.headers.get("content-type", "image/jpeg")
                file_length = len(content)
                
                if file_length > 5 * 1024 * 1024:  # 5MB limit check
                     raise HTTPException(status_code=400, detail="Image size exceeds 5MB")

                return content, mime_type, file_length
            except httpx.HTTPError as e:
                logger.error(f"Failed to download image: {str(e)}")
                raise HTTPException(status_code=400, detail=f"Failed to download image: {str(e)}")

    async def create_upload_session(self, file_length: int, file_type: str, file_name: str = "header_image") -> str:
        """
        Step 1: Create upload session.
        Returns: upload_session_id
        """
        url = f"{self.base_url}/{self.app_id}/uploads"
        payload = {
            "file_length": file_length,
            "file_type": file_type,
            "file_name": file_name
        }
        
        logger.info(f"Creating upload session for {file_name} ({file_length} bytes)")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=self._get_headers(), json=payload, params={"access_token": self.token})
            
            if response.status_code != 200:
                logger.error(f"Upload session failed: {response.text}")
                raise HTTPException(status_code=500, detail=f"Failed to create upload session: {response.text}")
            
            data = response.json()
            upload_id = data.get("id")
            if not upload_id:
                raise HTTPException(status_code=500, detail="No upload ID returned from Graph API")
            
            # The ID returns as "upload:..." usually, sometimes just the ID. Graph API requires the specific ID for step 2.
            # Example ID: "upload:12345..."
            return upload_id

    async def upload_file_get_handle(self, upload_session_id: str, file_bytes: bytes) -> str:
        """
        Step 2: Upload binary and get handle.
        Returns: header_handle (h)
        """
        # Note: The ID returned from step 1 is a "Upload Session ID". 
        # The URL is https://graph.facebook.com/{GRAPH_VERSION}/{upload_session_id}
        # But wait, looking at documentation/prompt: 
        # "POST https://graph.facebook.com/{GRAPH_VERSION}/{upload_session_id}"
        
        # IMPORTANT: Extract the numeric ID if it comes as "upload:123" or use strictly as returned?
        # The prompt says: "Resposta contém um id no formato 'upload:...'. Usar em POST /{upload_session_id}"
        # So we use the returned ID directly in the path.
        
        url = f"{self.base_url}/{upload_session_id}"
        
        headers = {
            "Authorization": f"Bearer {self.token}",
            "file_offset": "0"
        }
        
        # Multipart upload for logic
        # 'file' field is required.
        files = {"file": ("header_image", file_bytes)}
        
        logger.info(f"Uploading bytes to session {upload_session_id}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, files=files) 
             # Note: Don't set Content-Type manually for multipart, httpx handles it.
            
            if response.status_code != 200:
                logger.error(f"File upload failed: {response.text}")
                raise HTTPException(status_code=500, detail=f"Failed to upload file content: {response.text}")
            
            data = response.json()
            handle = data.get("h")
            if not handle:
                raise HTTPException(status_code=500, detail=f"No asset handle returned. Response: {response.text}")
            
            return handle

    async def create_message_template(self, waba_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Creates the message template.
        """
        url = f"{self.base_url}/{waba_id}/message_templates"
        
        # Validation
        if not re.match(r"^[a-z0-9_]+$", payload.get("name", "")):
             raise HTTPException(status_code=400, detail="Invalid template name. Use only lowercase letters, numbers, and underscores.")

        logger.info(f"Creating template {payload.get('name')} for WABA {waba_id}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=self._get_headers(), json=payload)
            
            # extract fbtrace_id
            fbtrace_id = response.headers.get("x-fb-trace-id", "unknown")
            logger.info(f"Graph API Response Status: {response.status_code}, Trace ID: {fbtrace_id}")

            if response.status_code not in (200, 201):
                # Log masked error
                error_body = response.text
                masked_error = error_body.replace(self.token, "********")
                logger.error(f"Create template failed. Body: {masked_error}")
                
                return {
                    "status": "error",
                    "meta_error": response.json(),
                    "meta_trace_id": fbtrace_id,
                    "http_code": response.status_code
                }
                
            return {
                "status": "success",
                "data": response.json(),
                "meta_trace_id": fbtrace_id
            }
