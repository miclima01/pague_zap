import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Webhook para receber atualizações de status de pagamento dos gateways
 * TODO: Implementar validação de assinatura do webhook na fase 2
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // TODO: Validar assinatura do webhook (fase 2)
    // TODO: Processar diferentes tipos de eventos (pago, reembolsado, etc)

    const { chargeId, status, gatewayChargeId } = body

    if (!chargeId || !status) {
      return NextResponse.json(
        { error: "Dados inválidos" },
        { status: 400 }
      )
    }

    const charge = await prisma.charge.findUnique({
      where: { id: chargeId },
    })

    if (!charge) {
      return NextResponse.json(
        { error: "Cobrança não encontrada" },
        { status: 404 }
      )
    }

    // Atualizar status da cobrança
    const updateData: any = {
      status: status.toUpperCase(),
    }

    if (status === 'PAID') {
      updateData.paidAt = new Date()
    }

    if (gatewayChargeId) {
      updateData.gatewayChargeId = gatewayChargeId
    }

    await prisma.charge.update({
      where: { id: chargeId },
      data: updateData,
    })

    return NextResponse.json({ message: "Webhook processado com sucesso" })
  } catch (error) {
    console.error("Erro ao processar webhook:", error)
    return NextResponse.json(
      { error: "Erro ao processar webhook" },
      { status: 500 }
    )
  }
}

