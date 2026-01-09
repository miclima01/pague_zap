import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ChargeService } from "@/lib/charge-service"

export const dynamic = 'force-dynamic' // Garantir que não seja cacheado

export async function GET(request: NextRequest) {
  try {
    // Validar autorização
    const authHeader = request.headers.get('authorization')
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    
    // Em produção, configure CRON_SECRET no .env
    const validSecret = process.env.CRON_SECRET || 'paguezap_cron_secret'
    
    if (authHeader !== `Bearer ${validSecret}` && key !== validSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Buscar cobranças agendadas vencidas
    const now = new Date()
    
    const pendingCharges = await prisma.charge.findMany({
      where: {
        status: 'SCHEDULED',
        nextSendDate: {
          lte: now
        }
      },
      take: 50 // Processar em lotes para evitar timeout em Serverless
    })

    if (pendingCharges.length === 0) {
      return NextResponse.json({ message: 'Nenhuma cobrança pendente para envio' })
    }

    const results = []

    // Processar cada cobrança
    for (const charge of pendingCharges) {
      try {
        console.log(`Processando cobrança ${charge.id}...`)
        const result = await ChargeService.sendCharge(charge.id)
        results.push({
          id: charge.id,
          success: result.success,
          error: result.error
        })
      } catch (error) {
        console.error(`Erro ao processar cobrança ${charge.id}:`, error)
        results.push({
          id: charge.id,
          success: false,
          error: String(error)
        })
      }
    }

    return NextResponse.json({
      message: `Processadas ${results.length} cobranças`,
      results
    })

  } catch (error) {
    console.error('Erro na cron job:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
