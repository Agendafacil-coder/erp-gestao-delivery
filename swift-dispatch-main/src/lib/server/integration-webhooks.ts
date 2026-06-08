import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import {
  processIfoodWebhook,
  resolveIfoodTenant,
  verifyIfoodSignature,
} from "@/lib/integrations/ifood/processEvent";
import type { IfoodWebhookPayload } from "@/lib/integrations/ifood/types";

export async function handleIntegrationWebhookRequest(
  request: Request,
): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname !== "/api/integrations/ifood/webhook") return null;

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await request.text();
  let payload: IfoodWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as IfoodWebhookPayload;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const merchantId =
    request.headers.get("x-ifood-merchant-id") ??
    url.searchParams.get("merchantId") ??
    payload.merchantId ??
    null;

  const tenantId = await resolveIfoodTenant(merchantId);
  if (!tenantId) {
    return new Response("Merchant não configurado ou integração desativada", { status: 404 });
  }

  const db = getDb();
  const [config] = await db
    .select()
    .from(schema.ifoodTenantConfig)
    .where(eq(schema.ifoodTenantConfig.tenantId, tenantId))
    .limit(1);

  const signature = request.headers.get("x-ifood-signature");
  if (!verifyIfoodSignature(rawBody, signature, config?.webhookSecret ?? null)) {
    return new Response("Assinatura inválida", { status: 401 });
  }

  try {
    const result = await processIfoodWebhook({ tenantId, payload });
    return new Response(
      JSON.stringify({ ok: true, order_id: result.orderId, event_id: result.eventId }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
