
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Não autorizado" },
                { status: 401 }
            )
        }

        const logs = await prisma.webhookLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 20
        })

        return NextResponse.json(logs)
    } catch (error) {
        console.error("Erro ao buscar logs:", error)
        return NextResponse.json(
            { error: "Erro ao buscar logs" },
            { status: 500 }
        )
    }
}
