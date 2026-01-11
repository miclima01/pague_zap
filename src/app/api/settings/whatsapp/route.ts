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
    const { whatsappPhoneNumberId, whatsappToken, whatsappBusinessId, whatsappAppId, whatsappAppSecret, whatsappVerifyToken } = body

    console.log("Settings Update Request - User:", session.user.id);
    console.log("Payload:", { whatsappBusinessId, whatsappToken: whatsappToken ? "***" : "null" });


    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        whatsappPhoneNumberId: whatsappPhoneNumberId || null,
        whatsappToken: whatsappToken || null,
        whatsappBusinessId: whatsappBusinessId || null,
        whatsappAppId: whatsappAppId || null, // Added whatsappAppId
        whatsappAppSecret: whatsappAppSecret || null,
        whatsappVerifyToken: whatsappVerifyToken || null,
      },
    })

    return NextResponse.json({ message: "Configurações salvas com sucesso", user })
  } catch (error) {
    console.error("Erro ao salvar configurações WhatsApp:", error)
    return NextResponse.json(
      { error: "Erro ao salvar configurações" },
      { status: 500 }
    )
  }
}

