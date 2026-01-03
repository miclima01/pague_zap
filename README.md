# PagueZap

Sistema completo para agendamento e envio de cobranças via WhatsApp usando a API oficial da Meta.

## 🚀 Tecnologias

- **Next.js 14+** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **shadcn/ui** - Componentes UI
- **PostgreSQL** - Banco de dados
- **Prisma** - ORM
- **NextAuth.js** - Autenticação
- **Zod** - Validação de schemas
- **React Hook Form** - Gerenciamento de formulários

## 📋 Funcionalidades

### ✅ Implementado (Fase 1)

- ✅ Autenticação completa (login/registro)
- ✅ Dashboard com estatísticas
- ✅ CRUD completo de cobranças
- ✅ Sistema de agendamento:
  - Envio imediato
  - Agendamento para data específica
  - Cobranças recorrentes mensais
- ✅ Lista de cobranças com filtros e busca
- ✅ Visualização detalhada de cobranças
- ✅ Interface responsiva e moderna

### ✅ Implementado (Fase 2)

- ✅ Integração com WhatsApp Business API
- ✅ Configurações de credenciais WhatsApp
- ✅ Geração de QR Code PIX
- ✅ Configurações PIX e Mercado Pago
- ✅ Envio de cobranças via WhatsApp com template de pagamento
- ✅ Integração completa com Mercado Pago (criação de links de pagamento)
- ✅ Webhook do Mercado Pago para atualização de status
- ✅ Sistema de logs de API

### 🚧 Em desenvolvimento (Fase 3)

- 🔲 Processamento de cobranças agendadas (cron job)
- 🔲 Relatórios e gráficos
- 🔲 Notificações por email
- 🔲 Geração real de QR Code PIX (usando API de banco/gateway)
- 🔲 Melhorias no webhook (busca mais eficiente de cobranças)

## 🛠️ Instalação

### Pré-requisitos

- Node.js 18+ 
- PostgreSQL
- npm ou yarn

### Passos

1. Clone o repositório:
```bash
git clone <repository-url>
cd pague_zap
```

2. Instale as dependências:
```bash
npm install
```

3. Configure o banco de dados:
```bash
# Copie o arquivo .env.example para .env
cp .env.example .env

# Edite o .env e configure:
# - DATABASE_URL (conexão com PostgreSQL)
# - NEXTAUTH_SECRET (gere uma chave aleatória)
# - NEXTAUTH_URL (URL do aplicativo)
```

4. Execute as migrações do Prisma:
```bash
npx prisma generate
npx prisma db push
```

5. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

6. Acesse [http://localhost:3000](http://localhost:3000)

## 📁 Estrutura do Projeto

```
src/
├── app/
│   ├── (auth)/          # Rotas de autenticação
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/     # Rotas protegidas do dashboard
│   │   ├── layout.tsx
│   │   ├── page.tsx     # Dashboard principal
│   │   ├── charges/     # Gerenciamento de cobranças
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   └── [id]/
│   │   └── settings/
│   └── api/             # API Routes
│       ├── auth/
│       ├── charges/
│       ├── settings/
│       └── webhooks/
├── components/
│   ├── ui/              # Componentes shadcn/ui
│   ├── dashboard/       # Componentes do dashboard
│   └── charges/         # Componentes de cobranças
├── lib/
│   ├── prisma.ts              # Cliente Prisma
│   ├── whatsapp-service.ts    # Serviço WhatsApp Business API
│   ├── pix-service.ts         # Serviço PIX
│   ├── mercado-pago-service.ts # Serviço Mercado Pago
│   └── utils.ts               # Utilitários
└── types/               # Tipos TypeScript
```

## 🗄️ Schema do Banco de Dados

### User
- Informações do usuário
- Token do WhatsApp (opcional)

### Charge
- Dados do cliente
- Dados da cobrança (valor, descrição, vencimento)
- Agendamento (tipo, data, dia do mês)
- Status (Pendente, Agendada, Enviada, Paga, Falhou, Cancelada)
- Gateway de pagamento

## 🔐 Autenticação

O sistema usa NextAuth.js com provider de credenciais. As senhas são hasheadas com bcryptjs.

## 📝 Scripts Disponíveis

- `npm run dev` - Inicia servidor de desenvolvimento
- `npm run build` - Build para produção
- `npm run start` - Inicia servidor de produção
- `npm run lint` - Executa linter
- `npm run db:push` - Sincroniza schema com banco
- `npm run db:studio` - Abre Prisma Studio
- `npm run db:generate` - Gera cliente Prisma

## 🚀 Deploy

### Vercel (Recomendado)

1. Faça push do código para GitHub
2. Importe o projeto na Vercel
3. Configure as variáveis de ambiente
4. Configure o banco de dados PostgreSQL (Vercel Postgres ou externo)
5. Deploy automático

### Variáveis de Ambiente Necessárias

```env
DATABASE_URL=postgresql://...
NEXTAUTH_URL=https://seu-dominio.vercel.app
NEXTAUTH_SECRET=sua-chave-secreta
```

## 📄 Licença

Este projeto está sob a licença MIT.

## 👨‍💻 Desenvolvimento

Este projeto foi desenvolvido como parte de um sistema completo de cobranças via WhatsApp. A Fase 1 inclui toda a estrutura base, autenticação e CRUD de cobranças. A Fase 2 incluirá as integrações com WhatsApp e gateways de pagamento.

