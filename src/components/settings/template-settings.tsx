"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

export function TemplateSettings() {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    defaultImageUrl: '',
    templateName: 'paymentswa',
    templateLanguage: 'pt_BR',
  })

  useEffect(() => {
    if (session?.user?.id) {
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
          setFormData({
            defaultImageUrl: data.defaultImageUrl || '',
            templateName: data.templateName || 'paymentswa',
            templateLanguage: data.templateLanguage || 'pt_BR',
          })
        })
        .catch(console.error)
    }
  }, [session])

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/settings/template', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('Erro ao salvar configurações')
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
        <CardTitle>Template & Aparência</CardTitle>
        <CardDescription>
          Configure a aparência padrão das suas cobranças
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="defaultImageUrl">URL da Imagem Padrão</Label>
          <Input
            id="defaultImageUrl"
            placeholder="https://exemplo.com/imagem.jpg"
            type="url"
            value={formData.defaultImageUrl}
            onChange={(e) => setFormData({ ...formData, defaultImageUrl: e.target.value })}
          />
          <p className="text-sm text-muted-foreground">
            Imagem que será usada quando nenhuma imagem específica for fornecida na cobrança
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="templateName">Nome do Template</Label>
          <Input
            id="templateName"
            placeholder="paymentswa"
            value={formData.templateName}
            onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
            disabled
          />
          <p className="text-sm text-muted-foreground">
            Nome do template aprovado na Meta (padrão: paymentswa)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="templateLanguage">Idioma do Template</Label>
          <Input
            id="templateLanguage"
            placeholder="pt_BR"
            value={formData.templateLanguage}
            onChange={(e) => setFormData({ ...formData, templateLanguage: e.target.value })}
            disabled
          />
          <p className="text-sm text-muted-foreground">
            Idioma do template (padrão: pt_BR)
          </p>
        </div>

        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </CardContent>
    </Card>
  )
}

