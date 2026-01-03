import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { formatCurrency, formatDate } from "@/lib/utils"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options"
import { prisma } from "@/lib/prisma"
import { ChargeStatus } from "@prisma/client"

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

export async function RecentCharges() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return null
  }

  const recentCharges = await prisma.charge.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      customerName: true,
      amount: true,
      status: true,
      createdAt: true,
      description: true,
    },
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Cobranças Recentes</CardTitle>
            <CardDescription>Últimas 5 cobranças criadas</CardDescription>
          </div>
          <Link href="/charges">
            <Button variant="outline" size="sm">
              Ver todas
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {recentCharges.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma cobrança criada ainda.{" "}
            <Link href="/charges/new" className="text-primary hover:underline">
              Criar primeira cobrança
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {recentCharges.map((charge) => (
              <div
                key={charge.id}
                className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-medium">{charge.customerName}</h3>
                    {getStatusBadge(charge.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {charge.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(charge.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(charge.amount)}</p>
                  <Link href={`/charges/${charge.id}`}>
                    <Button variant="ghost" size="sm" className="mt-2">
                      Ver detalhes
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

