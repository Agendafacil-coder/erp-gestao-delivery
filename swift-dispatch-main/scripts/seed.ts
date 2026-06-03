/**
 * Bootstrap do PostgreSQL local: tenant, usuários de dev e cardápio demo.
 * Uso: npm run db:seed
 */
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import fs from "fs";
import path from "path";

try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, "utf-8");
    envFile.split("\n").forEach((line) => {
      const parts = line.split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
        if (key) process.env[key] = value;
      }
    });
  }
} catch (e) {
  console.warn("Could not load .env file:", e);
}

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://delivery:delivery@localhost:5432/delivery_os";

async function main() {
  const client = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(client, { schema });

  console.log("Limpando dados anteriores...");
  const safe = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch {
      /* tabela pode não existir antes da migration */
    }
  };
  await db.delete(schema.orderLineItems);
  await db.delete(schema.payments);
  await db.delete(schema.orderEvents);
  await db.delete(schema.orders);
  await safe(() => db.delete(schema.menuItemAddons));
  await safe(() => db.delete(schema.menuItemVariations));
  await db.delete(schema.menuItems);
  await db.delete(schema.menuCategories);
  await safe(() => db.delete(schema.tenantMenuSettings));
  await db.delete(schema.alerts);
  await db.delete(schema.drivers);
  await db.delete(schema.userRoles);
  await db.delete(schema.stores);
  await db.delete(schema.profiles);
  await db.delete(schema.sessions);
  await db.delete(schema.tenants);
  await db.delete(schema.users);

  const passwordHash = await bcrypt.hash("demo1234", 10);

  const [user] = await db
    .insert(schema.users)
    .values({
      email: "operador@deliveryos.com.br",
      passwordHash,
      fullName: "Guilherme Santos",
    })
    .returning();

  const [tenant] = await db
    .insert(schema.tenants)
    .values({
      name: "Burger House",
      slug: "minha-operacao",
      plan: "pro",
    })
    .returning();

  await db.insert(schema.profiles).values({
    id: user.id,
    fullName: user.fullName,
    currentTenantId: tenant.id,
  });

  await db.insert(schema.userRoles).values({
    userId: user.id,
    tenantId: tenant.id,
    role: "owner",
  });

  const [kitchenUser] = await db
    .insert(schema.users)
    .values({
      email: "cozinha@deliveryos.com.br",
      passwordHash,
      fullName: "Maria Cozinha",
    })
    .returning();

  await db.insert(schema.profiles).values({
    id: kitchenUser.id,
    fullName: kitchenUser.fullName,
    currentTenantId: tenant.id,
  });
  await db.insert(schema.userRoles).values({
    userId: kitchenUser.id,
    tenantId: tenant.id,
    role: "kitchen",
  });

  const [driverUser] = await db
    .insert(schema.users)
    .values({
      email: "entregador@deliveryos.com.br",
      passwordHash,
      fullName: "João Entregador",
    })
    .returning();

  await db.insert(schema.profiles).values({
    id: driverUser.id,
    fullName: driverUser.fullName,
    currentTenantId: tenant.id,
  });

  await db.insert(schema.userRoles).values({
    userId: driverUser.id,
    tenantId: tenant.id,
    role: "driver",
  });

  await db.insert(schema.drivers).values({
    tenantId: tenant.id,
    userId: driverUser.id,
    name: "João Entregador",
    status: "disponivel",
    vehicle: "moto",
    lat: -23.5614,
    lng: -46.6558,
    activeOrders: 0,
    rating: "5.00",
  });

  await db.insert(schema.stores).values({
    tenantId: tenant.id,
    name: "Loja principal",
    address: "Av. Paulista, 1000 — Bela Vista, São Paulo",
    lat: -23.5614,
    lng: -46.6558,
  });

  await db.insert(schema.tenantMenuSettings).values({
    tenantId: tenant.id,
    minOrderAmount: "25.00",
    pickupEnabled: true,
    deliveryEnabled: true,
    defaultDeliveryFee: "6.90",
    storeAddress: "Av. Paulista, 1000 — Retirada no balcão",
    neighborhoodFees: JSON.stringify([
      { name: "Centro", fee: 5.9 },
      { name: "Jardins", fee: 7.9 },
      { name: "Pinheiros", fee: 9.9 },
    ]),
    coupons: JSON.stringify([
      { code: "BEMVINDO", label: "10% de boas-vindas", type: "percent", value: 10 },
      { code: "FRETE", label: "R$ 5 off na entrega", type: "fixed", value: 5, min_subtotal: 40 },
    ]),
  });

  const [catLanches] = await db
    .insert(schema.menuCategories)
    .values({ tenantId: tenant.id, name: "Lanches", sortOrder: 0 })
    .returning();

  const [catCombos] = await db
    .insert(schema.menuCategories)
    .values({ tenantId: tenant.id, name: "Combos", sortOrder: 1 })
    .returning();

  const [catBebidas] = await db
    .insert(schema.menuCategories)
    .values({ tenantId: tenant.id, name: "Bebidas", sortOrder: 2 })
    .returning();

  const [burger] = await db
    .insert(schema.menuItems)
    .values({
      tenantId: tenant.id,
      categoryId: catLanches.id,
      name: "Hambúrguer Premium",
      description: "Blend Angus 180g, queijo cheddar e molho especial",
      price: "32.90",
      available: true,
      sortOrder: 0,
      isFeatured: true,
      salesCount: 128,
    })
    .returning();

  const [batata] = await db
    .insert(schema.menuItems)
    .values({
      tenantId: tenant.id,
      categoryId: catLanches.id,
      name: "Batata Frita Rústica",
      description: "Porção crocante com alecrim",
      price: "18.90",
      available: true,
      sortOrder: 1,
      isFeatured: true,
      salesCount: 86,
    })
    .returning();

  const [combo] = await db
    .insert(schema.menuItems)
    .values({
      tenantId: tenant.id,
      categoryId: catCombos.id,
      name: "Combo Burger + Batata + Refri",
      description: "Hambúrguer premium, batata média e refrigerante 350ml",
      price: "49.90",
      available: true,
      sortOrder: 0,
      isCombo: true,
      isFeatured: true,
      salesCount: 210,
    })
    .returning();

  await db.insert(schema.menuItems).values([
    {
      tenantId: tenant.id,
      categoryId: catBebidas.id,
      name: "Refrigerante Lata",
      description: "Coca, Guaraná ou Zero",
      price: "7.90",
      sortOrder: 0,
      isDrink: true,
      salesCount: 95,
    },
    {
      tenantId: tenant.id,
      categoryId: catBebidas.id,
      name: "Suco Natural 500ml",
      description: "Laranja, limão ou abacaxi",
      price: "12.90",
      sortOrder: 1,
      isDrink: true,
      salesCount: 42,
    },
  ]);

  await db.insert(schema.menuItemVariations).values([
    { menuItemId: burger.id, name: "Simples", price: "32.90", sortOrder: 0 },
    { menuItemId: burger.id, name: "Duplo", price: "42.90", sortOrder: 1 },
    { menuItemId: burger.id, name: "Triplo", price: "52.90", sortOrder: 2 },
  ]);

  await db.insert(schema.menuItemAddons).values([
    {
      menuItemId: burger.id,
      name: "Bacon crocante",
      price: "6.00",
      groupName: "Adicionais",
      isSuggested: true,
      sortOrder: 0,
    },
    {
      menuItemId: burger.id,
      name: "Queijo extra",
      price: "4.00",
      groupName: "Adicionais",
      isSuggested: true,
      sortOrder: 1,
    },
    {
      menuItemId: burger.id,
      name: "Ovo",
      price: "3.00",
      groupName: "Adicionais",
      sortOrder: 2,
    },
    {
      menuItemId: batata.id,
      name: "Cheddar e bacon",
      price: "8.00",
      groupName: "Adicionais",
      isSuggested: true,
      sortOrder: 0,
    },
    {
      menuItemId: combo.id,
      name: "Trocar por suco",
      price: "5.00",
      groupName: "Personalize",
      sortOrder: 0,
    },
  ]);

  console.log("\n✓ Bootstrap concluído");
  console.log("  Administrador: operador@deliveryos.com.br / demo1234");
  console.log("  Cozinha: cozinha@deliveryos.com.br / demo1234");
  console.log(`  Cardápio público: http://localhost:3000/${tenant.slug}`);
  console.log(`  Cupons demo: BEMVINDO, FRETE\n`);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
