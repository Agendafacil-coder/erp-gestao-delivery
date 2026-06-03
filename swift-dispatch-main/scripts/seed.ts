/**
 * Bootstrap do PostgreSQL local: tenant, usuários de dev e cardápio vazio de pedidos.
 * Uso: npm run db:seed
 */
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import fs from "fs";
import path from "path";

// Load .env file manually
try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, "utf-8");
    envFile.split("\n").forEach((line) => {
      const parts = line.split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
        if (key) {
          process.env[key] = value;
        }
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
  await db.delete(schema.orderLineItems);
  await db.delete(schema.payments);
  await db.delete(schema.orderEvents);
  await db.delete(schema.orders);
  await db.delete(schema.menuItems);
  await db.delete(schema.menuCategories);
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
      name: "Minha operação",
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

  const [catBurgers] = await db
    .insert(schema.menuCategories)
    .values({ tenantId: tenant.id, name: "Lanches", sortOrder: 0 })
    .returning();

  const [catBebidas] = await db
    .insert(schema.menuCategories)
    .values({ tenantId: tenant.id, name: "Bebidas", sortOrder: 1 })
    .returning();

  const menuSeed = [
    { cat: catBurgers.id, name: "Hambúrguer Premium", desc: "Blend Angus 180g", price: "42.90" },
    { cat: catBurgers.id, name: "Batata Frita Rústica", desc: "Porção crocante", price: "18.90" },
    { cat: catBebidas.id, name: "Refrigerante Lata", desc: "Zero açúcar", price: "7.90" },
  ];

  const menuItemRows = await db
    .insert(schema.menuItems)
    .values(
      menuSeed.map((m, i) => ({
        tenantId: tenant.id,
        categoryId: m.cat,
        name: m.name,
        description: m.desc,
        price: m.price,
        sortOrder: i,
      })),
    )
    .returning();

  await db.insert(schema.stores).values({
    tenantId: tenant.id,
    name: "Loja principal",
    address: "",
    lat: -23.5614,
    lng: -46.6558,
  });

  console.log("\n✓ Bootstrap concluído (sem pedidos nem entregadores de exemplo)");
  console.log("  Administrador: operador@deliveryos.com.br / demo1234");
  console.log("  Cozinha: cozinha@deliveryos.com.br / demo1234");
  console.log("  Entregador: entregador@deliveryos.com.br / demo1234");
  console.log(`  Cardápio: /${tenant.slug}`);
  console.log(`  Tenant: ${tenant.name} (${tenant.id})\n`);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
