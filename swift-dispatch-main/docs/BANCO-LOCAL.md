# Banco de dados local — testes

O ERP usa o banco **`delivery_os`** (não confundir com outros bancos no pgAdmin).

## Conexão no pgAdmin

| Campo | Valor |
|--------|--------|
| Host | `localhost` |
| Porta | `5432` |
| Banco | `delivery_os` |
| Usuário | o definido no seu `.env` (ex.: `delivery` ou `postgres`) |

## Arquivo `.env`

Na pasta `swift-dispatch-main`, copie o exemplo se ainda não tiver `.env`:

```bash
cp .env.example .env
```

Edite `DATABASE_URL` conforme seu PostgreSQL:

```env
DATABASE_URL=postgresql://USUARIO:SENHA@localhost:5432/delivery_os
```

**Senha com caracteres especiais:** codifique na URL (`@` → `%40`, `#` → `%23`).

## Comandos (na pasta swift-dispatch-main)

```bash
# 1. Criar/atualizar tabelas (migrations SQL, sem prompt interativo)
npm run db:migrate

# 2. Dados de demonstração (usuários, cardápio, pedidos)
npm run db:seed

# 3. Subir o app
npm run dev
```

## Docker (alternativa ao PostgreSQL 18 nativo)

```bash
docker compose up -d
npm run db:migrate
npm run db:seed
```

Usuário/senha do container: `delivery` / `delivery`, banco `delivery_os`.

## Acessos de teste (após seed)

| Uso | Valor |
|-----|--------|
| Login ERP | `operador@deliveryos.com.br` / `demo1234` |
| Cozinha (KDS) | `cozinha@deliveryos.com.br` / `demo1234` |
| Cardápio público | `http://localhost:8081/delivery-os-hq` |

A porta do Vite pode ser **8080** ou **8081** — veja no terminal ao rodar `npm run dev`.

## Verificar se está conectado

```bash
npm run db:push
```

Se aparecer `No changes detected` ou `changes applied`, a conexão está OK.
