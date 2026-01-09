import { StatsCards } from "@/components/dashboard/stats-cards"
import { RecentCharges } from "@/components/charges/recent-charges"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { StatusChart } from "@/components/dashboard/status-chart"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options"
import { prisma } from "@/lib/prisma"
import { subDays, format } from "date-fns"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return null
  }

  const now = new Date()
  const thirtyDaysAgo = subDays(now, 30)

  // Buscar estatísticas do usuário
  const [
    totalCharges, 
    pendingCharges, 
    paidCharges, 
    paidChargesData,
    statusDistribution
  ] = await Promise.all([
    prisma.charge.count({
      where: { userId: session.user.id },
    }),
    prisma.charge.count({
      where: { 
        userId: session.user.id,
        status: { in: ['PENDING', 'SCHEDULED', 'SENT'] }
      },
    }),
    prisma.charge.count({
      where: { 
        userId: session.user.id,
        status: 'PAID'
      },
    }),
    prisma.charge.findMany({
      where: { 
        userId: session.user.id,
        status: 'PAID',
        paidAt: { gte: thirtyDaysAgo }
      },
      select: {
        amount: true,
        paidAt: true
      },
      orderBy: { paidAt: 'asc' }
    }),
    prisma.charge.groupBy({
      by: ['status'],
      where: { userId: session.user.id },
      _count: { status: true }
    })
  ])

  // Calcular receita total (geral)
  // Nota: Para totalRevenue geral, idealmente faríamos um aggregate, 
  // mas aqui estamos somando apenas dos últimos 30 dias se usarmos paidChargesData.
  // Vamos buscar o total geral separado ou aceitar que é dos últimos 30 dias?
  // O código anterior somava 'paidChargesData' que era ALL PAID charges.
  // Vamos manter a consistência e buscar o total geral de revenue.
  const totalRevenueResult = await prisma.charge.aggregate({
    where: { 
      userId: session.user.id,
      status: 'PAID'
    },
    _sum: { amount: true }
  })
  const totalRevenue = totalRevenueResult._sum.amount || 0

  const stats = {
    totalCharges,
    pendingCharges,
    paidCharges,
    totalRevenue,
  }

  // Processar dados do gráfico de receita (últimos 30 dias)
  const revenueMap = new Map<string, number>()
  // Inicializar mapa com 0 para todos os dias
  for (let i = 0; i < 30; i++) {
    const date = subDays(now, i)
    const key = format(date, 'dd/MM')
    if (!revenueMap.has(key)) {
        revenueMap.set(key, 0)
    }
  }

  paidChargesData.forEach(charge => {
    if (charge.paidAt) {
      const key = format(charge.paidAt, 'dd/MM')
      // Se o dia estiver no mapa (últimos 30 dias), soma
      // Nota: A iteração de inicialização acima vai de hoje para trás.
      // A query traz os dados ordenados.
      // O map garante que temos todos os dias.
      revenueMap.set(key, (revenueMap.get(key) || 0) + charge.amount)
    }
  })

  // Converter para array e ordenar cronologicamente (o map foi preenchido de trás pra frente ou aleatoriamente)
  // Vamos reconstruir o array ordenado pelos últimos 30 dias
  const revenueChartData = []
  for (let i = 29; i >= 0; i--) {
    const date = subDays(now, i)
    const key = format(date, 'dd/MM')
    revenueChartData.push({
      date: key,
      amount: revenueMap.get(key) || 0
    })
  }

  // Processar dados do gráfico de status
  const statusColors: Record<string, string> = {
    PENDING: '#eab308', // yellow-500
    SCHEDULED: '#a855f7', // purple-500
    SENT: '#3b82f6', // blue-500
    PAID: '#22c55e', // green-500
    FAILED: '#ef4444', // red-500
    CANCELLED: '#94a3b8', // slate-400
  }

  const statusChartData = statusDistribution.map(item => ({
    name: item.status,
    value: item._count.status,
    color: statusColors[item.status] || '#94a3b8'
  }))

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Bem-vindo de volta, {session.user.name || session.user.email}!
          </p>
        </div>
        <Link href="/charges/new">
          <Button>Nova Cobrança</Button>
        </Link>
      </div>
      
      <StatsCards stats={stats} />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <RevenueChart data={revenueChartData} />
        <StatusChart data={statusChartData} />
      </div>

      <RecentCharges />
    </div>
  )
}

