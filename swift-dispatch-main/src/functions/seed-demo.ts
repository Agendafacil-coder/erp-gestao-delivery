import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { assertCanSeedDemo } from "@/lib/rbac";
import { requireSessionUser } from "./session";

const DISTRICTS = ["Pinheiros", "Vila Madalena", "Itaim Bibi", "Moema", "Jardins"];
const NAMES = ["Ana Costa", "Bruno Lima", "Carla Souza", "Diego Reis", "Eduarda Pires"];

export const seedDemoOrdersFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<number> => {
    const user = await requireSessionUser();
    const db = getDb();

    const [role] = await db
      .select()
      .from(schema.userRoles)
      .where(
        and(
          eq(schema.userRoles.userId, user.id),
          eq(schema.userRoles.tenantId, data.tenantId),
        ),
      )
      .limit(1);

    if (!role) throw new Error("Sem permissão para este tenant");
    assertCanSeedDemo(user, data.tenantId);

    const statuses = [
      "novo",
      "em_preparo",
      "aguardando_entregador",
      "em_rota_entrega",
    ] as const;

    let count = 0;
    for (let i = 0; i < 12; i++) {
      await db.insert(schema.orders).values({
        tenantId: data.tenantId,
        storeId: null,
        driverId: null,
        code: `#${5100 + i}`,
        status: statuses[i % statuses.length],
        priority: i % 4 === 0 ? "alta" : "normal",
        customerName: NAMES[i % NAMES.length],
        customerPhone: `11 9${1000 + i * 111}`,
        address: `${DISTRICTS[i % DISTRICTS.length]}, R. Exemplo ${100 + i}`,
        lat: null,
        lng: null,
        itemsCount: 1 + (i % 3),
        subtotalAmount: String(35 + i * 8.5),
        deliveryFee: "0",
        discountAmount: "0",
        totalAmount: String(35 + i * 8.5),
        paymentMethod: null,
        fulfillmentType: "delivery",
        couponCode: null,
        neighborhood: DISTRICTS[i % DISTRICTS.length],
        channel: ["ifood", "whatsapp", "site"][i % 3],
        notes: null,
        slaMinutes: 40,
        paymentStatus: "pendente",
        placedAt: new Date(Date.now() - i * 5 * 60000),
      });
      count++;
    }

    return count;
  });
