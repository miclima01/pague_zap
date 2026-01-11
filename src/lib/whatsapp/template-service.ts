
import { Readable } from 'stream';

export class WhatsAppTemplateService {
    private baseUrl: string;

    constructor(private appId: string, private token: string) {
        // Meta Graph Version hardcoded or from env, matching python service
        const version = process.env.META_GRAPH_VERSION || "v21.0";
        this.baseUrl = `https://graph.facebook.com/${version}`;
    }

    private get headers() {
        return {
            "Authorization": `Bearer ${this.token}`,
            "Content-Type": "application/json"
        };
    }

    async downloadImage(url: string): Promise<{ buffer: Buffer, contentType: string, contentLength: number }> {
        console.log(`Downloading image from URL: ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download image: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = response.headers.get("content-type") || "image/jpeg";
        const contentLength = buffer.length;

        if (contentLength > 5 * 1024 * 1024) {
            throw new Error("Image size exceeds 5MB");
        }

        return { buffer, contentType, contentLength };
    }

    async createUploadSession(fileLength: number, fileType: string, fileName: string = "header_image"): Promise<string> {
        const url = `${this.baseUrl}/${this.appId}/uploads`;
        const params = new URLSearchParams({
            file_length: fileLength.toString(),
            file_type: fileType,
            file_name: fileName,
            access_token: this.token
        });

        console.log(`Creating upload session for ${fileName} (${fileLength} bytes)`);

        const response = await fetch(`${url}?${params}`, {
            method: "POST",
            headers: this.headers
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`Upload session failed: ${text}`);
            throw new Error(`Failed to create upload session: ${text}`);
        }

        const data = await response.json();
        const uploadId = data.id; // Returns "upload:..."
        if (!uploadId) {
            throw new Error("No upload ID returned from Graph API");
        }

        return uploadId;
    }

    async uploadFileGetHandle(uploadSessionId: string, fileBuffer: Buffer, mimeType: string, fileName: string): Promise<string> {
        // ID typically like "upload:123". API expects POST /{upload_session_id}
        const url = `${this.baseUrl}/${uploadSessionId}`;

        console.log(`Uploading bytes to session ${uploadSessionId} (${mimeType}, ${fileName})`);

        console.log(`Uploading bytes to session ${uploadSessionId} (${mimeType}, ${fileName})`);

        // RAW BINARY UPLOAD (No Multipart/FormData)
        // This is the most "pure" way to send bytes for a resumable upload chunk.

        console.log(`Session Upload - Payload Size: ${fileBuffer.length}`);

        const headers: Record<string, string> = {
            "Authorization": `Bearer ${this.token}`,
            "file_offset": "0",
            "Content-Type": mimeType // Explicitly tell Meta this is the image
        };

        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: new Uint8Array(fileBuffer) // Send raw buffer as Uint8Array for type compatibility
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`File upload failed: ${text}`);
            throw new Error(`Failed to upload file content: ${text}`);
        }

        const data = await response.json();
        console.log(`Upload step2 response: ${JSON.stringify(data)}`);

        const handle = data.h;
        if (!handle) {
            throw new Error(`No asset handle returned. Response: ${JSON.stringify(data)}`);
        }
        console.log(`Header handle (h): ${handle}`);

        return handle;
    }

    async createMessageTemplate(wabaId: string, payload: any): Promise<any> {
        const url = `${this.baseUrl}/${wabaId}/message_templates`;

        console.log(`Creating template ${payload.name} for WABA ${wabaId}`);
        console.log(`Full Template Payload: ${JSON.stringify(payload, null, 2)}`);

        const response = await fetch(url, {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify(payload)
        });

        const fbTraceId = response.headers.get("x-fb-trace-id") || "unknown";
        console.log(`Graph API Response Status: ${response.status}, Trace ID: ${fbTraceId}`);

        if (!response.ok) {
            const errorBody = await response.json();
            return {
                status: "error",
                meta_error: errorBody,
                meta_trace_id: fbTraceId,
                http_code: response.status
            };
        }

        return {
            status: "success",
            data: await response.json(),
            meta_trace_id: fbTraceId
        };
    }

    async getMessageTemplate(wabaId: string, templateName: string): Promise<any> {
        const url = `${this.baseUrl}/${wabaId}/message_templates?name=${templateName}`;
        const response = await fetch(url, { headers: this.headers });
        if (!response.ok) return null;
        const data = await response.json();
        return data.data?.[0] || null;
    }
}
