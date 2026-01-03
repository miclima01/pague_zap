import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options"
import { prisma } from "@/lib/prisma"
import { WhatsAppService } from "@/lib/whatsapp-service"
import { PixService } from "@/lib/pix-service"
import { MercadoPagoService } from "@/lib/mercado-pago-service"

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

    // Buscar cobrança e configurações do usuário
    const charge = await prisma.charge.findUnique({
      where: { id: chargeId },
      include: { user: true },
    })

    if (!charge || charge.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Cobrança não encontrada" },
        { status: 404 }
      )
    }

    const user = charge.user

    // Validar configurações
    if (!user.whatsappPhoneNumberId || !user.whatsappToken) {
      return NextResponse.json(
        { error: "WhatsApp não configurado. Vá para Configurações." },
        { status: 400 }
      )
    }

    if (!user.pixKey || !user.merchantName) {
      return NextResponse.json(
        { error: "PIX não configurado. Vá para Configurações." },
        { status: 400 }
      )
    }

    if (charge.status === "PAID") {
      return NextResponse.json(
        { error: "Cobrança já foi paga" },
        { status: 400 }
      )
    }

    if (charge.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cobrança foi cancelada" },
        { status: 400 }
      )
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
    let mercadoPagoPreferenceId: string | undefined
    
    if (user.mercadoPagoToken) {
      const mercadoPago = new MercadoPagoService({
        accessToken: user.mercadoPagoToken,
      })

      // Criar preferência de pagamento
      const notificationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/webhooks/mercado-pago`
      
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
        mercadoPagoPreferenceId = preferenceResult.preferenceId
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

      // Atualizar status
      await prisma.charge.update({
        where: { id: chargeId },
        data: { status: "FAILED" },
      })

      return NextResponse.json(
        {
          error: "Falha ao enviar mensagem",
          details: result.error,
        },
        { status: 500 }
      )
    }

    // Atualizar cobrança
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

    // Logar sucesso
    await prisma.apiLog.create({
      data: {
        userId: user.id,
        chargeId: charge.id,
        endpoint: "/messages",
        method: "POST",
        statusCode: 200,
        response: result.data,
      },
    })

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

