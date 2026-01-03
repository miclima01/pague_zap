import { ChargesList } from "@/components/charges/charges-list"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function ChargesPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cobranças</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todas as suas cobranças
          </p>
        </div>
        <Link href="/charges/new">
          <Button>Nova Cobrança</Button>
        </Link>
      </div>
      <ChargesList />
    </div>
  )
}

