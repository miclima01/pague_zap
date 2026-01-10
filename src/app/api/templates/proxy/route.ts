import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { WhatsAppTemplateService } from "@/lib/whatsapp/template-service"

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || !session.user || !session.user.email) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        // 1. Get User Credentials from DB
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: {
                whatsappToken: true,
                whatsappBusinessId: true,
                // We use global App ID (env) + User Token (DB)
            }
        })

        if (!user || !user.whatsappToken) {
            return new NextResponse("WhatsApp not configured for this user. Missing Token.", { status: 400 })
        }

        // Initialize Service
        // Use Global App ID (env) + User Token (DB)
        const globalAppId = process.env.META_APP_ID
        if (!globalAppId) {
            return new NextResponse("Server misconfiguration: META_APP_ID missing", { status: 500 })
        }

        const service = new WhatsAppTemplateService(globalAppId, user.whatsappToken);

        const formData = await req.formData()

        // Extract Fields
        const wabaId = formData.get("waba_id") as string;
        const name = formData.get("name") as string;
        const language = formData.get("language") as string;
        const category = (formData.get("category") as string) || "UTILITY";
        const bodyTextRaw = formData.get("body_text") as string;
        const bodyExamplesRaw = formData.get("body_examples") as string;
        const useOrderDetails = formData.get("use_order_details") === "true";
        const headerImageUrl = formData.get("header_image_url") as string | null;
        const headerImageFile = formData.get("header_image_file") as File | null;

        // Validation
        if (!wabaId || !name || !language || !bodyTextRaw || !bodyExamplesRaw) {
            return new NextResponse("Missing required fields", { status: 400 })
        }

        let examplesList;
        try {
            examplesList = JSON.parse(bodyExamplesRaw);
        } catch (e) {
            return new NextResponse("Invalid JSON for body_examples", { status: 400 })
        }

        // 1. Handle Image Source
        let fileBuffer: Buffer;
        let fileLength: number;
        let mimeType: string = "image/jpeg";
        let fileName: string = "header_image.jpg";

        if (headerImageFile && headerImageFile.size > 0) {
            const arrayBuffer = await headerImageFile.arrayBuffer();
            fileBuffer = Buffer.from(arrayBuffer);
            fileLength = fileBuffer.length;
            mimeType = headerImageFile.type || "image/jpeg";
            fileName = headerImageFile.name || fileName;

            if (fileLength > 5 * 1024 * 1024) {
                return new NextResponse("Image exceeds 5MB limit.", { status: 400 })
            }
        } else if (headerImageUrl) {
            const result = await service.downloadImage(headerImageUrl);
            fileBuffer = result.buffer;
            mimeType = result.contentType;
            fileLength = result.contentLength;
        } else {
            return new NextResponse("Must provide either header_image_file or header_image_url", { status: 400 })
        }

        // 2. Start Resumable Upload Flow
        // Step 1: Create Session
        const uploadId = await service.createUploadSession(fileLength, mimeType, fileName);

        // Step 2: Upload File
        const headerHandle = await service.uploadFileGetHandle(uploadId, fileBuffer);

        // 3. Construct Template Payload
        // Enforce UTILITY if Order Details
        const finalCategory = useOrderDetails ? "UTILITY" : category;

        const components: any[] = [];

        // HEADER
        components.push({
            "type": "HEADER",
            "format": "IMAGE",
            "example": { "header_handle": [headerHandle] }
        });

        // BODY
        components.push({
            "type": "BODY",
            "text": bodyTextRaw,
            "example": { "body_text": examplesList }
        });

        // BUTTONS
        if (useOrderDetails) {
            components.push({
                "type": "BUTTONS",
                "buttons": [
                    {
                        "type": "ORDER_DETAILS",
                        "text": "Review and Pay"
                    }
                ]
            });
        }

        const payload = {
            name: name,
            language: language,
            category: finalCategory,
            components: components
        };

        // 4. Create Template
        const result = await service.createMessageTemplate(wabaId, payload);

        // Return result directly
        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Handler Error:", error)
        return new NextResponse(error.message || "Internal Server Error", { status: 500 })
    }
}
