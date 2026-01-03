import { StatsCards } from "@/components/dashboard/stats-cards"
import { RecentCharges } from "@/components/charges/recent-charges"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options"
import { prisma } from "@/lib/prisma"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return null
  }

  // Buscar estatísticas do usuário
  const [totalCharges, pendingCharges, paidCharges, paidChargesData] = await Promise.all([
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
        status: 'PAID'
      },
      select: {
        amount: true,
      },
    }),
  ])

  const totalRevenue = paidChargesData.reduce((sum, charge) => sum + charge.amount, 0)

  const stats = {
    totalCharges,
    pendingCharges,
    paidCharges,
    totalRevenue,
  }

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
      <RecentCharges />
    </div>
  )
}

