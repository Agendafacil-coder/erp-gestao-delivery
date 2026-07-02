import { eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import { isRappiOAuthConfigured } from "@/lib/integrations/rappi/oauthClient";
import { isFeatureEnabled, type TenantFeatureFlags } from "@/lib/tenant/featureFlags";

export type TenantIntegrationCheck = {
  id: string;
  label: string;
  done: boolean;
  severity: "required" | "recommended";
  hint?: string;
};

export async function buildTenantIntegrationChecks(
  tenantId: string,
  flags: TenantFeatureFlags,
): Promise<TenantIntegrationCheck[]> {
  const db = getDb();
  const checks: TenantIntegrationCheck[] = [];

  const [ifood] = await db
    .select()
    .from(schema.ifoodTenantConfig)
    .where(eq(schema.ifoodTenantConfig.tenantId, tenantId))
    .limit(1);

  if (ifood?.enabled) {
    checks.push({
      id: "tenant_ifood",
      label: "iFood — OAuth e Merchant ID",
      done: Boolean(ifood.accessToken) && Boolean(ifood.merchantId?.trim()),
      severity: "required",
      hint: "Conecte OAuth e informe o Merchant ID em Automações → iFood.",
    });
  }

  if (isFeatureEnabled(flags, "marketplace_rappi")) {
    const [rappi] = await db
      .select()
      .from(schema.rappiTenantConfig)
      .where(eq(schema.rappiTenantConfig.tenantId, tenantId))
      .limit(1);

    checks.push({
      id: "tenant_rappi",
      label: "Rappi — Store ID e OAuth global",
      done: Boolean(rappi?.enabled && rappi.storeId?.trim() && isRappiOAuthConfigured()),
      severity: "recommended",
      hint: "Configure store_id e RAPPI_CLIENT_ID/SECRET no servidor.",
    });
  }

  if (isFeatureEnabled(flags, "marketplace_99food")) {
    const [food99] = await db
      .select()
      .from(schema.food99TenantConfig)
      .where(eq(schema.food99TenantConfig.tenantId, tenantId))
      .limit(1);

    checks.push({
      id: "tenant_food99",
      label: "99Food — credenciais e OAuth",
      done: Boolean(
        food99?.enabled &&
        food99.merchantId?.trim() &&
        food99.clientId?.trim() &&
        food99.clientSecret?.trim() &&
        food99.accessToken,
      ),
      severity: "recommended",
      hint: "Salve credenciais em Automações → 99Food.",
    });
  }

  return checks;
}
