import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

/**
 * GET request para verificar o webhook (Challenge)
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)

    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    if (mode && token) {
        if (mode === 'subscribe') {
            // 1. Verifica no Banco de Dados
            const user = await prisma.user.findFirst({
                where: { whatsappVerifyToken: token }
            })

            if (user) {
                console.log(`Webhook verificado para usuário: ${user.id}`)
                return new NextResponse(challenge, { status: 200 })
            }

            // 2. Fallback para Variável de Ambiente
            if (process.env.WHATSAPP_VERIFY_TOKEN && token === process.env.WHATSAPP_VERIFY_TOKEN) {
                console.log('Webhook verificado via ENV')
                return new NextResponse(challenge, { status: 200 })
            }
        }
        return new NextResponse('Forbidden', { status: 403 })
    }

    return new NextResponse('Bad Request', { status: 400 })
}

/**
 * POST request para receber notificações
 */
export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text()
        const body = JSON.parse(rawBody)

        // 1. Resiliência: Salvar Log Bruto
        let logId: string | undefined

        try {
            const log = await prisma.webhookLog.create({
                data: {
                    payload: body,
                    status: 'RECEIVED'
                }
            })
            logId = log.id
        } catch (logError) {
            console.error('Erro ao salvar log do webhook:', logError)
        }

        // 2. Processamento
        if (body.object === 'whatsapp_business_account') {
            const entries = body.entry || []

            for (const entry of entries) {
                for (const change of entry.changes) {
                    if (change.value && change.value.messages) {
                        const phoneNumberId = change.value.metadata.phone_number_id

                        // Buscar Usuario (Tenant) pelo ID do Telefone
                        const user = await prisma.user.findFirst({
                            where: { whatsappPhoneNumberId: phoneNumberId }
                        })

                        if (user) {
                            // Validar Assinatura
                            let isSignatureValid = false
                            const signature = request.headers.get('x-hub-signature-256')

                            if (!signature) {
                                console.warn(`Webhook: Assinatura ausente para usuário ${user.id}`)
                                if (logId) await prisma.webhookLog.update({ where: { id: logId }, data: { status: 'MISSING_SIGNATURE', error: 'Assinatura ausente no header' } })
                                return new NextResponse('Unauthorized: Missing Signature', { status: 401 })
                            }

                            // 1. Tentar validar com Secret do Usuário
                            if (user.whatsappAppSecret) {
                                const expectedSignature = 'sha256=' + crypto
                                    .createHmac('sha256', user.whatsappAppSecret)
                                    .update(rawBody)
                                    .digest('hex')

                                if (signature === expectedSignature) {
                                    isSignatureValid = true
                                } else {
                                    console.warn(`Webhook: Assinatura inválida com Secret do Usuário ${user.id}. Esperado: ${expectedSignature}, Recebido: ${signature}`)
                                }
                            }

                            // 2. Fallback: Tentar validar com Secret Global (ENV)
                            if (!isSignatureValid && process.env.WHATSAPP_APP_SECRET) {
                                const expectedSignatureEnv = 'sha256=' + crypto
                                    .createHmac('sha256', process.env.WHATSAPP_APP_SECRET)
                                    .update(rawBody)
                                    .digest('hex')

                                if (signature === expectedSignatureEnv) {
                                    console.log(`Webhook: Assinatura validada via Fallback (Global ENV) para usuário ${user.id}`)
                                    isSignatureValid = true
                                } else {
                                    console.warn(`Webhook: Assinatura inválida também com Global ENV. Esperado: ${expectedSignatureEnv}`)
                                    // Save the debug info for the last failed attempt (Global ENV)
                                    if (logId) await prisma.webhookLog.update({
                                        where: { id: logId },
                                        data: {
                                            // Keep this warning "soft" until the final check fails
                                            error: `Sig Mismatch (Global). Rec: ${signature.substring(0, 15)}... Exp: ${expectedSignatureEnv.substring(0, 15)}...`
                                        }
                                    })
                                }
                            }

                            if (!isSignatureValid) {
                                console.error(`Webhook: Falha de autenticação. Nenhuma assinatura bateu.`)
                                if (logId) await prisma.webhookLog.update({
                                    where: { id: logId },
                                    data: {
                                        status: 'INVALID_SIGNATURE',
                                        error: `Assinatura inválida. Recebido: ${signature}. GlobalEnv: ${process.env.WHATSAPP_APP_SECRET ? 'DEFINED' : 'UNDEFINED'}`
                                    }
                                })
                                return new NextResponse('Unauthorized: Invalid Signature', { status: 401 })
                            }

                            // Processar Mensagens
                            let successCount = 0
                            for (const message of change.value.messages) {
                                await processMessage(user.id, message, change.value.contacts)
                                successCount++
                            }

                            if (logId) await prisma.webhookLog.update({ where: { id: logId }, data: { status: 'PROCESSED', error: `Processadas: ${successCount} msgs` } })
                        } else {
                            console.warn(`Webhook: Tenant não encontrado para Phone ID ${phoneNumberId}`)
                            if (logId) await prisma.webhookLog.update({ where: { id: logId }, data: { status: 'TENANT_NOT_FOUND', error: `Nenhum usuário com Phone ID: ${phoneNumberId}` } })
                        }
                    }
                }
            }
        }

        return NextResponse.json({ success: true }, { status: 200 })

    } catch (error) {
        console.error('Erro crítico no Webhook:', error)
        return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 })
    }
}

/**
 * Função auxiliar para processar e salvar a mensagem
 */
async function processMessage(userId: string, message: any, contacts: any[]) {
    try {
        const from = message.from
        const waId = message.id
        const timestamp = message.timestamp

        // Dados do contato
        const contactInfo = contacts?.find((c: any) => c.wa_id === from)
        const profileName = contactInfo?.profile?.name || from

        // Buscar ou Criar Contato
        let contact = await prisma.contact.findUnique({
            where: {
                userId_phone: { userId, phone: from }
            }
        })

        if (!contact) {
            contact = await prisma.contact.create({
                data: {
                    userId,
                    phone: from,
                    name: profileName
                }
            })
        } else if (profileName && profileName !== from && !contact.name) {
            await prisma.contact.update({
                where: { id: contact.id },
                data: { name: profileName }
            })
        }

        // Extrair Conteúdo
        let content = ''
        let type = message.type

        switch (type) {
            case 'text':
                content = message.text.body
                break
            case 'image':
                content = message.image.caption || '[Imagem]'
                break
            case 'button':
                content = message.button.text
                type = 'text'
                break
            case 'interactive':
                if (message.interactive.type === 'button_reply') {
                    content = message.interactive.button_reply.title
                } else if (message.interactive.type === 'list_reply') {
                    content = message.interactive.list_reply.title
                } else {
                    content = '[Interativo]'
                }
                type = 'text'
                break
            default:
                content = `[${type}]`
        }

        // Deduplicação
        const existing = await prisma.message.findUnique({
            where: { whatsappId: waId }
        })
        if (existing) return

        // Salvar Mensagem
        await prisma.message.create({
            data: {
                contactId: contact.id,
                content,
                type,
                direction: 'INBOUND',
                status: 'DELIVERED',
                whatsappId: waId,
                createdAt: new Date(parseInt(timestamp) * 1000)
            }
        })

        // Atualizar contato
        await prisma.contact.update({
            where: { id: contact.id },
            data: { lastMessageAt: new Date() }
        })

    } catch (err) {
        console.error('Erro ao processar mensagem individual:', err)
    }
}
