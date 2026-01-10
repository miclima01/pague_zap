"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useState, useEffect } from 'react'
import { CheckCircle2, AlertCircle, Copy, RefreshCw } from 'lucide-react'
import { useSession } from 'next-auth/react'

function generateRandomToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = 'paguezap_'
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function WhatsAppSettings() {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'success' | 'error' | null>(null)
  const [formData, setFormData] = useState({
    phoneNumberId: '',
    whatsappToken: '',
    businessId: '',
    appSecret: '',
    verifyToken: '',
  })
  const [webhookUrl, setWebhookUrl] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWebhookUrl(`${window.location.origin}/api/webhooks/whatsapp`)
    }
  }, [])

  const generateToken = () => {
    setFormData(prev => ({ ...prev, verifyToken: generateRandomToken() }))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // Could add toast here
    alert('Copiado para a área de transferência!')
  }

  useEffect(() => {
    // Carregar configurações existentes
    if (session?.user?.id) {
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
          if (data.whatsappPhoneNumberId) {
            setFormData({
              phoneNumberId: data.whatsappPhoneNumberId || '',
              whatsappToken: data.whatsappToken || '',
              businessId: data.whatsappBusinessId || '',
              appSecret: data.whatsappAppSecret || '',
              verifyToken: data.whatsappVerifyToken || generateRandomToken(),
            })
          }
        })
        .catch(console.error)
    }
  }, [session])

  const handleTestConnection = async () => {
    if (!formData.phoneNumberId || !formData.whatsappToken) {
      setConnectionStatus('error')
      return
    }

    setIsTestingConnection(true)
    setConnectionStatus(null)

    try {
      const response = await fetch('/api/settings/test-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumberId: formData.phoneNumberId,
          accessToken: formData.whatsappToken,
        }),
      })

      const result = await response.json()
      setConnectionStatus(result.success ? 'success' : 'error')
    } catch (error) {
      setConnectionStatus('error')
    } finally {
      setIsTestingConnection(false)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/settings/whatsapp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsappPhoneNumberId: formData.phoneNumberId,
          whatsappToken: formData.whatsappToken,
          whatsappBusinessId: formData.businessId,
          whatsappAppSecret: formData.appSecret,
          whatsappVerifyToken: formData.verifyToken,
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao salvar configurações')
      }

      alert('Configurações salvas com sucesso!')
    } catch (error) {
      alert('Erro ao salvar configurações')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credenciais WhatsApp Business API</CardTitle>
        <CardDescription>
          Configure suas credenciais da Meta Business.{" "}
          <a
            href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline ml-1"
          >
            Ver documentação
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phoneNumberId">Phone Number ID</Label>
          <Input
            id="phoneNumberId"
            placeholder="123456789012345"
            type="text"
            value={formData.phoneNumberId}
            onChange={(e) => setFormData({ ...formData, phoneNumberId: e.target.value })}
          />
          <p className="text-sm text-muted-foreground">
            Encontre em: Meta Business Suite → WhatsApp → API Setup
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsappToken">Access Token</Label>
          <Input
            id="whatsappToken"
            placeholder="EAAG..."
            type="password"
            value={formData.whatsappToken}
            onChange={(e) => setFormData({ ...formData, whatsappToken: e.target.value })}
          />
          <p className="text-sm text-muted-foreground">
            Token permanente da sua aplicação WhatsApp Business
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="businessId">WhatsApp Business Account ID</Label>
          <Input
            id="businessId"
            placeholder="123456789012345"
            type="text"
            value={formData.businessId}
            onChange={(e) => setFormData({ ...formData, businessId: e.target.value })}
          />
        </div>

        <div className="space-y-4 border-t pt-4">
          <h3 className="text-lg font-semibold">Configuração do Webhook (Meta)</h3>

          <div className="space-y-2">
            <Label>URL de Callback</Label>
            <div className="flex gap-2">
              <Input readOnly value={webhookUrl} className="bg-muted" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookUrl)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Coloque esta URL no campo "URL de callback" na Meta.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="verifyToken">Webhook Verify Token</Label>
            <div className="flex gap-2">
              <Input
                id="verifyToken"
                placeholder="Gerar token seguro..."
                type="text"
                value={formData.verifyToken}
                onChange={(e) => setFormData({ ...formData, verifyToken: e.target.value })}
              />
              <Button variant="outline" size="icon" onClick={generateToken} title="Gerar novo token">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(formData.verifyToken)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Coloque este token no campo "Verificar token" na Meta.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="appSecret">WhatsApp App Secret</Label>
          <Input
            id="appSecret"
            placeholder="Chave secreta do aplicativo Meta"
            type="password"
            value={formData.appSecret}
            onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
          />
          <p className="text-sm text-muted-foreground">
            Encontre em: Painel do App Meta -&gt; Configurações do App -&gt; Básico
          </p>
        </div>

        {connectionStatus === 'success' && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Conexão estabelecida com sucesso!
            </AlertDescription>
          </Alert>
        )}

        {connectionStatus === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Falha na conexão. Verifique suas credenciais.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTestingConnection || isLoading}
          >
            {isTestingConnection ? 'Testando...' : 'Testar Conexão'}
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

