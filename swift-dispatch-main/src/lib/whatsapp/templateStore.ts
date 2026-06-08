import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { getDb, schema } from "@/db";
import type * as schemaType from "@/db/schema";
import {
  DEFAULT_WHATSAPP_TEMPLATES,
  type WhatsappTemplateKey,
} from "@/lib/whatsapp/templates";

type Db = PostgresJsDatabase<typeof schemaType>;

export async function resolveWhatsappTemplate(
  tenantId: string,
  key: WhatsappTemplateKey,
  db: Db = getDb(),
): Promise<string> {
  const [row] = await db
    .select({
      content: schema.whatsappTemplates.content,
      enabled: schema.whatsappTemplates.enabled,
    })
    .from(schema.whatsappTemplates)
    .where(
      and(
        eq(schema.whatsappTemplates.tenantId, tenantId),
        eq(schema.whatsappTemplates.templateKey, key),
      ),
    )
    .limit(1);

  if (row?.enabled && row.content.trim()) return row.content;
  return DEFAULT_WHATSAPP_TEMPLATES[key];
}

export async function getTenantWhatsappTemplates(
  tenantId: string,
): Promise<Record<WhatsappTemplateKey, string>> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.whatsappTemplates)
    .where(eq(schema.whatsappTemplates.tenantId, tenantId));

  const merged = { ...DEFAULT_WHATSAPP_TEMPLATES };
  for (const row of rows) {
    const key = row.templateKey as WhatsappTemplateKey;
    if (key in merged && row.enabled) {
      merged[key] = row.content;
    }
  }
  return merged;
}

export async function saveTenantWhatsappTemplates(
  tenantId: string,
  templates: Partial<Record<WhatsappTemplateKey, string>>,
): Promise<Record<WhatsappTemplateKey, string>> {
  const db = getDb();
  const now = new Date();

  for (const [key, content] of Object.entries(templates)) {
    if (!content?.trim()) continue;
    const templateKey = key as WhatsappTemplateKey;
    if (!(templateKey in DEFAULT_WHATSAPP_TEMPLATES)) continue;

    await db
      .insert(schema.whatsappTemplates)
      .values({
        tenantId,
        templateKey,
        content: content.trim(),
        enabled: true,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [schema.whatsappTemplates.tenantId, schema.whatsappTemplates.templateKey],
        set: { content: content.trim(), enabled: true, updatedAt: now },
      });
  }

  return getTenantWhatsappTemplates(tenantId);
}
