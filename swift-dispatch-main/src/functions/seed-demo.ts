import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
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
      .where(eq(schema.userRoles.userId, user.id))
      .limit(1);

    if (!role) throw new Error("Sem permissão");

    const statuses = [
      "novo",
      "em_preparo",
      "pronto",
      "aguardando_entregador",
      "em_rota_coleta",
    ] as const;

    let count = 0;
    for (let i = 0; i < 12; i++) {
      await db.insert(schema.orders).values({
        tenantId: data.tenantId,
        code: `#${5100 + i}`,
        status: statuses[i % statuses.length],
        priority: i % 4 === 0 ? "alta" : "normal",
        customerName: NAMES[i % NAMES.length],
        customerPhone: `11 9${1000 + i * 111}`,
        address: `${DISTRICTS[i % DISTRICTS.length]}, R. Demo ${100 + i}`,
        itemsCount: 1 + (i % 3),
        totalAmount: String(35 + i * 8.5),
        channel: ["ifood", "whatsapp", "site"][i % 3],
        slaMinutes: 40,
        placedAt: new Date(Date.now() - i * 5 * 60000),
      });
      count++;
    }

    return count;
  });
