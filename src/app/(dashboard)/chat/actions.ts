'use server'

import { prisma } from "@/lib/prisma"
import { WhatsAppService } from "@/lib/whatsapp-service"
import { revalidatePath } from "next/cache"

export async function getContacts(userId: string) {
    try {
        const contacts = await prisma.contact.findMany({
            where: { userId },
            orderBy: { lastMessageAt: 'desc' },
            include: {
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                }
            }
        })

        return { success: true, contacts }
    } catch (error) {
        console.error("Error fetching contacts:", error)
        return { success: false, error: "Failed to fetch contacts" }
    }
}

export async function getMessages(contactId: string) {
    try {
        const messages = await prisma.message.findMany({
            where: { contactId },
            orderBy: { createdAt: 'asc' }
        })

        return { success: true, messages }
    } catch (error) {
        console.error("Error fetching messages:", error)
        return { success: false, error: "Failed to fetch messages" }
    }
}

export async function sendMessage(userId: string, contactId: string, message: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        })

        if (!user || !user.whatsappPhoneNumberId || !user.whatsappToken) {
            return { success: false, error: "WhatsApp not configured" }
        }

        const contact = await prisma.contact.findUnique({
            where: { id: contactId }
        })

        if (!contact) {
            return { success: false, error: "Contact not found" }
        }

        // Send via WhatsApp
        const whatsapp = new WhatsAppService({
            phoneNumberId: user.whatsappPhoneNumberId,
            accessToken: user.whatsappToken
        })

        const result = await whatsapp.sendTextMessage(contact.phone, message)

        if (!result.success) {
            return { success: false, error: result.error || "Failed to send message" }
        }

        // Save to database
        await prisma.message.create({
            data: {
                contactId,
                content: message,
                type: 'text',
                direction: 'OUTBOUND',
                status: 'SENT',
                whatsappId: result.messageId
            }
        })

        // Update last message time
        await prisma.contact.update({
            where: { id: contactId },
            data: { lastMessageAt: new Date() }
        })

        revalidatePath('/chat')
        return { success: true }
    } catch (error) {
        console.error("Error sending message:", error)
        return { success: false, error: "Internal server error" }
    }
}
