import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

function jidToPhone(jid: string): string {
  const base = jid.split("@")[0] ?? jid;
  return digitsOnly(base.split(":")[0] ?? base);
}

function extractText(message: Record<string, unknown> | undefined): string {
  if (!message) return "";
  if (typeof message.conversation === "string") return message.conversation;
  const extended = message.extendedTextMessage as { text?: string } | undefined;
  if (extended?.text) return extended.text;
  const image = message.imageMessage as { caption?: string } | undefined;
  if (image?.caption) return image.caption;
  return "";
}

/** Processa payload típico Evolution API (messages.upsert). */
export async function ingestEvolutionWhatsappWebhook(
  body: unknown,
): Promise<{ stored: number; tenantId?: string }> {
  if (!body || typeof body !== "object") return { stored: 0 };

  const root = body as Record<string, unknown>;
  const event = String(root.event ?? root.Event ?? "").toLowerCase();
  if (event && !event.includes("messages.upsert") && !event.includes("message")) {
    return { stored: 0 };
  }

  const instance =
    (typeof root.instance === "string" && root.instance) ||
    (typeof root.instanceName === "string" && root.instanceName) ||
    null;

  const data = (root.data ?? root) as Record<string, unknown>;
  const key = (data.key ?? {}) as Record<string, unknown>;
  if (key.fromMe === true) return { stored: 0 };

  const remoteJid = typeof key.remoteJid === "string" ? key.remoteJid : "";
  if (!remoteJid || remoteJid.endsWith("@g.us")) return { stored: 0 };

  const phone = jidToPhone(remoteJid);
  if (phone.length < 8) return { stored: 0 };

  const message = (data.message ?? {}) as Record<string, unknown>;
  const text = extractText(message).trim();
  if (!text) return { stored: 0 };

  const contactName =
    (typeof data.pushName === "string" && data.pushName) ||
    (typeof root.pushName === "string" && root.pushName) ||
    null;

  const providerMessageId =
    (typeof key.id === "string" && key.id) ||
    (typeof data.id === "string" && data.id) ||
    null;

  const db = getDb();
  let tenantId: string | null = null;

  if (instance) {
    const [cfg] = await db
      .select({ tenantId: schema.whatsappTenantConfig.tenantId })
      .from(schema.whatsappTenantConfig)
      .where(
        and(
          eq(schema.whatsappTenantConfig.instanceName, instance),
          eq(schema.whatsappTenantConfig.enabled, true),
        ),
      )
      .limit(1);
    tenantId = cfg?.tenantId ?? null;
  }

  if (!tenantId) {
    const [cfg] = await db
      .select({ tenantId: schema.whatsappTenantConfig.tenantId })
      .from(schema.whatsappTenantConfig)
      .where(eq(schema.whatsappTenantConfig.enabled, true))
      .orderBy(desc(schema.whatsappTenantConfig.updatedAt))
      .limit(1);
    tenantId = cfg?.tenantId ?? null;
  }

  if (!tenantId) return { stored: 0 };

  if (providerMessageId) {
    const [dup] = await db
      .select({ id: schema.whatsappInboundMessages.id })
      .from(schema.whatsappInboundMessages)
      .where(
        and(
          eq(schema.whatsappInboundMessages.tenantId, tenantId),
          eq(schema.whatsappInboundMessages.providerMessageId, providerMessageId),
        ),
      )
      .limit(1);
    if (dup) return { stored: 0, tenantId };
  }

  await db.insert(schema.whatsappInboundMessages).values({
    tenantId,
    phone,
    contactName,
    body: text.slice(0, 4000),
    providerMessageId,
    status: "new",
  });

  return { stored: 1, tenantId };
}
