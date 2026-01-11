import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { WhatsAppTemplateService } from "@/lib/whatsapp/template-service"
import sharp from "sharp";


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
                whatsappAppId: true,
                // We use global App ID (env) + User Token (DB)
            }
        })

        if (!user || !user.whatsappToken) {
            return new NextResponse("WhatsApp not configured for this user. Missing Token.", { status: 400 })
        }

        // Initialize Service
        // Use User App ID (DB) if available, otherwise Global (Env)
        const appId = user.whatsappAppId || process.env.META_APP_ID

        if (!appId) {
            return NextResponse.json({ detail: "App ID not configured. Please set it in Settings > WhatsApp or Env Vars." }, { status: 500 })
        }

        const service = new WhatsAppTemplateService(appId, user.whatsappToken);

        const formData = await req.formData()

        // Extract Fields
        const wabaId = formData.get("waba_id") as string;
        const name = formData.get("name") as string;
        const language = formData.get("language") as string;
        const category = (formData.get("category") as string) || "UTILITY";
        const bodyTextRaw = formData.get("body_text") as string;
        const bodyExamplesRaw = formData.get("body_examples") as string;
        // const useOrderDetails = formData.get("use_order_details") === "true"; // Deprecated, forced true for now or based on category
        const useOrderDetails = true;
        const headerImageFile = formData.get("header_image_file") as File | null;

        // Validation
        if (!wabaId || !name || !language || !bodyTextRaw || !bodyExamplesRaw) {
            return new NextResponse("Missing required fields", { status: 400 })
        }

        let examplesList;
        try {
            examplesList = JSON.parse(bodyExamplesRaw);
        } catch (e) {
            // Keep as string if not JSON, some templates might just take raw string?
            // Actually Meta needs examples object structure.
            return new NextResponse("Invalid JSON for body_examples", { status: 400 })
        }

        // 1. Handle Image Source
        let fileBuffer: Buffer;
        let fileLength: number;
        let mimeType: string = "image/png"; // Normalized to PNG
        let fileName: string = "header.png"; // Normalized name

        if (headerImageFile && headerImageFile.size > 0) {
            try {
                const arrayBuffer = await headerImageFile.arrayBuffer();
                const inputBuffer = Buffer.from(arrayBuffer);

                // NORMALIZE IMAGE:
                // 1. Resize to max 1600px width
                // 2. Force PNG format (standardizes uploads)
                // 3. Ensure RGB/RGBA (removes CMYK/16-bit issues)
                fileBuffer = await sharp(inputBuffer)
                    .resize({ width: 1600, withoutEnlargement: true })
                    .toFormat("png")
                    .ensureAlpha()
                    .toBuffer();

                fileLength = fileBuffer.length;
                console.log(`Image normalized! Original: ${headerImageFile.size}, New: ${fileLength}`);

                if (fileLength > 5 * 1024 * 1024) {
                    return new NextResponse("Image exceeds 5MB limit after processing.", { status: 400 })
                }
            } catch (err: any) {
                console.error("Image processing failed:", err);
                return new NextResponse(`Failed to process image: ${err.message}`, { status: 400 });
            }
        } else {
            return new NextResponse("Header image file is required.", { status: 400 })
        }

        // 2. Start Resumable Upload Flow
        // Step 1: Create Session
        const uploadId = await service.createUploadSession(fileLength, mimeType, fileName);

        // Step 2: Upload File
        const headerHandle = await service.uploadFileGetHandle(uploadId, fileBuffer, mimeType, fileName);

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
                        "text": "Copy Pix code"
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

        // VERIFICATION LOG: Fetch back the template to see what was saved
        try {
            const savedTemplate = await service.getMessageTemplate(wabaId, name);
            console.log(`VERIFICATION: Saved Template Components: ${JSON.stringify(savedTemplate?.components, null, 2)}`);
        } catch (verErr) {
            console.error("Verification fetch failed:", verErr);
        }

        // Return result directly
        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Handler Error:", error)
        return new NextResponse(error.message || "Internal Server Error", { status: 500 })
    }
}
