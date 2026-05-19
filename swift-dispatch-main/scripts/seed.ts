/**
 * Popula o banco PostgreSQL local com tenant, usuário demo, pedidos e entregadores.
 * Uso: npm run db:seed
 */
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://delivery:delivery@localhost:5432/delivery_os";

const DISTRICTS = ["Pinheiros", "Vila Madalena", "Itaim Bibi", "Moema", "Jardins"];
const CUSTOMERS = [
  { name: "Ana Silva", phone: "+5511987654321" },
  { name: "Bruno Melo", phone: "+5511976543210" },
  { name: "Carla Rocha", phone: "+5511965432109" },
  { name: "Diego Farias", phone: "+5511954321098" },
  { name: "Elisa Pires", phone: "+5511943210987" },
];

function randomCoord(i: number): [number, number] {
  const lat = -23.6 + (Math.sin(i * 4529.13) * 0.5 + 0.5) * 0.08;
  const lng = -46.7 + (Math.cos(i * 9871.43) * 0.5 + 0.5) * 0.1;
  return [lng, lat];
}

async function main() {
  const client = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(client, { schema });

  console.log("Limpando dados anteriores...");
  await db.delete(schema.orderEvents);
  await db.delete(schema.orders);
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
      name: "Delivery OS HQ",
      slug: "delivery-os-hq",
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

  await db.insert(schema.stores).values({
    tenantId: tenant.id,
    name: "Loja Pinheiros",
    address: "R. dos Pinheiros, 1000",
    lat: -23.5614,
    lng: -46.6558,
  });

  const driverNames = ["Tito", "Caio", "Rafa", "Leo", "Mari", "Bia", "Tati", "Vitor"];
  const statuses = ["disponivel", "em_rota", "pausado", "offline"] as const;
  const vehicles = ["moto", "bike", "carro"] as const;

  const driverRows = await db
    .insert(schema.drivers)
    .values(
      driverNames.map((name, i) => {
        const [lng, lat] = randomCoord(i + 10);
        const status = statuses[i % statuses.length];
        return {
          tenantId: tenant.id,
          userId: i === 0 ? user.id : undefined,
          name: `#E-${(i + 2).toString().padStart(2, "0")} ${name}`,
          status,
          vehicle: vehicles[i % vehicles.length],
          lat,
          lng,
          activeOrders: status === "em_rota" ? 1 + (i % 2) : 0,
          rating: "4.80",
        };
      }),
    )
    .returning();

  await db.insert(schema.userRoles).values({
    userId: user.id,
    tenantId: tenant.id,
    role: "driver",
  });

  const orderStatuses = [
    "novo",
    "em_preparo",
    "pronto",
    "aguardando_entregador",
    "em_rota_coleta",
    "retirado",
    "em_rota_entrega",
    "entregue",
  ] as const;

  for (let i = 0; i < 15; i++) {
    const customer = CUSTOMERS[i % CUSTOMERS.length];
    const district = DISTRICTS[i % DISTRICTS.length];
    const [lng, lat] = randomCoord(i);
    const status = orderStatuses[i % orderStatuses.length];
    const placedMinutesAgo = 5 + (i * 6) % 55;
    const placedAt = new Date(Date.now() - placedMinutesAgo * 60000);
    const priority =
      placedMinutesAgo > 35 ? "critica" : placedMinutesAgo > 26 ? "alta" : placedMinutesAgo > 15 ? "normal" : "baixa";

    let driverId: string | null = null;
    if (["em_rota_coleta", "retirado", "em_rota_entrega", "entregue"].includes(status)) {
      const routeDriver = driverRows.find((d) => d.status === "em_rota") ?? driverRows[0];
      driverId = routeDriver.id;
    }

    await db.insert(schema.orders).values({
      tenantId: tenant.id,
      code: `#${4820 + i}`,
      status,
      priority,
      customerName: customer.name,
      customerPhone: customer.phone,
      address: `${district}, R. das Palmeiras, ${120 + i * 28}`,
      lat,
      lng,
      itemsCount: 1 + (i % 4),
      totalAmount: String(+(35 + (i * 12.5) % 150).toFixed(2)),
      channel: i % 3 === 0 ? "iFood" : i % 2 === 0 ? "WhatsApp" : "App Próprio",
      slaMinutes: 40,
      placedAt,
      driverId,
    });
  }

  await db.insert(schema.alerts).values([
    {
      tenantId: tenant.id,
      level: "crit",
      title: "SLA estourado · #4831",
      detail: "Moema · entregador parado há 6 min",
    },
    {
      tenantId: tenant.id,
      level: "high",
      title: "Gargalo na cozinha",
      detail: "8 pedidos aguardando produção há +15 min",
    },
    {
      tenantId: tenant.id,
      level: "med",
      title: "Pico de pedidos previsto",
      detail: "IA estima +30% nos próximos 20 min",
    },
  ]);

  console.log("\n✓ Seed concluído");
  console.log("  Email: operador@deliveryos.com.br");
  console.log("  Senha: demo1234");
  console.log(`  Tenant: ${tenant.name} (${tenant.id})\n`);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
