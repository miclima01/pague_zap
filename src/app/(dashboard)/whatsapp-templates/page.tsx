import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"
import { TemplateList } from "@/components/whatsapp-templates/template-list"

export default function WhatsAppTemplatesPage() {
    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Templates do WhatsApp</h1>
                    <p className="text-muted-foreground mt-2">
                        Crie e gerencie seus modelos de mensagem.
                    </p>
                </div>
                <Link href="/whatsapp-templates/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Template
                    </Button>
                </Link>
            </div>

            <TemplateList />
        </div>
    )
}
