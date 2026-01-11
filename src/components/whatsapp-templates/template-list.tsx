"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, Trash2, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Template {
    id: string
    name: string
    status: string
    category: string
    language: string
}

export function TemplateList() {
    const [templates, setTemplates] = useState<Template[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const fetchTemplates = async () => {
        try {
            const res = await fetch("/api/templates")
            if (!res.ok) throw new Error("Failed to fetch templates")
            const data = await res.json()
            setTemplates(data.data || [])
        } catch (error) {
            toast.error("Erro ao carregar templates")
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchTemplates()
    }, [])

    const handleDelete = async (name: string) => {
        if (!confirm(`Tem certeza que deseja excluir o template "${name}"?`)) return

        setDeletingId(name)
        try {
            const res = await fetch(`/api/templates?name=${name}`, {
                method: "DELETE",
            })

            if (!res.ok) {
                const text = await res.text()
                throw new Error(text)
            }

            toast.success("Template excluído com sucesso")
            // Refresh list
            fetchTemplates()
        } catch (error) {
            toast.error("Erro ao excluir template")
            console.error(error)
        } finally {
            setDeletingId(null)
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "APPROVED":
                return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Aprovado</Badge>
            case "PENDING":
                return <Badge className="bg-yellow-500 hover:bg-yellow-600"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>
            case "REJECTED":
                return <Badge className="bg-red-500 hover:bg-red-600"><XCircle className="w-3 h-3 mr-1" /> Rejeitado</Badge>
            default:
                return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" /> {status}</Badge>
        }
    }

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    }

    return (
        <Card className="mt-8">
            <CardHeader>
                <CardTitle>Meus Templates</CardTitle>
                <CardDescription>Gerencie seus templates do WhatsApp</CardDescription>
            </CardHeader>
            <CardContent>
                {templates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        Nenhum template encontrado.
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead>Idioma</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {templates.map((template) => (
                                <TableRow key={template.id}>
                                    <TableCell className="font-medium">{template.name}</TableCell>
                                    <TableCell>{getStatusBadge(template.status)}</TableCell>
                                    <TableCell>{template.category}</TableCell>
                                    <TableCell>{template.language}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleDelete(template.name)}
                                            disabled={!!deletingId}
                                        >
                                            {deletingId === template.name ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    )
}
