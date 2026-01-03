import { ChargeDetails } from "@/components/charges/charge-details"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options"
import { redirect } from "next/navigation"

export default async function ChargeDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Detalhes da Cobrança</h1>
        <p className="text-muted-foreground mt-1">
          Visualize e gerencie os detalhes da cobrança
        </p>
      </div>
      <ChargeDetails chargeId={params.id} />
    </div>
  )
}

