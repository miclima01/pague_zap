import { NextRequest, NextResponse } from "next/server"
import { MercadoPagoService } from "@/lib/mercado-pago-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accessToken } = body

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "Access Token é obrigatório" },
        { status: 400 }
      )
    }

    const mercadoPago = new MercadoPagoService({
      accessToken,
    })

    const result = await mercadoPago.testConnection()

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Erro ao testar conexão Mercado Pago:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro ao testar conexão",
      },
      { status: 500 }
    )
  }
}

