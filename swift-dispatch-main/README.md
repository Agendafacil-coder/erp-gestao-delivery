# Delivery OS

Sistema de gestão para delivery — donos, colaboradores, entregadores e clientes.

## Stack

- **Frontend:** React 19 + TanStack Start/Router
- **Banco:** PostgreSQL local (Drizzle ORM)
- **Auth:** Sessão própria (cookie httpOnly)

## Setup rápido

### 1. PostgreSQL (Docker)

```bash
docker compose up -d
```

### 2. Variáveis de ambiente

```bash
cp .env.example .env
```

### 3. Dependências e banco

```bash
npm install
npm run db:push
npm run db:seed
```

### 4. Rodar o app

```bash
npm run dev
```

Acesse `http://localhost:3000` (ou a porta exibida no terminal).

### Login demo

| Campo | Valor |
|-------|-------|
| Email | `operador@deliveryos.com.br` |
| Senha | `demo1234` |

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run db:push` | Aplica schema no Postgres |
| `npm run db:seed` | Dados demo (pedidos, entregadores) |
| `npm run db:setup` | Docker + push + seed |
| `npm run db:studio` | UI do Drizzle Studio |

## Modo demo offline

Sem Postgres, use localStorage:

```env
VITE_USE_LOCAL_STORAGE=true
```

## Papéis (menu filtrado)

| Papel | Telas principais |
|-------|------------------|
| owner / admin | Todas |
| dispatcher | Central, kanban, mapa, KDS, entregador |
| kitchen | KDS |
| driver | PWA entregador |
| viewer | Leitura (central, analytics) |

## Mapbox (mapa live)

Adicione no `.env`:

```env
VITE_MAPBOX_TOKEN=pk.seu_token
```

## Rastreio do cliente (público)

Link gerado automaticamente por pedido:

`/rastreio/{orderId}/{trackingToken}`

Copie o link na coluna **Rastreio** da tabela de pedidos na Central.

## Tempo real

Com PostgreSQL, a central usa **SSE** (`/api/ops/stream`) em vez de polling — atualização a cada ~3s.

## GPS entregador

No PWA Entregador, ao ficar **Online**, o app envia coordenadas a cada 15s via `navigator.geolocation`.

## Integrações

### WhatsApp
Disparos automáticos nos eventos de pedido. Configure `WHATSAPP_*` no `.env` (Evolution API) ou use modo demo (só logs).

### Webhooks inbound

| Serviço | URL | Notas |
|---------|-----|-------|
| Pagamentos (PSP) | `POST /api/payments/webhook` | `PAYMENT_PROVIDER=mercadopago\|stripe\|asaas` |
| iFood | `POST /api/integrations/ifood/webhook` | Header `x-ifood-merchant-id` |
| Pagamento demo | `POST /api/payments/confirm-mock` | Dev: `{ orderId, token }` |

URLs completas aparecem em **WhatsApp → Conexão API** (logado).

### iFood (demo)
Após `npm run db:seed`, merchant demo: `demo-merchant-burger-house`. Configure em **Automações → Integração iFood**.

**OAuth (produção)** — credenciais por tenant no painel:
- **App centralizado:** Client ID + Secret → botão *App centralizado* (`client_credentials`)
- **App distribuído:** gerar *userCode* → lojista autoriza no Portal → informar *authorization code*
- Tokens renovados automaticamente via `refresh_token` (expira ~6h)

**Polling (API Events)** — alternativa/complemento ao webhook:
- Ative OAuth + *Polling automático* no painel (intervalo 30s enquanto o ops estiver aberto)
- Botão *Poll agora* para buscar eventos manualmente
- Eventos `PLC` criam pedido; `CAN` cancela; `CON` finaliza como entregue
- Status do último poll visível no painel

Teste webhook:

```bash
curl -X POST http://localhost:3000/api/integrations/ifood/webhook \
  -H "Content-Type: application/json" \
  -H "x-ifood-merchant-id: demo-merchant-burger-house" \
  -d "{\"code\":\"PLC\",\"orderId\":\"ifood-test-001\",\"customer\":{\"name\":\"Cliente iFood\",\"phone\":\"11999998888\"},\"delivery\":{\"deliveryAddress\":{\"formattedAddress\":\"Rua Teste, 10, Pinheiros\"}},\"total\":{\"orderAmount\":45.90},\"items\":[{\"name\":\"Burger\",\"quantity\":1,\"unitPrice\":45.90}]}"
```

## Cron iFood (server-side)

Sem browser aberto, use o agendador do SO ou um serviço externo:

```bash
# CLI local (Task Scheduler / cron a cada 30s–60s)
npm run ifood:poll
```

Ou HTTP (configure `IFOOD_CRON_SECRET` no `.env`):

```bash
curl -X POST http://localhost:3000/api/cron/ifood-poll \
  -H "x-cron-secret: SEU_SECRET"
```

## Push notifications (entregador)

Configure VAPID no `.env` (`npx web-push generate-vapid-keys`). O PWA em `/entregador` pede permissão ao ficar **Online** e recebe alerta quando um pedido é atribuído.

Ícones PNG (192/512) para instalação no celular: `npm run icons:generate` (gera `public/icons/`).

## Pagamentos online (checkout público)

No `.env`, escolha o provedor:

| `PAYMENT_PROVIDER` | Pix | Cartão | Variáveis |
|--------------------|-----|--------|-----------|
| `mock` | Sim (dev) | Sim (dev) | — |
| `mercadopago` | Sim | Checkout MP | `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET` |
| `stripe` | Sim (BRL) | Checkout Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| `asaas` | Sim | Link fatura | `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` (sandbox: `ASAAS_SANDBOX=true`) |

Webhook único: `POST /api/payments/webhook` (URL pública em `PUBLIC_APP_URL`).

## Próximos passos

**Já disponível:** histórico de trajeto do entregador (`driver_locations`) — linha verde no mapa de rastreio público.
