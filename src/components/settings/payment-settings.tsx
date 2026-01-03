"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select-enhanced'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export function PaymentSettings() {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [pixData, setPixData] = useState({
    merchantName: '',
    pixKeyType: 'EVP',
    pixKey: '',
  })
  const [mpData, setMpData] = useState({
    mercadoPagoToken: '',
    mercadoPagoPublicKey: '',
  })
  const [isTestingMP, setIsTestingMP] = useState(false)
  const [mpConnectionStatus, setMpConnectionStatus] = useState<'success' | 'error' | null>(null)

  useEffect(() => {
    if (session?.user?.id) {
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
          setPixData({
            merchantName: data.merchantName || '',
            pixKeyType: data.pixKeyType || 'EVP',
            pixKey: data.pixKey || '',
          })
          setMpData({
            mercadoPagoToken: data.mercadoPagoToken || '',
            mercadoPagoPublicKey: data.mercadoPagoPublicKey || '',
          })
        })
        .catch(console.error)
    }
  }, [session])

  const handleSavePix = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/settings/payment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'pix',
          ...pixData,
        }),
      })

      if (!response.ok) throw new Error('Erro ao salvar PIX')
      alert('Configurações PIX salvas com sucesso!')
    } catch (error) {
      alert('Erro ao salvar configurações PIX')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestMercadoPago = async () => {
    if (!mpData.mercadoPagoToken) {
      setMpConnectionStatus('error')
      return
    }

    setIsTestingMP(true)
    setMpConnectionStatus(null)

    try {
      const response = await fetch('/api/settings/test-mercado-pago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: mpData.mercadoPagoToken,
        }),
      })

      const result = await response.json()
      setMpConnectionStatus(result.success ? 'success' : 'error')
    } catch (error) {
      setMpConnectionStatus('error')
    } finally {
      setIsTestingMP(false)
    }
  }

  const handleSaveMercadoPago = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/settings/payment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'mercado_pago',
          ...mpData,
        }),
      })

      if (!response.ok) throw new Error('Erro ao salvar Mercado Pago')
      alert('Configurações Mercado Pago salvas com sucesso!')
    } catch (error) {
      alert('Erro ao salvar configurações Mercado Pago')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* PIX Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações PIX</CardTitle>
          <CardDescription>
            Configure sua chave PIX para receber pagamentos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="merchantName">Nome do Comerciante</Label>
            <Input
              id="merchantName"
              placeholder="Sua Empresa LTDA"
              value={pixData.merchantName}
              onChange={(e) => setPixData({ ...pixData, merchantName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pixKeyType">Tipo de Chave PIX</Label>
            <Select
              value={pixData.pixKeyType}
              onValueChange={(value) => setPixData({ ...pixData, pixKeyType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EVP">Chave Aleatória (EVP)</SelectItem>
                <SelectItem value="CPF">CPF</SelectItem>
                <SelectItem value="CNPJ">CNPJ</SelectItem>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="PHONE">Telefone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pixKey">Chave PIX</Label>
            <Input
              id="pixKey"
              placeholder="aa8ea3a7-a67f-44c1-b829-48aef4592860"
              value={pixData.pixKey}
              onChange={(e) => setPixData({ ...pixData, pixKey: e.target.value })}
            />
          </div>

          <Button onClick={handleSavePix} disabled={isLoading}>
            {isLoading ? 'Salvando...' : 'Salvar PIX'}
          </Button>
        </CardContent>
      </Card>

      {/* Mercado Pago Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Mercado Pago (Cartão de Crédito)</CardTitle>
          <CardDescription>
            Configure suas credenciais do Mercado Pago para aceitar cartão
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mpAccessToken">Access Token</Label>
            <Input
              id="mpAccessToken"
              placeholder="APP_USR-..."
              type="password"
              value={mpData.mercadoPagoToken}
              onChange={(e) => setMpData({ ...mpData, mercadoPagoToken: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mpPublicKey">Public Key (opcional)</Label>
            <Input
              id="mpPublicKey"
              placeholder="APP_USR-..."
              value={mpData.mercadoPagoPublicKey}
              onChange={(e) => setMpData({ ...mpData, mercadoPagoPublicKey: e.target.value })}
            />
            <p className="text-sm text-muted-foreground">
              Public Key é opcional, usado apenas para integrações no frontend
            </p>
          </div>

          {mpConnectionStatus === 'success' && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Conexão estabelecida com sucesso!
              </AlertDescription>
            </Alert>
          )}

          {mpConnectionStatus === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Falha na conexão. Verifique seu Access Token.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleTestMercadoPago}
              disabled={isTestingMP || isLoading}
            >
              {isTestingMP ? 'Testando...' : 'Testar Conexão'}
            </Button>
            <Button onClick={handleSaveMercadoPago} disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar Mercado Pago'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

