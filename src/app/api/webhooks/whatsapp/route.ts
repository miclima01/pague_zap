import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Token de verificação para o webhook (definido no painel do Facebook)
// Em produção, deve estar em variáveis de ambiente
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "pague_zap_verify_token"

/**
 * GET request para verificar o webhook (Challenge)
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)

    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('Webhook verificado com sucesso!')
            return new NextResponse(challenge, { status: 200 })
        } else {
            return new NextResponse('Forbidden', { status: 403 })
        }
    }

    return new NextResponse('Bad Request', { status: 400 })
}

/**
 * POST request para receber notificações
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Verificar se é uma notificação do WhatsApp
        if (body.object === 'whatsapp_business_account') {

            for (const entry of body.entry) {
                for (const change of entry.changes) {
                    if (change.value && change.value.messages) {
                        const phoneNumberId = change.value.metadata.phone_number_id

                        // Buscar o usuário dono deste número
                        const user = await prisma.user.findFirst({
                            where: { whatsappPhoneNumberId: phoneNumberId }
                        })

                        if (!user) {
                            console.log(`Recebida mensagem para número não configurado: ${phoneNumberId}`)
                            continue
                        }

                        // Processar mensagens
                        for (const message of change.value.messages) {
                            await processMessage(user.id, message, change.value.contacts)
                        }
                    }
                }
            }

            return NextResponse.json({ success: true }, { status: 200 })
        }

        return NextResponse.json({ success: false, message: 'Not a WhatsApp event' }, { status: 404 })
    } catch (error) {
        console.error('Erro ao processar webhook WhatsApp:', error)
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
    }
}

async function processMessage(userId: string, message: any, contacts: any[]) {
    // Extrair dados do contato
    const from = message.from
    const contactInfo = contacts.find((c: any) => c.wa_id === from)
    const contactName = contactInfo?.profile?.name || from

    // Buscar ou criar contato
    let contact = await prisma.contact.findUnique({
        where: {
            userId_phone: {
                userId,
                phone: from
            }
        }
    })

    if (!contact) {
        contact = await prisma.contact.create({
            data: {
                userId,
                phone: from,
                name: contactName,
            }
        })
    } else if (contactName && contactName !== from && !contact.name) {
        // Atualizar nome se disponível e ainda não salvo
        await prisma.contact.update({
            where: { id: contact.id },
            data: { name: contactName }
        })
    }

    // Tratar conteúdo da mensagem
    let content = ''
    let type = message.type

    if (type === 'text') {
        content = message.text.body
    } else if (type === 'image') {
        content = '[Imagem]' // Simplificação por enquanto
    } else if (type === 'button') {
        content = message.button.text
        type = 'text' // Tratar resposta de botão como texto
    } else {
        content = `[${type}]`
    }

    // Verificar se mensagem já existe (deduamploação via whatsappId)
    const existingMessage = await prisma.message.findUnique({
        where: { whatsappId: message.id }
    })

    if (existingMessage) return

    // Salvar mensagem
    await prisma.message.create({
        data: {
            contactId: contact.id,
            content,
            type,
            direction: 'INBOUND',
            status: 'DELIVERED',
            whatsappId: message.id,
            createdAt: new Date(parseInt(message.timestamp) * 1000)
        }
    })

    // Atualizar última mensagem do contato
    await prisma.contact.update({
        where: { id: contact.id },
        data: { lastMessageAt: new Date() }
    })
}
