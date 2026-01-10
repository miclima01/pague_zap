import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options"
import { redirect } from "next/navigation"
import { getContacts } from "./actions"
import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { ChatWindow } from "@/components/chat/chat-window"

export default async function ChatPage({
    searchParams,
}: {
    searchParams: { contactId?: string }
}) {
    const session = await getServerSession(authOptions)

    if (!session) {
        redirect("/login")
    }

    const userId = session.user.id as string
    const { contacts } = await getContacts(userId)

    const selectedContactId = searchParams.contactId
    const selectedContact = contacts?.find((c: any) => c.id === selectedContactId)

    return (
        <div className="h-[calc(100vh-100px)] border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm flex">
            <ChatSidebar contacts={contacts || []} />

            <div className="flex-1 flex flex-col">
                {selectedContact ? (
                    <ChatWindow
                        userId={userId}
                        contactId={selectedContact.id}
                        contactName={selectedContact.name || selectedContact.phone}
                    />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                        <svg
                            className="w-16 h-16 mb-4 text-gray-300"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                        </svg>
                        <p className="text-lg font-medium">Selecione uma conversa para começar</p>
                        <p className="text-sm mt-2">Envie mensagens para seus clientes via WhatsApp</p>
                    </div>
                )}
            </div>
        </div>
    )
}
