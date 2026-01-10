# WhatsApp Template Backend Service

This service handles the creation of WhatsApp Message Templates with Image Headers and buttons, including the "Order Details" button.

## Setup

1.  **Install Python:** Ensure Python 3.9+ is installed.
2.  **Create Virtual Environment (Optional but recommended):**
    ```bash
    python -m venv venv
    .\venv\Scripts\Activate.ps1
    ```
3.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
4.  **Environment Variables:**
    Set the following in your environment or a `.env` file (if you add python-dotenv):
    *   `META_TOKEN`: Your Meta System User Access Token.
    *   `META_APP_ID`: Your Meta App ID.
    *   `META_GRAPH_VERSION`: (Optional) e.g., `v21.0` (Default).

## Running the Server

```bash
uvicorn main:app --reload
```
The server will start at `http://localhost:8000`.

## Testing with cURL

Here is an example to create a template with an image from a URL and the Order Details button.

```bash
curl -X POST "http://localhost:8000/api/templates/whatsapp" \
     -H "Content-Type: multipart/form-data" \
     -F "waba_id=YOUR_WABA_ID" \
     -F "name=order_details_test_v1" \
     -F "language=pt_BR" \
     -F "category=UTILITY" \
     -F "body_text=Olá {{1}}, segue seu pedido." \
     -F "body_examples=[[\"Michael\"]]" \
     -F "header_image_url=https://via.placeholder.com/600x400.png" \
     -F "use_order_details=true"
```

## Running Tests

```bash
pytest tests
```

## Features

*   **Resumable Uploads**: Automatically handles the 2-step graph API upload flow for headers.
*   **Order Details**: Correctly formats the `ORDER_DETAILS` button with `Review and Pay`.
*   **Validation**: Enforces template naming conventions and image sizes.
