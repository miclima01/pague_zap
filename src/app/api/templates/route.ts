import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { WhatsAppTemplateService } from "@/lib/whatsapp/template-service"

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { whatsappToken: true, whatsappAppId: true, whatsappBusinessId: true }
        })

        if (!user || !user.whatsappToken || !user.whatsappBusinessId) {
            return new NextResponse("WhatsApp not configured", { status: 400 })
        }

        const appId = user.whatsappAppId || process.env.META_APP_ID
        if (!appId) return new NextResponse("App ID missing", { status: 500 })

        const service = new WhatsAppTemplateService(appId, user.whatsappToken)
        const templates = await service.getTemplates(user.whatsappBusinessId)

        return NextResponse.json(templates)
    } catch (error: any) {
        console.error("List Templates Error:", error)
        return new NextResponse(error.message, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const name = searchParams.get("name")

        if (!name) {
            return new NextResponse("Template name required", { status: 400 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { whatsappToken: true, whatsappAppId: true, whatsappBusinessId: true }
        })

        if (!user || !user.whatsappToken || !user.whatsappBusinessId) {
            return new NextResponse("WhatsApp not configured", { status: 400 })
        }

        const appId = user.whatsappAppId || process.env.META_APP_ID
        if (!appId) return new NextResponse("App ID missing", { status: 500 })

        const service = new WhatsAppTemplateService(appId, user.whatsappToken)
        await service.deleteTemplate(user.whatsappBusinessId, name)

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("Delete Template Error:", error)
        return new NextResponse(error.message, { status: 500 })
    }
}
