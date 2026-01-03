import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateChargeSchema = z.object({
  customerName: z.string().min(2).optional(),
  customerPhone: z.string().min(10).optional(),
  customerEmail: z.string().email().optional().nullable(),
  amount: z.number().min(0.01).optional(),
  description: z.string().min(5).optional(),
  productName: z.string().optional(),
  imageUrl: z.string().url().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  scheduleType: z.enum(['IMMEDIATE', 'SCHEDULED_ONCE', 'MONTHLY_RECURRING']).optional(),
  scheduleDay: z.number().min(1).max(31).optional().nullable(),
  nextSendDate: z.string().datetime().optional().nullable(),
  status: z.enum(['PENDING', 'SCHEDULED', 'SENT', 'PAID', 'FAILED', 'CANCELLED']).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    const charge = await prisma.charge.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!charge) {
      return NextResponse.json(
        { error: "Cobrança não encontrada" },
        { status: 404 }
      )
    }

    return NextResponse.json(charge)
  } catch (error) {
    console.error("Erro ao buscar cobrança:", error)
    return NextResponse.json(
      { error: "Erro ao buscar cobrança" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    const charge = await prisma.charge.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!charge) {
      return NextResponse.json(
        { error: "Cobrança não encontrada" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validatedData = updateChargeSchema.parse(body)

    const updateData: any = {}
    if (validatedData.customerName !== undefined) updateData.customerName = validatedData.customerName
    if (validatedData.customerPhone !== undefined) updateData.customerPhone = validatedData.customerPhone
    if (validatedData.customerEmail !== undefined) updateData.customerEmail = validatedData.customerEmail
    if (validatedData.amount !== undefined) updateData.amount = validatedData.amount
    if (validatedData.description !== undefined) updateData.description = validatedData.description
    if (validatedData.productName !== undefined) updateData.productName = validatedData.productName
    if (validatedData.imageUrl !== undefined) updateData.imageUrl = validatedData.imageUrl
    if (validatedData.dueDate !== undefined) updateData.dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null
    if (validatedData.scheduleType !== undefined) updateData.scheduleType = validatedData.scheduleType
    if (validatedData.scheduleDay !== undefined) updateData.scheduleDay = validatedData.scheduleDay
    if (validatedData.nextSendDate !== undefined) updateData.nextSendDate = validatedData.nextSendDate ? new Date(validatedData.nextSendDate) : null
    if (validatedData.status !== undefined) updateData.status = validatedData.status

    const updatedCharge = await prisma.charge.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(updatedCharge)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Erro ao atualizar cobrança:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar cobrança" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    const charge = await prisma.charge.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!charge) {
      return NextResponse.json(
        { error: "Cobrança não encontrada" },
        { status: 404 }
      )
    }

    await prisma.charge.update({
      where: { id: params.id },
      data: { status: 'CANCELLED' },
    })

    return NextResponse.json({ message: "Cobrança cancelada com sucesso" })
  } catch (error) {
    console.error("Erro ao cancelar cobrança:", error)
    return NextResponse.json(
      { error: "Erro ao cancelar cobrança" },
      { status: 500 }
    )
  }
}

