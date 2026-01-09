import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options"
import { prisma } from "@/lib/prisma"
import { ChargeService } from "@/lib/charge-service"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { chargeId } = body

    if (!chargeId) {
      return NextResponse.json(
        { error: "ID da cobrança é obrigatório" },
        { status: 400 }
      )
    }

    // Verificar se a cobrança pertence ao usuário
    const charge = await prisma.charge.findUnique({
      where: { id: chargeId },
      select: { userId: true }
    })

    if (!charge || charge.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Cobrança não encontrada" },
        { status: 404 }
      )
    }

    // Usar o serviço compartilhado
    const result = await ChargeService.sendCharge(chargeId)

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error,
          details: result.details 
        },
        { status: 400 } // Ou 500 dependendo do erro, mas 400 é seguro para erros de negócio
      )
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    })

  } catch (error: any) {
    console.error("Erro ao enviar cobrança:", error)
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        message: error.message,
      },
      { status: 500 }
    )
  }
}
