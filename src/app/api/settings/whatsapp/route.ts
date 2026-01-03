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
    const { whatsappPhoneNumberId, whatsappToken, whatsappBusinessId } = body

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        whatsappPhoneNumberId: whatsappPhoneNumberId || null,
        whatsappToken: whatsappToken || null,
        whatsappBusinessId: whatsappBusinessId || null,
      },
    })

    return NextResponse.json({ message: "Configurações salvas com sucesso" })
  } catch (error) {
    console.error("Erro ao salvar configurações WhatsApp:", error)
    return NextResponse.json(
      { error: "Erro ao salvar configurações" },
      { status: 500 }
    )
  }
}

