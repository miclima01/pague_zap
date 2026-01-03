import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options"
import { prisma } from "@/lib/prisma"

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { type, merchantName, pixKey, pixKeyType, mercadoPagoToken, mercadoPagoPublicKey } = body

    const updateData: any = {}

    if (type === 'pix') {
      updateData.merchantName = merchantName || null
      updateData.pixKey = pixKey || null
      updateData.pixKeyType = pixKeyType || null
    } else if (type === 'mercado_pago') {
      updateData.mercadoPagoToken = mercadoPagoToken || null
      updateData.mercadoPagoPublicKey = mercadoPagoPublicKey || null
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
    })

    return NextResponse.json({ message: "Configurações salvas com sucesso" })
  } catch (error) {
    console.error("Erro ao salvar configurações de pagamento:", error)
    return NextResponse.json(
      { error: "Erro ao salvar configurações" },
      { status: 500 }
    )
  }
}

