import { eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import { getMarketplaceAdapter } from "@/lib/integrations/aggregator/registry";
import {
  processIfoodWebhook,
  resolveIfoodTenant,
  verifyIfoodSignature,
} from "@/lib/integrations/ifood/processEvent";
import type { IfoodWebhookPayload } from "@/lib/integrations/ifood/types";
import {
  extractRappiOrderFromWebhook,
  extractRappiStoreId,
  resolveRappiTenant,
  verifyRappiSignature,
} from "@/lib/integrations/rappi/processOrder";
import type { RappiWebhookPayload } from "@/lib/integrations/rappi/types";
import {
  extractFood99EventFromWebhook,
  extractFood99MerchantId,
  resolveFood99Tenant,
  verifyFood99Signature,
} from "@/lib/integrations/food99/processOrder";
import type { Food99WebhookPayload } from "@/lib/integrations/food99/types";

async function handleIfoodWebhook(request: Request, url: URL): Promise<Response> {
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

async function handleRappiWebhook(request: Request, url: URL): Promise<Response> {
  const rawBody = await request.text();
  let payload: RappiWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as RappiWebhookPayload;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const order = extractRappiOrderFromWebhook(payload);
  const storeId =
    request.headers.get("x-rappi-store-id") ??
    url.searchParams.get("storeId") ??
    extractRappiStoreId(payload, order);

  const tenantId = await resolveRappiTenant(storeId);
  if (!tenantId) {
    return new Response("Loja Rappi não configurada ou integração desativada", { status: 404 });
  }

  const db = getDb();
  const [config] = await db
    .select()
    .from(schema.rappiTenantConfig)
    .where(eq(schema.rappiTenantConfig.tenantId, tenantId))
    .limit(1);

  const signature =
    request.headers.get("rappi-signature") ?? request.headers.get("Rappi-Signature");
  if (!verifyRappiSignature(rawBody, signature, config?.webhookSecret ?? null)) {
    return new Response("Assinatura inválida", { status: 401 });
  }

  if (!order) {
    return new Response(JSON.stringify({ ok: true, ignored: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const adapter = getMarketplaceAdapter("rappi");
    if (!adapter) throw new Error("Adapter Rappi indisponível");

    const result = await adapter.processInbound({
      tenantId,
      payload,
      source: "webhook",
    });

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

async function handleFood99Webhook(request: Request, url: URL): Promise<Response> {
  const rawBody = await request.text();
  let payload: Food99WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as Food99WebhookPayload;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const event = extractFood99EventFromWebhook(payload);
  const merchantId =
    request.headers.get("x-99food-merchant-id") ??
    request.headers.get("x-merchant-id") ??
    url.searchParams.get("merchantId") ??
    extractFood99MerchantId(payload, event);

  const tenantId = await resolveFood99Tenant(merchantId);
  if (!tenantId) {
    return new Response("Loja 99Food não configurada ou integração desativada", { status: 404 });
  }

  const db = getDb();
  const [config] = await db
    .select()
    .from(schema.food99TenantConfig)
    .where(eq(schema.food99TenantConfig.tenantId, tenantId))
    .limit(1);

  const signature =
    request.headers.get("x-99food-signature") ??
    request.headers.get("99food-signature") ??
    request.headers.get("x-signature");
  if (!verifyFood99Signature(rawBody, signature, config?.webhookSecret ?? null)) {
    return new Response("Assinatura inválida", { status: 401 });
  }

  if (!event) {
    return new Response(JSON.stringify({ ok: true, ignored: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const adapter = getMarketplaceAdapter("99food");
    if (!adapter) throw new Error("Adapter 99Food indisponível");

    const result = await adapter.processInbound({
      tenantId,
      payload,
      source: "webhook",
      externalEventId: event.id,
    });

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

export async function handleIntegrationWebhookRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);

  if (request.method !== "POST") {
    if (
      url.pathname === "/api/integrations/ifood/webhook" ||
      url.pathname === "/api/integrations/rappi/webhook" ||
      url.pathname === "/api/integrations/99food/webhook" ||
      url.pathname === "/api/integrations/whatsapp/webhook"
    ) {
      return new Response("Method not allowed", { status: 405 });
    }
    return null;
  }

  if (url.pathname === "/api/integrations/ifood/webhook") {
    return handleIfoodWebhook(request, url);
  }

  if (url.pathname === "/api/integrations/rappi/webhook") {
    return handleRappiWebhook(request, url);
  }

  if (url.pathname === "/api/integrations/99food/webhook") {
    return handleFood99Webhook(request, url);
  }

  if (url.pathname === "/api/integrations/whatsapp/webhook") {
    const rawBody = await request.text();
    let body: unknown = {};
    try {
      body = JSON.parse(rawBody) as unknown;
    } catch {
      return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
    }
    const { ingestEvolutionWhatsappWebhook } = await import("@/lib/whatsapp/inboundWebhook");
    const result = await ingestEvolutionWhatsappWebhook(body);
    return Response.json({ ok: true, ...result });
  }

  return null;
}
