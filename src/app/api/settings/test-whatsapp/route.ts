import { NextRequest, NextResponse } from "next/server"
import { WhatsAppService } from "@/lib/whatsapp-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumberId, accessToken } = body

    if (!phoneNumberId || !accessToken) {
      return NextResponse.json(
        { success: false, error: "Phone Number ID e Access Token são obrigatórios" },
        { status: 400 }
      )
    }

    const whatsapp = new WhatsAppService({
      phoneNumberId,
      accessToken,
    })

    const result = await whatsapp.testConnection()

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Erro ao testar conexão WhatsApp:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro ao testar conexão",
      },
      { status: 500 }
    )
  }
}

