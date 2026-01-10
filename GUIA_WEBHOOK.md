# Guia de Configuração do Webhook WhatsApp

Este guia explica como preencher os campos na tela de configuração do WhatsApp Business API (Meta) que você enviou.

## 1. Pré-requisitos
Antes de configurar na Meta, você precisa definir sua "senha" (Verify Token) no seu próprio sistema PagueZap.

1. Acesse seu painel **PagueZap** (na Vercel ou localhost).
2. Vá em **Configurações** (Settings).
3. Na aba **WhatsApp Business**, procure o campo **Webhook Verify Token**.
4. Digite uma senha segura de sua escolha.
   *   *Exemplo:* `paguezap_segredo_2026`
5. **Salve** as configurações.

---

## 2. Preenchendo no Painel da Meta (Sua imagem)

Agora, volte para a tela da Meta (a da imagem que você mandou) e preencha assim:

### Campo: URL de callback
Esta é a URL onde a Meta vai "bater" para entregar as mensagens.
*   **Formato:** `https://seu-dominio-na-vercel.app/api/webhooks/whatsapp`
*   *Substitua `seu-dominio-na-vercel.app` pelo link real do seu deploy.*

### Campo: Verificar token
Esta é a "senha" que você acabou de criar no passo 1.
*   Digita exatamente a mesma senha.
*   *Exemplo:* `paguezap_segredo_2026`

---

## 3. Finalizando
1. Clique no botão azul **Verificar e salvar**.
   *   *Se der erro:* Verifique se você salvou no PagueZap primeiro e se a URL está correta (o site deve estar no ar).
2. Após salvar, vai aparecer uma lista de "Campos de Webhook" (Webhook Fields) logo abaixo.
3. Clique em **Gerenciar** (Manage) e assine (Subscribe) os seguintes eventos:
   *   `messages` (Para receber o texto das mensagens)
   *   `message_deliveries` (Para saber quando foi entregue/lido)

Pronto! Agora seu sistema já está ouvindo o WhatsApp.
