"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WhatsAppSettings } from '@/components/settings/whatsapp-settings'
import { PaymentSettings } from '@/components/settings/payment-settings'
import { TemplateSettings } from '@/components/settings/template-settings'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Configure suas integrações e credenciais da API
        </p>
      </div>

      <Tabs defaultValue="whatsapp" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="whatsapp">WhatsApp Business</TabsTrigger>
          <TabsTrigger value="payment">Gateways de Pagamento</TabsTrigger>
          <TabsTrigger value="template">Template & Aparência</TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp">
          <WhatsAppSettings />
        </TabsContent>

        <TabsContent value="payment">
          <PaymentSettings />
        </TabsContent>

        <TabsContent value="template">
          <TemplateSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}

