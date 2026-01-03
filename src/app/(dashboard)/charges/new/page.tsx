import { ChargeForm } from "@/components/charges/charge-form"

export default function NewChargePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nova Cobrança</h1>
        <p className="text-muted-foreground mt-1">
          Crie uma nova cobrança para enviar via WhatsApp
        </p>
      </div>
      <ChargeForm />
    </div>
  )
}

