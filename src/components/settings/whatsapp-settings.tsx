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
  const [logs, setLogs] = useState<any[]>([])
  const [showLogs, setShowLogs] = useState(false)
  const [loadingLogs, setLoadingLogs] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWebhookUrl(`${window.location.origin}/api/webhooks/whatsapp`)
    }
  }, [])

  const saveSettings = async (data: typeof formData) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/settings/whatsapp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsappPhoneNumberId: data.phoneNumberId,
          whatsappToken: data.whatsappToken,
          whatsappBusinessId: data.businessId,
          whatsappAppSecret: data.appSecret,
          whatsappVerifyToken: data.verifyToken,
        }),
      })

      if (!response.ok) throw new Error('Erro ao salvar')

      return true
    } catch (error) {
      console.error(error)
      alert('Erro ao salvar configurações')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const generateToken = async () => {
    const newToken = generateRandomToken()
    const newData = { ...formData, verifyToken: newToken }
    setFormData(newData)

    // Auto-save
    const success = await saveSettings(newData)
    if (success) alert('Novo token gerado e salvo com sucesso!')
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
          if (!data.whatsappVerifyToken) {
            // Se não tiver token salvo, gera um, atualiza estado E salva no banco
            const newToken = generateRandomToken()
            const newData = {
              phoneNumberId: data.whatsappPhoneNumberId || '',
              whatsappToken: data.whatsappToken || '',
              businessId: data.whatsappBusinessId || '',
              appSecret: data.whatsappAppSecret || '',
              verifyToken: newToken
            }
            setFormData(newData)
            // Salvar silenciosamente no background
            fetch('/api/settings/whatsapp', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                whatsappPhoneNumberId: newData.phoneNumberId,
                whatsappToken: newData.whatsappToken,
                whatsappBusinessId: newData.businessId,
                whatsappAppSecret: newData.appSecret,
                whatsappVerifyToken: newData.verifyToken,
              }),
            }).catch(console.error)
          } else {
            setFormData({
              phoneNumberId: data.whatsappPhoneNumberId || '',
              whatsappToken: data.whatsappToken || '',
              businessId: data.whatsappBusinessId || '',
              appSecret: data.whatsappAppSecret || '',
              verifyToken: data.whatsappVerifyToken || '',
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
    const success = await saveSettings(formData)
    if (success) alert('Configurações salvas com sucesso!')
  }

  const fetchLogs = async () => {
    setLoadingLogs(true)
    try {
      const res = await fetch('/api/settings/logs')
      const data = await res.json()
      if (Array.isArray(data)) {
        setLogs(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingLogs(false)
    }
  }

  const toggleLogs = () => {
    if (!showLogs) {
      fetchLogs()
    }
    setShowLogs(!showLogs)
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
              Coloque esta URL no campo &quot;URL de callback&quot; na Meta.
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
              Coloque este token no campo &quot;Verificar token&quot; na Meta.
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

      <div className="border-t p-6 bg-slate-50 rounded-b-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Diagnóstico do Webhook</h3>
            <p className="text-sm text-muted-foreground">Veja os dados recebidos da Meta em tempo real.</p>
          </div>
          <Button variant="outline" size="sm" onClick={toggleLogs}>
            {showLogs ? 'Ocultar Logs' : 'Ver Logs Recentes'}
          </Button>
        </div>

        {showLogs && (
          <div className="space-y-2">
            <div className="flex justify-end mb-2">
              <Button variant="ghost" size="sm" onClick={fetchLogs} disabled={loadingLogs}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingLogs ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
            <div className="bg-black text-green-400 p-4 rounded-md font-mono text-xs h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500 italic">Nenhum log encontrado (ou falha ao carregar).</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="mb-4 border-b border-gray-800 pb-2">
                    <div className="flex justify-between text-gray-400 mb-1">
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                      <span className={log.status === 'ERROR' ? 'text-red-500' : 'text-blue-400'}>{log.status}</span>
                    </div>
                    {log.error && <div className="text-red-500 mb-1">Error: {log.error}</div>}
                    <pre className="whitespace-pre-wrap break-all">{JSON.stringify(log.payload, null, 2)}</pre>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

