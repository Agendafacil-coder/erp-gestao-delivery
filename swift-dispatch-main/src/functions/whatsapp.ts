import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import {
  dispatchWhatsappMessage,
  mapWhatsappLog,
  type WhatsappMessageLog,
} from "@/lib/whatsapp/orderNotifications";
import {
  getTenantWhatsappTemplates,
  saveTenantWhatsappTemplates,
} from "@/lib/whatsapp/templateStore";
import {
  DEFAULT_WHATSAPP_TEMPLATES,
  WHATSAPP_TEMPLATE_KEYS,
  type WhatsappTemplateKey,
} from "@/lib/whatsapp/templates";
import { assertCanAccessWhatsapp } from "@/lib/rbac";
import {
  getWhatsappApiConfig,
  saveWhatsappApiConfig,
  type WhatsappApiConfig,
} from "@/lib/whatsapp/apiConfig";
import { requireSessionUser } from "./session";

async function assertTenantAccess(userId: string, tenantId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: schema.userRoles.id })
    .from(schema.userRoles)
    .where(and(eq(schema.userRoles.userId, userId), eq(schema.userRoles.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new Error("Sem permissão para este tenant");
}

function normalizeTestPhone(raw?: string): string {
  const digits = (raw?.trim() || "5511999999999").replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    throw new Error("Telefone inválido. Use DDD + número (10–15 dígitos).");
  }
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `+${withCountry}`;
}

export const listWhatsappLogsFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string; limit?: number }) => data)
  .handler(async ({ data }): Promise<WhatsappMessageLog[]> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanAccessWhatsapp(user, data.tenantId);

    const db = getDb();
    const limit = Math.min(data.limit ?? 50, 100);
    const rows = await db
      .select()
      .from(schema.whatsappMessageLogs)
      .where(eq(schema.whatsappMessageLogs.tenantId, data.tenantId))
      .orderBy(desc(schema.whatsappMessageLogs.createdAt))
      .limit(limit);

    return rows.map(mapWhatsappLog);
  });

export const sendWhatsappTestFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string; phone?: string }) => data)
  .handler(async ({ data }): Promise<WhatsappMessageLog> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanAccessWhatsapp(user, data.tenantId);

    const phone = normalizeTestPhone(data.phone);
    const content =
      "Mensagem de teste do hub WhatsApp. Conecte WHATSAPP_API_URL, WHATSAPP_API_KEY e WHATSAPP_INSTANCE para disparos reais via Evolution API.";

    return dispatchWhatsappMessage({
      tenantId: data.tenantId,
      recipientType: "cliente",
      recipientPhone: phone,
      recipientLabel: `Teste (${phone})`,
      templateKey: "test",
      content,
    });
  });

export const sendWhatsappCampaignMessageFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      tenantId: string;
      phone: string;
      message: string;
      imageUrl?: string | null;
      recipientLabel?: string;
    }) => data,
  )
  .handler(async ({ data }): Promise<WhatsappMessageLog> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanAccessWhatsapp(user, data.tenantId);

    const phone = normalizeTestPhone(data.phone);
    return dispatchWhatsappMessage({
      tenantId: data.tenantId,
      recipientType: "cliente",
      recipientPhone: phone,
      recipientLabel: data.recipientLabel ?? phone,
      templateKey: "campaign",
      content: data.message.trim() || "(imagem)",
      mediaUrl: data.imageUrl?.trim() || null,
    });
  });

export const getWhatsappTemplatesFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<Record<WhatsappTemplateKey, string>> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanAccessWhatsapp(user, data.tenantId);
    return getTenantWhatsappTemplates(data.tenantId);
  });

export const saveWhatsappTemplatesFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { tenantId: string; templates: Partial<Record<WhatsappTemplateKey, string>> }) => data,
  )
  .handler(async ({ data }): Promise<Record<WhatsappTemplateKey, string>> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanAccessWhatsapp(user, data.tenantId);
    return saveTenantWhatsappTemplates(data.tenantId, data.templates);
  });

export const resetWhatsappTemplatesFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<Record<WhatsappTemplateKey, string>> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanAccessWhatsapp(user, data.tenantId);
    const db = getDb();
    await db
      .delete(schema.whatsappTemplates)
      .where(eq(schema.whatsappTemplates.tenantId, data.tenantId));
    return { ...DEFAULT_WHATSAPP_TEMPLATES };
  });

export const getWhatsappApiConfigFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<WhatsappApiConfig> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanAccessWhatsapp(user, data.tenantId);
    return getWhatsappApiConfig(data.tenantId);
  });

export const saveWhatsappApiConfigFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      tenantId: string;
      provider?: "evolution" | "zapi" | "cloud";
      apiUrl?: string | null;
      apiKey?: string | null;
      instanceName?: string | null;
      enabled?: boolean;
    }) => data,
  )
  .handler(async ({ data }): Promise<WhatsappApiConfig> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanAccessWhatsapp(user, data.tenantId);
    return saveWhatsappApiConfig(data.tenantId, {
      provider: data.provider,
      apiUrl: data.apiUrl,
      apiKey: data.apiKey,
      instanceName: data.instanceName,
      enabled: data.enabled,
    });
  });

export const testWhatsappConnectionFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanAccessWhatsapp(user, data.tenantId);
    const { probeWhatsappConnection } = await import("@/lib/whatsapp/connectionProbe");
    return probeWhatsappConnection(data.tenantId);
  });

export { WHATSAPP_TEMPLATE_KEYS, DEFAULT_WHATSAPP_TEMPLATES };

export const processSlaWhatsappAlertsFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<{ sent: number }> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanAccessWhatsapp(user, data.tenantId);

    const { processTenantSlaWhatsappAlerts } = await import("@/lib/whatsapp/slaAlerts");
    const sent = await processTenantSlaWhatsappAlerts(data.tenantId);
    return { sent };
  });

export type WhatsappInboundDto = {
  id: string;
  phone: string;
  contact_name: string | null;
  body: string;
  status: string;
  created_at: string;
};

export const listWhatsappInboundFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string; limit?: number }) => data)
  .handler(async ({ data }): Promise<WhatsappInboundDto[]> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanAccessWhatsapp(user, data.tenantId);

    const db = getDb();
    const limit = Math.min(data.limit ?? 50, 100);
    const rows = await db
      .select()
      .from(schema.whatsappInboundMessages)
      .where(eq(schema.whatsappInboundMessages.tenantId, data.tenantId))
      .orderBy(desc(schema.whatsappInboundMessages.createdAt))
      .limit(limit);

    return rows.map((r) => ({
      id: r.id,
      phone: r.phone,
      contact_name: r.contactName,
      body: r.body,
      status: r.status,
      created_at: r.createdAt.toISOString(),
    }));
  });

export const markWhatsappInboundReadFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string; messageId: string; status?: "read" | "ordered" }) => data)
  .handler(async ({ data }): Promise<void> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanAccessWhatsapp(user, data.tenantId);

    const db = getDb();
    await db
      .update(schema.whatsappInboundMessages)
      .set({ status: data.status ?? "read" })
      .where(
        and(
          eq(schema.whatsappInboundMessages.id, data.messageId),
          eq(schema.whatsappInboundMessages.tenantId, data.tenantId),
        ),
      );
  });
