import pytest
import sys
import os
from unittest.mock import MagicMock, patch
import httpx
from fastapi import HTTPException

# Add backend to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from meta_whatsapp_templates_service import WhatsAppTemplateService

@pytest.fixture
def service():
    return WhatsAppTemplateService(app_id="12345", token="fake_token")

@pytest.mark.asyncio
async def test_create_upload_session_success(service):
    # Mock httpx response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"id": "upload:session_id"}

    with patch("httpx.AsyncClient.post", return_value=mock_response) as mock_post:
        session_id = await service.create_upload_session(100, "image/jpeg")
        assert session_id == "upload:session_id"
        mock_post.assert_called_once()

@pytest.mark.asyncio
async def test_upload_file_get_handle_success(service):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"h": "handle_123"}

    with patch("httpx.AsyncClient.post", return_value=mock_response) as mock_post:
        handle = await service.upload_file_get_handle("session_id", b"fake_bytes")
        assert handle == "handle_123"
        # Check if file_offset header is present
        call_kwargs = mock_post.call_args.kwargs
        assert call_kwargs["headers"]["file_offset"] == "0"

@pytest.mark.asyncio
async def test_create_message_template_success(service):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"id": "template_123"}
    mock_response.headers = {"x-fb-trace-id": "trace_xyz"}

    payload = {"name": "valid_name", "category": "UTILITY"}

    with patch("httpx.AsyncClient.post", return_value=mock_response) as mock_post:
        result = await service.create_message_template("waba_id_123", payload)
        assert result["status"] == "success"
        assert result["data"]["id"] == "template_123"

@pytest.mark.asyncio
async def test_create_message_template_invalid_name(service):
    payload = {"name": "Invalid Name with Spaces"}
    with pytest.raises(HTTPException) as exc:
        await service.create_message_template("waba_id", payload)
    assert exc.value.status_code == 400

@pytest.mark.asyncio
async def test_download_image_success(service):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.content = b"fake image content"
    mock_response.headers = {"content-type": "image/png"}

    with patch("httpx.AsyncClient.get", return_value=mock_response):
        content, mime, length = await service.download_image("http://example.com/img.png")
        assert content == b"fake image content"
        assert mime == "image/png"
        assert length == len(b"fake image content")
