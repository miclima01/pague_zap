"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScheduleType, ChargeFormData } from "@/types"

const chargeFormSchema = z.object({
  customerName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  customerPhone: z.string().min(10, "Telefone inválido").regex(/^[0-9+\s()-]+$/, "Telefone inválido"),
  customerEmail: z.string().email("Email inválido").optional().or(z.literal("")),
  amount: z.number().min(0.01, "Valor deve ser maior que zero"),
  description: z.string().min(5, "Descrição deve ter pelo menos 5 caracteres"),
  productName: z.string().optional(),
  imageUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  dueDate: z.date().optional(),
  scheduleType: z.nativeEnum(ScheduleType),
  scheduleDay: z.number().min(1).max(31).optional(),
  scheduledDate: z.date().optional(),
}).refine((data) => {
  if (data.scheduleType === ScheduleType.SCHEDULED_ONCE) {
    return !!data.scheduledDate
  }
  return true
}, {
  message: "Data de agendamento é obrigatória",
  path: ["scheduledDate"],
}).refine((data) => {
  if (data.scheduleType === ScheduleType.MONTHLY_RECURRING) {
    return !!data.scheduleDay && data.scheduleDay >= 1 && data.scheduleDay <= 31
  }
  return true
}, {
  message: "Dia do mês deve ser entre 1 e 31",
  path: ["scheduleDay"],
})

type ChargeFormValues = z.infer<typeof chargeFormSchema>

interface ChargeFormProps {
  initialData?: Partial<ChargeFormData>
  chargeId?: string
}

export function ChargeForm({ initialData, chargeId }: ChargeFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ChargeFormValues>({
    resolver: zodResolver(chargeFormSchema),
    defaultValues: {
      customerName: initialData?.customerName || "",
      customerPhone: initialData?.customerPhone || "",
      customerEmail: initialData?.customerEmail || "",
      amount: initialData?.amount || 0,
      description: initialData?.description || "",
      productName: initialData?.productName || "",
      imageUrl: initialData?.imageUrl || "",
      scheduleType: initialData?.scheduleType || ScheduleType.IMMEDIATE,
    },
  })

  const scheduleType = watch("scheduleType")

  const onSubmit = async (data: ChargeFormValues) => {
    setIsLoading(true)
    setError("")

    try {
      // Calcular nextSendDate baseado no tipo de agendamento
      let nextSendDate: Date | undefined

      if (data.scheduleType === ScheduleType.IMMEDIATE) {
        nextSendDate = new Date()
      } else if (data.scheduleType === ScheduleType.SCHEDULED_ONCE && data.scheduledDate) {
        nextSendDate = data.scheduledDate
      } else if (data.scheduleType === ScheduleType.MONTHLY_RECURRING && data.scheduleDay) {
        const now = new Date()
        const nextDate = new Date(now.getFullYear(), now.getMonth(), data.scheduleDay)
        if (nextDate < now) {
          nextDate.setMonth(nextDate.getMonth() + 1)
        }
        nextSendDate = nextDate
      }

      const payload = {
        ...data,
        imageUrl: data.imageUrl || null,
        dueDate: data.dueDate?.toISOString(),
        scheduledDate: data.scheduledDate?.toISOString(),
        nextSendDate: nextSendDate?.toISOString(),
        scheduleDay: data.scheduleType === ScheduleType.MONTHLY_RECURRING ? data.scheduleDay : null,
        gateway: 'pix', // Sempre PIX agora (configurado nas settings)
      }

      const url = chargeId ? `/api/charges/${chargeId}` : "/api/charges"
      const method = chargeId ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || "Erro ao salvar cobrança")
        return
      }

      router.push("/charges")
      router.refresh()
    } catch (error) {
      setError("Erro ao salvar cobrança")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>{chargeId ? "Editar Cobrança" : "Nova Cobrança"}</CardTitle>
        <CardDescription>
          Preencha os dados da cobrança que será enviada via WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customerName">Nome do Cliente *</Label>
              <Input
                id="customerName"
                {...register("customerName")}
                placeholder="Nome completo"
                disabled={isLoading}
              />
              {errors.customerName && (
                <p className="text-sm text-destructive">{errors.customerName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerPhone">Telefone *</Label>
              <Input
                id="customerPhone"
                {...register("customerPhone")}
                placeholder="(11) 99999-9999"
                disabled={isLoading}
              />
              {errors.customerPhone && (
                <p className="text-sm text-destructive">{errors.customerPhone.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerEmail">Email (opcional)</Label>
            <Input
              id="customerEmail"
              type="email"
              {...register("customerEmail")}
              placeholder="cliente@email.com"
              disabled={isLoading}
            />
            {errors.customerEmail && (
              <p className="text-sm text-destructive">{errors.customerEmail.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor (R$) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              {...register("amount", { valueAsNumber: true })}
              placeholder="0.00"
              disabled={isLoading}
            />
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="productName">Nome do Produto/Serviço</Label>
            <Input
              id="productName"
              {...register("productName")}
              placeholder="Ex: Serviço de Consultoria"
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              Se não informado, será usado a descrição
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="imageUrl">URL da Imagem do Produto</Label>
            <Input
              id="imageUrl"
              type="url"
              {...register("imageUrl")}
              placeholder="https://exemplo.com/imagem.jpg"
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              URL da imagem que será exibida na mensagem do WhatsApp
            </p>
            {errors.imageUrl && (
              <p className="text-sm text-destructive">{errors.imageUrl.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <textarea
              id="description"
              {...register("description")}
              rows={4}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Descreva o produto ou serviço..."
              disabled={isLoading}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Data de Vencimento (opcional)</Label>
            <Input
              id="dueDate"
              type="date"
              {...register("dueDate", { setValueAs: (v) => v ? new Date(v) : undefined })}
              disabled={isLoading}
            />
            {errors.dueDate && (
              <p className="text-sm text-destructive">{errors.dueDate.message}</p>
            )}
          </div>

          <div className="space-y-4 border-t pt-4">
            <Label>Tipo de Agendamento *</Label>
            <div className="space-y-3">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value={ScheduleType.IMMEDIATE}
                  {...register("scheduleType")}
                  className="h-4 w-4"
                  disabled={isLoading}
                />
                <span>Enviar imediatamente</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value={ScheduleType.SCHEDULED_ONCE}
                  {...register("scheduleType")}
                  className="h-4 w-4"
                  disabled={isLoading}
                />
                <span>Agendar para data específica</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value={ScheduleType.MONTHLY_RECURRING}
                  {...register("scheduleType")}
                  className="h-4 w-4"
                  disabled={isLoading}
                />
                <span>Recorrente mensal</span>
              </label>
            </div>
            {errors.scheduleType && (
              <p className="text-sm text-destructive">{errors.scheduleType.message}</p>
            )}

            {scheduleType === ScheduleType.SCHEDULED_ONCE && (
              <div className="space-y-2">
                <Label htmlFor="scheduledDate">Data de Envio *</Label>
                <Input
                  id="scheduledDate"
                  type="datetime-local"
                  {...register("scheduledDate", { setValueAs: (v) => v ? new Date(v) : undefined })}
                  disabled={isLoading}
                />
                {errors.scheduledDate && (
                  <p className="text-sm text-destructive">{errors.scheduledDate.message}</p>
                )}
              </div>
            )}

            {scheduleType === ScheduleType.MONTHLY_RECURRING && (
              <div className="space-y-2">
                <Label htmlFor="scheduleDay">Dia do Mês (1-31) *</Label>
                <Input
                  id="scheduleDay"
                  type="number"
                  min="1"
                  max="31"
                  {...register("scheduleDay", { valueAsNumber: true })}
                  placeholder="Ex: 5"
                  disabled={isLoading}
                />
                {errors.scheduleDay && (
                  <p className="text-sm text-destructive">{errors.scheduleDay.message}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : chargeId ? "Atualizar" : "Criar Cobrança"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

