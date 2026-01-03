import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createChargeSchema = z.object({
  customerName: z.string().min(2),
  customerPhone: z.string().min(10),
  customerEmail: z.string().email().optional().nullable(),
  amount: z.number().min(0.01),
  description: z.string().min(5),
  productName: z.string().optional(),
  imageUrl: z.string().url().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  scheduleType: z.enum(['IMMEDIATE', 'SCHEDULED_ONCE', 'MONTHLY_RECURRING']),
  scheduleDay: z.number().min(1).max(31).optional().nullable(),
  scheduledDate: z.string().datetime().optional().nullable(),
  nextSendDate: z.string().datetime().optional().nullable(),
  gateway: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status")
    const search = searchParams.get("search")

    const where: any = {
      userId: session.user.id,
    }

    if (status && status !== "all") {
      where.status = status
    }

    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search } },
        { customerEmail: { contains: search, mode: "insensitive" } },
      ]
    }

    const charges = await prisma.charge.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json(charges)
  } catch (error) {
    console.error("Erro ao buscar cobranças:", error)
    return NextResponse.json(
      { error: "Erro ao buscar cobranças" },
      { status: 500 }
    )
  }
}

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
    const validatedData = createChargeSchema.parse(body)

    // Determinar status inicial
    let status = 'PENDING'
    if (validatedData.scheduleType === 'IMMEDIATE') {
      status = 'PENDING'
    } else if (validatedData.scheduleType === 'SCHEDULED_ONCE' || validatedData.scheduleType === 'MONTHLY_RECURRING') {
      status = 'SCHEDULED'
    }

    const charge = await prisma.charge.create({
      data: {
        userId: session.user.id,
        customerName: validatedData.customerName,
        customerPhone: validatedData.customerPhone,
        customerEmail: validatedData.customerEmail || null,
        amount: validatedData.amount,
        description: validatedData.description,
        productName: validatedData.productName || validatedData.description,
        imageUrl: validatedData.imageUrl || null,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        scheduleType: validatedData.scheduleType,
        scheduleDay: validatedData.scheduleDay || null,
        nextSendDate: validatedData.nextSendDate ? new Date(validatedData.nextSendDate) : null,
        status: status as any,
      },
    })

    // Se for imediato, tentar enviar (placeholder)
    if (validatedData.scheduleType === 'IMMEDIATE') {
      // TODO: Implementar envio imediato via WhatsApp
    }

    return NextResponse.json(charge, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Erro ao criar cobrança:", error)
    return NextResponse.json(
      { error: "Erro ao criar cobrança" },
      { status: 500 }
    )
  }
}

