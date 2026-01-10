
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

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
                whatsappBusinessId: true, // This is the WABA ID usually, or App ID? 
                // Schema says: whatsappBusinessId string?
                // Schema also says: whatsappAppSecret string?

                // IMPORTANT: The backend needs APP_ID and TOKEN.
                // Usually App ID is constant for the platform (PagueZap), but Token is per user?
                // OR does each user bring their own App? 
                // Prompt says "SaaS... token por workspace/tenant". 
                // Let's assume PagueZap has ONE App ID, and users have System User Tokens? 
                // OR Users have their own Apps?

                // "Se cada cliente conecta o próprio WABA: você provavelmente vai precisar de token por workspace"
                // "Sugestão prática: mantenha META_GRAPH_VERSION e META_APP_ID globais, mas token por tenant."

                // So I should inject the Token from DB. App ID might be global env var of the Next.js app.
            }
        })

        if (!user || !user.whatsappToken) {
            return new NextResponse("WhatsApp not configured for this user", { status: 400 })
        }

        const formData = await req.formData()

        // 2. Prepare Request to Python Backend
        // We forward the form data. 
        // We inject the token into a Header.

        // Determine backend URL
        let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

        if (!backendUrl) {
            if (process.env.VERCEL_URL) {
                backendUrl = `https://${process.env.VERCEL_URL}`;
            } else {
                backendUrl = "http://localhost:8000";
            }
        }
        const pythonEndpoint = `${backendUrl}/api/templates/whatsapp`

        const headers = new Headers()
        headers.set("X-Meta-Token", user.whatsappToken)

        // If user has specific App ID (unlikely for BSP but possible), we could use user.whatsappAppId if it existed.
        // For now, let's assume global App ID or it won't be set and Backend will error if not in its own env.

        // Forward Cookies and other headers to bypass Vercel Auth in Proxy requests
        const incomingHeaders = new Headers(req.headers);
        // We carefully select what to forward. 'cookie' is crucial for Vercel Auth.
        if (incomingHeaders.get("cookie")) {
            headers.set("cookie", incomingHeaders.get("cookie")!);
        }
        // Also forward user-agent for good measure
        if (incomingHeaders.get("user-agent")) {
            headers.set("user-agent", incomingHeaders.get("user-agent")!);
        }

        const validResponse = await fetch(pythonEndpoint, {
            method: "POST",
            body: formData,
            headers: headers,
        })

        const textBody = await validResponse.text();
        console.log("Python Backend Response Status:", validResponse.status);
        console.log("Python Backend Response Body:", textBody);

        let data;
        try {
            data = JSON.parse(textBody);
        } catch (e) {
            console.error("Failed to parse JSON from backend:", textBody);
            return NextResponse.json(
                { status: "error", meta_error: { message: `Backend returned non-JSON: ${textBody.substring(0, 200)}`, type: "ProxyError" } },
                { status: validResponse.status || 500 }
            );
        }

        return NextResponse.json(data, { status: validResponse.status })

    } catch (error: any) {
        console.error("Proxy Error:", error)
        return new NextResponse(error.message || "Internal Server Error", { status: 500 })
    }
}
