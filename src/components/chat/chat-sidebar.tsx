'use client'

import { Card } from "@/components/ui/card"
import { useRouter, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Contact {
    id: string
    name: string | null
    phone: string
    lastMessageAt: Date
    messages: {
        content: string
        createdAt: Date
    }[]
}

interface ChatSidebarProps {
    contacts: Contact[]
}

export function ChatSidebar({ contacts }: ChatSidebarProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const success = searchParams.get('success') // Just in case
    const currentContactId = searchParams.get('contactId')

    return (
        <div className="w-80 border-r border-gray-200 h-full bg-white flex flex-col">
            <div className="p-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">Conversas</h2>
            </div>

            <div className="flex-1 overflow-y-auto">
                {contacts.length === 0 ? (
                    <div className="p-4 text-center text-gray-400">
                        Nenhuma conversa iniciada
                    </div>
                ) : (
                    <div className="space-y-1">
                        {contacts.map((contact) => (
                            <div
                                key={contact.id}
                                onClick={() => router.push(`/chat?contactId=${contact.id}`)}
                                className={`w-full p-4 flex items-center space-x-3 cursor-pointer hover:bg-gray-50 transition-colors ${currentContactId === contact.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                                    }`}
                            >
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                                    {contact.name?.charAt(0) || contact.phone.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="text-sm font-medium text-gray-900 truncate">
                                            {contact.name || contact.phone}
                                        </h3>
                                        <span className="text-xs text-gray-400">
                                            {contact.lastMessageAt && format(new Date(contact.lastMessageAt), 'HH:mm', { locale: ptBR })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 truncate">
                                        {contact.messages[0]?.content || "Sem mensagens"}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
