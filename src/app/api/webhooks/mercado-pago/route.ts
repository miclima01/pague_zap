import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { MercadoPagoService } from "@/lib/mercado-pago-service"

/**
 * Webhook do Mercado Pago para receber notificações de pagamento
 * 
 * O Mercado Pago envia notificações via POST quando o status de um pagamento muda
 * Tipos de notificação: payment, merchant_order, etc.
 * 
 * Documentação: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body

    // O Mercado Pago envia diferentes tipos de notificações
    // Para pagamentos, o tipo geralmente é "payment"
    if (type === 'payment') {
      const paymentId = data.id

      if (!paymentId) {
        return NextResponse.json(
          { error: "Payment ID não fornecido" },
          { status: 400 }
        )
      }

      // Buscar a cobrança pelo external_reference
      // Precisamos buscar o usuário primeiro para obter o token
      // Vamos buscar todas as cobranças pendentes e verificar qual corresponde
      // Na prática, você pode melhorar isso armazenando o preference_id na cobrança

      // Primeiro, vamos buscar o pagamento no Mercado Pago
      // Mas precisamos do access token do usuário...
      // Vamos buscar por external_reference nas cobranças recentes

      // Por enquanto, vamos usar uma abordagem mais simples:
      // Buscar o pagamento e usar o external_reference para encontrar a cobrança
      
      // Nota: Para produção, considere armazenar o preference_id na cobrança
      // ou usar o external_reference de forma mais eficiente

      // Buscar todas as cobranças com status SENT recentemente
      const recentCharges = await prisma.charge.findMany({
        where: {
          status: { in: ['SENT', 'PENDING'] },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Últimas 24 horas
          },
        },
        include: {
          user: true,
        },
        take: 100,
      })

      // Procurar a cobrança correspondente verificando com a API do Mercado Pago
      for (const charge of recentCharges) {
        if (!charge.user.mercadoPagoToken) continue

        const mercadoPago = new MercadoPagoService({
          accessToken: charge.user.mercadoPagoToken,
        })

        const paymentResult = await mercadoPago.getPayment(paymentId.toString())

        if (
          paymentResult.success &&
          paymentResult.payment?.external_reference === charge.id
        ) {
          const payment = paymentResult.payment
          const status = payment.status

          // Mapear status do Mercado Pago para status da cobrança
          let chargeStatus = charge.status
          if (status === 'approved') {
            chargeStatus = 'PAID'
          } else if (status === 'rejected' || status === 'cancelled') {
            chargeStatus = 'FAILED'
          } else if (status === 'refunded') {
            chargeStatus = 'FAILED'
          }
          // pending, in_process mantém o status atual

          // Atualizar cobrança
          await prisma.charge.update({
            where: { id: charge.id },
            data: {
              status: chargeStatus,
              paidAt: status === 'approved' ? new Date() : charge.paidAt,
            },
          })

          // Logar o webhook
          await prisma.apiLog.create({
            data: {
              userId: charge.userId,
              chargeId: charge.id,
              endpoint: '/webhooks/mercado-pago',
              method: 'POST',
              statusCode: 200,
              request: body,
              response: paymentResult.payment,
            },
          })

          return NextResponse.json({ message: "Webhook processado com sucesso" })
        }
      }

      // Se não encontrou a cobrança, retornar 200 mesmo assim (webhook do MP)
      return NextResponse.json({ message: "Webhook recebido" })
    }

    // Para outros tipos de notificação (merchant_order, etc)
    return NextResponse.json({ message: "Tipo de notificação não processado" })
  } catch (error: any) {
    console.error("Erro ao processar webhook Mercado Pago:", error)

    // Sempre retornar 200 para o Mercado Pago não reenviar
    // Mas logar o erro internamente
    return NextResponse.json(
      { error: "Erro ao processar webhook" },
      { status: 200 }
    )
  }
}

/**
 * GET handler para validação do webhook (opcional)
 * Alguns serviços permitem verificar a URL do webhook via GET
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({ message: "Webhook endpoint ativo" })
}

