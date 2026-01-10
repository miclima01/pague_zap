"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ChargeStatus } from "@/lib/enums"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import Link from "next/link"

interface Charge {
  id: string
  customerName: string
  customerPhone: string
  amount: number
  status: ChargeStatus
  createdAt: string
  description: string
  dueDate?: string | null
}

function getStatusBadge(status: ChargeStatus) {
  const statusConfig = {
    PENDING: { label: "Pendente", className: "bg-yellow-100 text-yellow-800" },
    SCHEDULED: { label: "Agendada", className: "bg-blue-100 text-blue-800" },
    SENT: { label: "Enviada", className: "bg-purple-100 text-purple-800" },
    PAID: { label: "Paga", className: "bg-green-100 text-green-800" },
    FAILED: { label: "Falhou", className: "bg-red-100 text-red-800" },
    CANCELLED: { label: "Cancelada", className: "bg-gray-100 text-gray-800" },
  }

  const config = statusConfig[status] || statusConfig.PENDING

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

export function ChargesList() {
  const router = useRouter()
  const [charges, setCharges] = useState<Charge[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [error, setError] = useState("")

  const fetchCharges = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }
      if (search) {
        params.append("search", search)
      }

      const response = await fetch(`/api/charges?${params.toString()}`)
      if (!response.ok) {
        throw new Error("Erro ao buscar cobranças")
      }

      const data = await response.json()
      setCharges(data)
    } catch (error) {
      setError("Erro ao carregar cobranças")
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, search])

  useEffect(() => {
    fetchCharges()
  }, [fetchCharges])

  const handleCancel = async (chargeId: string) => {
    if (!confirm("Tem certeza que deseja cancelar esta cobrança?")) {
      return
    }

    try {
      const response = await fetch(`/api/charges/${chargeId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        toast.error("Erro ao cancelar cobrança")
        return
      }

      toast.success("Cobrança cancelada com sucesso")
      fetchCharges()
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error("Erro ao cancelar cobrança")
    }
  }

  const handleSend = async (chargeId: string) => {
    try {
      const response = await fetch("/api/charges/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chargeId }),
      })

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || "Erro ao enviar cobrança")
        return
      }

      toast.success("Cobrança enviada com sucesso!")
      fetchCharges()
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error("Erro ao enviar cobrança")
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nome, telefone ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="all">Todos os status</option>
              <option value="PENDING">Pendente</option>
              <option value="SCHEDULED">Agendada</option>
              <option value="SENT">Enviada</option>
              <option value="PAID">Paga</option>
              <option value="FAILED">Falhou</option>
              <option value="CANCELLED">Cancelada</option>
            </select>
          </div>

          {error && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando cobranças...
            </div>
          ) : charges.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma cobrança encontrada.{" "}
              <Link href="/charges/new" className="text-primary hover:underline">
                Criar primeira cobrança
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Cliente</th>
                    <th className="text-left p-2 font-medium">Valor</th>
                    <th className="text-left p-2 font-medium">Status</th>
                    <th className="text-left p-2 font-medium">Vencimento</th>
                    <th className="text-left p-2 font-medium">Criada em</th>
                    <th className="text-right p-2 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {charges.map((charge) => (
                    <tr key={charge.id} className="border-b hover:bg-accent/50">
                      <td className="p-2">
                        <div>
                          <div className="font-medium">{charge.customerName}</div>
                          <div className="text-sm text-muted-foreground">
                            {charge.customerPhone}
                          </div>
                        </div>
                      </td>
                      <td className="p-2 font-semibold">
                        {formatCurrency(charge.amount)}
                      </td>
                      <td className="p-2">{getStatusBadge(charge.status)}</td>
                      <td className="p-2 text-sm text-muted-foreground">
                        {charge.dueDate ? formatDate(charge.dueDate) : "-"}
                      </td>
                      <td className="p-2 text-sm text-muted-foreground">
                        {formatDate(charge.createdAt)}
                      </td>
                      <td className="p-2">
                        <div className="flex justify-end gap-2">
                          <Link href={`/charges/${charge.id}`}>
                            <Button variant="ghost" size="sm">
                              Ver
                            </Button>
                          </Link>
                          {charge.status !== 'SENT' && charge.status !== 'PAID' && charge.status !== 'CANCELLED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSend(charge.id)}
                            >
                              Enviar
                            </Button>
                          )}
                          {charge.status !== 'PAID' && charge.status !== 'CANCELLED' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleCancel(charge.id)}
                            >
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

