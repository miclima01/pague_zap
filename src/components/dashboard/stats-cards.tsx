import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { Receipt, Clock, CheckCircle, DollarSign } from "lucide-react"

interface StatsCardsProps {
  stats: {
    totalCharges: number
    pendingCharges: number
    paidCharges: number
    totalRevenue: number
  }
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Total de Cobranças",
      value: stats.totalCharges,
      icon: Receipt,
      description: "Todas as cobranças",
    },
    {
      title: "Pendentes",
      value: stats.pendingCharges,
      icon: Clock,
      description: "Aguardando pagamento",
      variant: "warning" as const,
    },
    {
      title: "Pagas",
      value: stats.paidCharges,
      icon: CheckCircle,
      description: "Cobranças pagas",
      variant: "success" as const,
    },
    {
      title: "Receita Total",
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      description: "Valor total recebido",
      variant: "primary" as const,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

