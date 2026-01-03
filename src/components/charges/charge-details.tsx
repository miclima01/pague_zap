"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils"
import { ChargeStatus } from "@prisma/client"
import Link from "next/link"

interface Charge {
  id: string
  customerName: string
  customerPhone: string
  customerEmail?: string | null
  amount: number
  description: string
  status: ChargeStatus
  dueDate?: string | null
  createdAt: string
  sentAt?: string | null
  paidAt?: string | null
  gateway: string
  scheduleType: string
  nextSendDate?: string | null
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
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

export function ChargeDetails({ chargeId }: { chargeId: string }) {
  const router = useRouter()
  const [charge, setCharge] = useState<Charge | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchCharge()
  }, [chargeId])

  const fetchCharge = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/charges/${chargeId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError("Cobrança não encontrada")
          return
        }
        throw new Error("Erro ao buscar cobrança")
      }

      const data = await response.json()
      setCharge(data)
    } catch (error) {
      setError("Erro ao carregar cobrança")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm("Tem certeza que deseja cancelar esta cobrança?")) {
      return
    }

    try {
      const response = await fetch(`/api/charges/${chargeId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Erro ao cancelar cobrança")
      }

      router.push("/charges")
      router.refresh()
    } catch (error) {
      alert("Erro ao cancelar cobrança")
    }
  }

  const handleSend = async () => {
    try {
      const response = await fetch("/api/charges/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chargeId }),
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error || "Erro ao enviar cobrança")
        return
      }

      fetchCharge()
      router.refresh()
    } catch (error) {
      alert("Erro ao enviar cobrança")
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8 text-muted-foreground">
            Carregando detalhes da cobrança...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !charge) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8 text-destructive">
            {error || "Cobrança não encontrada"}
          </div>
          <div className="text-center">
            <Link href="/charges">
              <Button variant="outline">Voltar para lista</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Cobrança #{charge.id.slice(0, 8)}</CardTitle>
              <CardDescription className="mt-2">
                {getStatusBadge(charge.status)}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {charge.status !== 'SENT' && charge.status !== 'PAID' && charge.status !== 'CANCELLED' && (
                <Button onClick={handleSend}>Enviar Agora</Button>
              )}
              {charge.status !== 'PAID' && charge.status !== 'CANCELLED' && (
                <Button variant="destructive" onClick={handleCancel}>
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Cliente
              </h3>
              <p className="text-lg font-semibold">{charge.customerName}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Telefone
              </h3>
              <p className="text-lg">{charge.customerPhone}</p>
            </div>
            {charge.customerEmail && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Email
                </h3>
                <p className="text-lg">{charge.customerEmail}</p>
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Valor
              </h3>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(charge.amount)}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              Descrição
            </h3>
            <p className="text-lg">{charge.description}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Gateway de Pagamento
              </h3>
              <p className="text-lg capitalize">{charge.gateway}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Tipo de Agendamento
              </h3>
              <p className="text-lg">
                {charge.scheduleType === 'IMMEDIATE' && 'Imediato'}
                {charge.scheduleType === 'SCHEDULED_ONCE' && 'Agendado'}
                {charge.scheduleType === 'MONTHLY_RECURRING' && 'Recorrente Mensal'}
              </p>
            </div>
            {charge.dueDate && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Data de Vencimento
                </h3>
                <p className="text-lg">{formatDate(charge.dueDate)}</p>
              </div>
            )}
            {charge.nextSendDate && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Próximo Envio
                </h3>
                <p className="text-lg">{formatDateTime(charge.nextSendDate)}</p>
              </div>
            )}
          </div>

          <div className="border-t pt-4 grid gap-4 md:grid-cols-3">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Criada em
              </h3>
              <p className="text-sm">{formatDateTime(charge.createdAt)}</p>
            </div>
            {charge.sentAt && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Enviada em
                </h3>
                <p className="text-sm">{formatDateTime(charge.sentAt)}</p>
              </div>
            )}
            {charge.paidAt && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Paga em
                </h3>
                <p className="text-sm">{formatDateTime(charge.paidAt)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Link href="/charges">
          <Button variant="outline">Voltar para lista</Button>
        </Link>
      </div>
    </div>
  )
}

