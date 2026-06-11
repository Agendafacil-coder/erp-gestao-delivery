import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import { getSessionUserFromRequest } from "@/functions/session";

export async function handleOrderLineItemsRequest(
  request: Request,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/api/orders/line-items") return null;

  const orderId = url.searchParams.get("orderId");
  const tenantId = url.searchParams.get("tenantId");
  if (!orderId || !tenantId) {
    return new Response("orderId e tenantId obrigatórios", { status: 400 });
  }

  const user = await getSessionUserFromRequest(request);
  if (!user) return new Response("Não autenticado", { status: 401 });

  const hasAccess = user.roles.some((r) => r.tenant_id === tenantId);
  if (!hasAccess) return new Response("Sem permissão", { status: 403 });

  const db = getDb();
  const rows = await db
    .select()
    .from(schema.orderLineItems)
    .where(eq(schema.orderLineItems.orderId, orderId));

  return new Response(
    JSON.stringify(
      rows.map((r) => ({
        name: r.name,
        quantity: r.quantity,
        unit_price: Number(r.unitPrice),
        notes: r.notes,
      })),
    ),
    { headers: { "Content-Type": "application/json" } },
  );
}
