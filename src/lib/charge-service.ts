import { prisma } from "@/lib/prisma"
import { WhatsAppService } from "@/lib/whatsapp-service"
import { PixService } from "@/lib/pix-service"
import { MercadoPagoService } from "@/lib/mercado-pago-service"

export interface SendChargeResult {
  success: boolean
  error?: string
  details?: any
  messageId?: string
}

export class ChargeService {
  static async sendCharge(chargeId: string): Promise<SendChargeResult> {
    try {
      // Buscar cobrança e configurações do usuário
      const charge = await prisma.charge.findUnique({
        where: { id: chargeId },
        include: { user: true },
      })

      if (!charge) {
        return { success: false, error: "Cobrança não encontrada" }
      }

      const user = charge.user

      // Validar configurações
      if (!user.whatsappPhoneNumberId || !user.whatsappToken) {
        return { success: false, error: "WhatsApp não configurado para este usuário" }
      }

      if (!user.pixKey || !user.merchantName) {
        return { success: false, error: "PIX não configurado para este usuário" }
      }

      if (charge.status === "PAID") {
        return { success: false, error: "Cobrança já foi paga" }
      }

      if (charge.status === "CANCELLED") {
        return { success: false, error: "Cobrança foi cancelada" }
      }

      // Gerar PIX
      const pixReferenceId = PixService.generateReferenceId()
      const pixQrCode = PixService.generatePixQrCode({
        pixKey: user.pixKey,
        merchantName: user.merchantName,
        amount: charge.amount,
        referenceId: pixReferenceId,
      })

      // Criar link Mercado Pago (se configurado)
      let mercadoPagoLink: string | undefined

      if (user.mercadoPagoToken) {
        const mercadoPago = new MercadoPagoService({
          accessToken: user.mercadoPagoToken,
        })

        // Criar preferência de pagamento
        const notificationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/webhooks/mercado-pago?userId=${user.id}`

        const preferenceResult = await mercadoPago.createPreference({
          title: charge.productName || charge.description,
          description: charge.description,
          amount: charge.amount,
          externalReference: charge.id,
          payerEmail: charge.customerEmail || undefined,
          payerName: charge.customerName,
          notificationUrl,
        })

        if (preferenceResult.success && preferenceResult.paymentLink) {
          mercadoPagoLink = preferenceResult.paymentLink
        } else {
          // Logar erro, mas continuar com PIX
          await prisma.apiLog.create({
            data: {
              userId: user.id,
              chargeId: charge.id,
              endpoint: '/checkout/preferences',
              method: 'POST',
              error: JSON.stringify(preferenceResult.error),
            },
          })
        }
      }

      // Enviar via WhatsApp
      const whatsapp = new WhatsAppService({
        phoneNumberId: user.whatsappPhoneNumberId,
        accessToken: user.whatsappToken,
      })

      const result = await whatsapp.sendPaymentMessage({
        to: charge.customerPhone,
        customerName: charge.customerName,
        productName: charge.productName || charge.description,
        amount: charge.amount,
        imageUrl: charge.imageUrl || user.defaultImageUrl || "",
        pixReferenceId,
        pixQrCode,
        pixKey: user.pixKey,
        pixKeyType: user.pixKeyType || "EVP",
        merchantName: user.merchantName,
        mercadoPagoLink,
      })

      if (!result.success) {
        // Logar erro
        await prisma.apiLog.create({
          data: {
            userId: user.id,
            chargeId: charge.id,
            endpoint: "/messages",
            method: "POST",
            error: JSON.stringify(result.error),
          },
        })

        // Atualizar status para FAILED se não for envio manual
        // Nota: Decidimos atualizar para FAILED para ter visibilidade
        await prisma.charge.update({
          where: { id: chargeId },
          data: { status: "FAILED" },
        })

        return {
          success: false,
          error: "Falha ao enviar mensagem",
          details: result.error
        }
      }

      // Atualizar cobrança com sucesso
      await prisma.charge.update({
        where: { id: chargeId },
        data: {
          status: "SENT",
          sentAt: new Date(),
          pixReferenceId,
          pixQrCode,
          mercadoPagoLink,
          whatsappMessageId: result.messageId,
        },
      })

      // Verificar recorrência e criar próxima cobrança se necessário
      if (charge.scheduleType === 'MONTHLY_RECURRING' && charge.scheduleDay) {
        try {
          const now = new Date()
          const currentMonth = now.getMonth()
          const currentYear = now.getFullYear()

          // Calcular data para o próximo mês
          const targetDay = charge.scheduleDay
          // Pegar último dia do próximo mês
          const daysInNextMonth = new Date(currentYear, currentMonth + 2, 0).getDate()
          const actualDay = Math.min(targetDay, daysInNextMonth)

          const nextDate = new Date(currentYear, currentMonth + 1, actualDay)

          // Calcular novo vencimento (se houver)
          let nextDueDate = null
          if (charge.dueDate) {
            const currentDueDate = new Date(charge.dueDate)
            nextDueDate = new Date(currentDueDate)
            nextDueDate.setMonth(nextDueDate.getMonth() + 1)
          }

          // Criar a nova cobrança
          await prisma.charge.create({
            data: {
              userId: user.id,
              customerName: charge.customerName,
              customerPhone: charge.customerPhone,
              customerEmail: charge.customerEmail,
              amount: charge.amount,
              description: charge.description,
              productName: charge.productName,
              imageUrl: charge.imageUrl,

              // Data de envio agendada
              nextSendDate: nextDate,
              dueDate: nextDueDate,

              scheduleType: 'MONTHLY_RECURRING',
              scheduleDay: charge.scheduleDay,
              status: 'SCHEDULED',
            }
          })

          // Logar criação da recorrência
          await prisma.apiLog.create({
            data: {
              userId: user.id,
              endpoint: "SYSTEM/recurrence",
              method: "CREATE",
              statusCode: 201,
              response: JSON.stringify({ message: "Recorrência criada", date: nextDate }),
            },
          })
        } catch (recurrenceError) {
          console.error("Erro ao criar recorrência:", recurrenceError)
          // Não falhar o envio principal se a recorrência falhar, mas logar erro
          await prisma.apiLog.create({
            data: {
              userId: user.id,
              chargeId: charge.id,
              endpoint: "SYSTEM/recurrence",
              method: "CREATE",
              error: String(recurrenceError),
            },
          })
        }
      }

      // Logar sucesso
      await prisma.apiLog.create({
        data: {
          userId: user.id,
          chargeId: charge.id,
          endpoint: "/messages",
          method: "POST",
          statusCode: 200,
          response: JSON.stringify(result.data),
        },
      })

      return {
        success: true,
        messageId: result.messageId
      }

    } catch (error: any) {
      console.error("Erro no serviço de cobrança:", error)
      return {
        success: false,
        error: error.message || "Erro interno ao processar cobrança"
      }
    }
  }
}
