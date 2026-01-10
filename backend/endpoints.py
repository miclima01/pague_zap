from fastapi import APIRouter, Header, UploadFile, File, Form, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Any
import os
import json
from meta_whatsapp_templates_service import WhatsAppTemplateService

router = APIRouter()

# Environment variables
META_APP_ID = os.getenv("META_APP_ID")
META_TOKEN = os.getenv("META_TOKEN")

# Dependency for service
def get_service(
    token: str = None,
    x_meta_token: Optional[str] = Header(None, alias="X-Meta-Token"),
    x_meta_app_id: Optional[str] = Header(None, alias="X-Meta-App-Id")
) -> WhatsAppTemplateService:
    # 1. Try Header (SaaS/Proxy mode)
    final_token = x_meta_token
    final_app_id = x_meta_app_id

    # 2. Fallback to Env/Global (Dev mode or single tenant)
    if not final_token:
        final_token = token or META_TOKEN
    if not final_app_id:
        final_app_id = META_APP_ID

    if not final_app_id:
        raise HTTPException(status_code=500, detail="Server misconfiguration: META_APP_ID missing (Header or Env)")
    if not final_token:
        raise HTTPException(status_code=500, detail="Server misconfiguration: META_TOKEN missing (Header or Env)")
        
    return WhatsAppTemplateService(app_id=final_app_id, token=final_token)

# Schemas
class TemplateExample(BaseModel):
    header_handle: Optional[List[str]] = None
    body_text: Optional[List[List[str]]] = None

class CreateTemplateRequest(BaseModel):
    waba_id: str
    name: str
    language: str
    category: str = "UTILITY"
    body_text: str
    body_examples: List[List[str]]
    header_image_url: Optional[str] = None
    use_order_details: bool = False

@router.post("/api/templates/whatsapp")
async def create_template(
    waba_id: str = Form(...),
    name: str = Form(...),
    language: str = Form(...),
    category: str = Form("UTILITY"),
    body_text: str = Form(...),
    body_examples: str = Form(...), # JSON string of list of lists
    header_image_url: Optional[str] = Form(None),
    use_order_details: bool = Form(False),
    header_image_file: Optional[UploadFile] = File(None),
    service: WhatsAppTemplateService = Depends(get_service)
):
    """
    Endpoint to create a WhatsApp Message Template with Image Header + Optional Order Details.
    """
    
    # Validation inputs
    try:
        examples_list = json.loads(body_examples)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON for body_examples")

    # 1. Handle Image Source
    file_bytes = None
    mime_type = None
    file_length = 0
    filename = "header_image.jpg"

    if header_image_file:
        file_bytes = await header_image_file.read()
        mime_type = header_image_file.content_type
        file_length = len(file_bytes)
        filename = header_image_file.filename or filename
        # Allow webp if desired, prompt says confirm types.
        if mime_type not in ["image/jpeg", "image/png", "image/webp"]:
             raise HTTPException(status_code=400, detail="Invalid image type. Use JPEG or PNG.")
             
        if file_length > 5 * 1024 * 1024:
             raise HTTPException(status_code=400, detail="Image exceeds 5MB limit.")

    elif header_image_url:
        file_bytes, mime_type, file_length = await service.download_image(header_image_url)
    else:
        raise HTTPException(status_code=400, detail="Must provide either header_image_file or header_image_url")

    # 2. Start Resumable Upload Flow
    # Step 1: Create Session
    upload_id = await service.create_upload_session(file_length, mime_type, filename)
    
    # Step 2: Upload File
    header_handle = await service.upload_file_get_handle(upload_id, file_bytes)

    # 3. Construct Template Payload
    
    # Force UTILITY and Order Details text fix if requested
    final_category = category
    components = []

    # HEADER
    components.append({
        "type": "HEADER",
        "format": "IMAGE",
        "example": { "header_handle": [header_handle] }
    })

    # BODY
    components.append({
        "type": "BODY",
        "text": body_text,
        "example": { "body_text": examples_list }
    })

    # BUTTONS (Order Details)
    if use_order_details:
        final_category = "UTILITY" # Enforced by prompt
        components.append({
            "type": "BUTTONS",
            "buttons": [
                {
                    "type": "ORDER_DETAILS",
                    "text": "Review and Pay" # Fixed as requested
                }
            ]
        })

    payload = {
        "name": name,
        "language": language,
        "category": final_category,
        "components": components
    }

    # 4. Create Template
    result = await service.create_message_template(waba_id, payload)
    
    if result["status"] == "error":
        # Graph API errors usually 400 or 500, but we return 200 with error info to frontend or 400?
        # Prompt: "Retornar ao front: status, meta_error..."
        # We can return a JSON with status=error
        return result
        
    return result

