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

## Próximos passos

- Integrações (WhatsApp, iFood)
- Push notifications
- Pagamento PIX real (Mercado Pago / Asaas)

**Já disponível:** histórico de trajeto do entregador (`driver_locations`) — linha verde no mapa de rastreio público.
