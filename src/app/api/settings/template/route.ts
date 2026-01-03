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
    const { defaultImageUrl, templateName, templateLanguage } = body

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        defaultImageUrl: defaultImageUrl || null,
        templateName: templateName || 'paymentswa',
        templateLanguage: templateLanguage || 'pt_BR',
      },
    })

    return NextResponse.json({ message: "Configurações salvas com sucesso" })
  } catch (error) {
    console.error("Erro ao salvar configurações de template:", error)
    return NextResponse.json(
      { error: "Erro ao salvar configurações" },
      { status: 500 }
    )
  }
}

