import { eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import { syncMenuItemAvailabilityToIfood } from "@/lib/integrations/ifood/catalogClient";

/**
 * Após pausar/ativar localmente: tenta espelhar no iFood se houver mapeamento.
 * Não bloqueia a operação local em caso de falha.
 */
export async function trySyncMenuItemToIfood(input: {
  tenantId: string;
  itemId: string;
  available: boolean;
}): Promise<{ synced: boolean; message?: string }> {
  const db = getDb();
  const [item] = await db
    .select({
      ifoodItemId: schema.menuItems.ifoodItemId,
      tenantId: schema.menuItems.tenantId,
    })
    .from(schema.menuItems)
    .where(eq(schema.menuItems.id, input.itemId))
    .limit(1);

  const ifoodItemId = item?.ifoodItemId?.trim();
  if (!ifoodItemId || item.tenantId !== input.tenantId) {
    return { synced: false };
  }

  const [config] = await db
    .select({
      enabled: schema.ifoodTenantConfig.enabled,
      merchantId: schema.ifoodTenantConfig.merchantId,
      accessToken: schema.ifoodTenantConfig.accessToken,
    })
    .from(schema.ifoodTenantConfig)
    .where(eq(schema.ifoodTenantConfig.tenantId, input.tenantId))
    .limit(1);

  if (!config?.enabled || !config.merchantId?.trim() || !config.accessToken) {
    return { synced: false, message: "iFood não conectado" };
  }

  try {
    await syncMenuItemAvailabilityToIfood({
      tenantId: input.tenantId,
      merchantId: config.merchantId,
      ifoodItemId,
      available: input.available,
    });
    return { synced: true };
  } catch (e) {
    return {
      synced: false,
      message: e instanceof Error ? e.message : "Falha ao sincronizar com iFood",
    };
  }
}
