import { eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import {
  isFeatureEnabled,
  parseFeatureFlagsJson,
  type FeatureFlagKey,
  type TenantFeatureFlags,
} from "./featureFlags";

export async function loadTenantFeatureFlags(tenantId: string): Promise<TenantFeatureFlags> {
  const db = getDb();
  const [row] = await db
    .select({ featureFlags: schema.tenantMenuSettings.featureFlags })
    .from(schema.tenantMenuSettings)
    .where(eq(schema.tenantMenuSettings.tenantId, tenantId))
    .limit(1);

  return parseFeatureFlagsJson(row?.featureFlags);
}

export async function assertTenantFeatureEnabled(
  tenantId: string,
  key: FeatureFlagKey,
): Promise<void> {
  const flags = await loadTenantFeatureFlags(tenantId);
  if (!isFeatureEnabled(flags, key)) {
    throw new Error(`Recurso desativado: ative "${key}" em Sistema → Configurações → Operação.`);
  }
}

export async function isTenantFeatureEnabled(
  tenantId: string,
  key: FeatureFlagKey,
): Promise<boolean> {
  const flags = await loadTenantFeatureFlags(tenantId);
  return isFeatureEnabled(flags, key);
}
