'use client'

import { useState, useEffect, useRef } from "react"
import { getMessages, sendMessage } from "@/app/(dashboard)/chat/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"

interface Message {
    id: string
    content: string
    direction: string
    createdAt: Date
    status: string
}

interface ChatWindowProps {
    userId: string
    contactId: string
    contactName: string
}

export function ChatWindow({ userId, contactId, contactName }: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState("")
    const [loading, setLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const fetchMessages = async () => {
        const result = await getMessages(contactId)
        if (result.success && result.messages) {
            setMessages(result.messages as any)
        }
    }

    useEffect(() => {
        fetchMessages()
        const interval = setInterval(fetchMessages, 5000) // Poll every 5s
        return () => clearInterval(interval)
    }, [contactId])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim() || loading) return

        setLoading(true)
        try {
            // Optimistic update
            const tempMessage = {
                id: 'temp-' + Date.now(),
                content: newMessage,
                direction: 'OUTBOUND',
                createdAt: new Date(),
                status: 'SENDING'
            }
            setMessages(prev => [...prev, tempMessage])
            setNewMessage("")

            const result = await sendMessage(userId, contactId, tempMessage.content)

            if (!result.success) {
                // Handle error (maybe mark message as failed)
                alert("Failed to send: " + result.error)
            } else {
                fetchMessages()
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="p-4 bg-white border-b border-gray-200 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-800">{contactName}</h2>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[70%] rounded-lg p-3 ${msg.direction === 'OUTBOUND'
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                                }`}
                        >
                            <p className="text-sm">{msg.content}</p>
                            <p className={`text-[10px] mt-1 ${msg.direction === 'OUTBOUND' ? 'text-blue-100' : 'text-gray-400'
                                }`}>
                                {format(new Date(msg.createdAt), 'HH:mm')}
                                {msg.status === 'SENDING' && ' • Enviando...'}
                            </p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-200">
                <form onSubmit={handleSendMessage} className="flex space-x-2">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Digite uma mensagem..."
                        disabled={loading}
                        className="flex-1"
                    />
                    <Button type="submit" disabled={loading || !newMessage.trim()}>
                        Enviar
                    </Button>
                </form>
            </div>
        </div>
    )
}
