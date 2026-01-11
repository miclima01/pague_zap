"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

export default function CreateTemplateForm({ wabaId }: { wabaId: string }) {
    const [isLoading, setIsLoading] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    const { register, handleSubmit, watch, setValue } = useForm({
        defaultValues: {
            name: "",
            language: "pt_BR",
            body_text: "Olá {{1}}! Seu pedido de *{{2}}* foi gerado com sucesso.\n\nCopie o código pix abaixo e pague no app do seu banco.",
            body_examples: '[[\"Michael\", \"Produto Teste\"]]'
        }
    })



    const onSubmit = async (data: any) => {
        setIsLoading(true)
        setError(null)
        setResult(null)

        const formData = new FormData()
        formData.append("waba_id", wabaId)
        formData.append("name", data.name)
        formData.append("language", data.language)
        formData.append("body_text", data.body_text)
        formData.append("body_examples", data.body_examples)
        formData.append("use_order_details", "true")

        // Category is UTILITY if order details, else UTILITY default for now
        formData.append("category", "UTILITY")

        // Handle header image
        const fileInput = (document.getElementById("header_image_file") as HTMLInputElement)?.files?.[0]
        if (fileInput) {
            formData.append("header_image_file", fileInput)
        } else {
            setError("Please upload a header image")
            setIsLoading(false)
            return
        }

        try {
            // Call our own Next.js Proxy (which handles auth & creds)
            const response = await fetch("/api/templates/proxy", {
                method: "POST",
                body: formData,
            })

            const json = await response.json()

            if (!response.ok) {
                throw new Error(json.detail || "Failed to create template")
            }

            if (json.status === "error") {
                setResult(json)
                setError("Meta API returned an error")
            } else {
                setResult(json)
            }
        } catch (err: any) {
            console.error(err)
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Create WhatsApp Template</CardTitle>
                <CardDescription>New template with Image Header & Order Details</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                    <div className="space-y-2">
                        <Label htmlFor="name">Template Name</Label>
                        <Input id="name" {...register("name")} placeholder="order_update_v1" />
                        <p className="text-xs text-muted-foreground">Lowercase, numbers, underscores only.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="language">Language</Label>
                        <Input id="language" {...register("language")} />
                    </div>

                    <div className="space-y-2">
                        <Label>Header Image</Label>
                        <Label htmlFor="header_image_file" className="text-xs">Upload Header Image (JPG/PNG)</Label>
                        <Input id="header_image_file" type="file" accept="image/png, image/jpeg" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="body_text">Body Text</Label>
                        <Textarea id="body_text" {...register("body_text")} rows={4} />
                        <p className="text-xs text-muted-foreground">Use {"{{1}}"}, {"{{2}}"} for variables.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="body_examples">Body Examples (JSON)</Label>
                        <Input id="body_examples" {...register("body_examples")} />
                    </div>



                    {error && (
                        <Alert variant="destructive">
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {result && result.status === "success" && (
                        <Alert className="bg-green-50 text-green-900 border-green-200">
                            <AlertTitle>Success!</AlertTitle>
                            <AlertDescription>
                                Template ID: {result.data?.id}
                                <div className="mt-4">
                                    <Button size="sm" variant="outline" onClick={() => window.location.href = '/whatsapp-templates'}>
                                        Voltar para Lista
                                    </Button>
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}

                    {result && result.status === "error" && (
                        <div className="p-4 bg-red-50 text-red-900 rounded-md text-sm overflow-auto max-h-40">
                            <pre>{JSON.stringify(result.meta_error, null, 2)}</pre>
                        </div>
                    )}

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Template
                    </Button>

                </form>
            </CardContent>
        </Card>
    )
}
