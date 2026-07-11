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
      label: "iFood — login e ID da loja",
      done: Boolean(ifood.accessToken) && Boolean(ifood.merchantId?.trim()),
      severity: "required",
      hint: "Faça login no iFood e informe o ID da loja em Apps de delivery → iFood.",
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
      label: "Rappi — ID da loja e conexão ativa",
      done: Boolean(rappi?.enabled && rappi.storeId?.trim() && isRappiOAuthConfigured()),
      severity: "recommended",
      hint: "Informe o ID da loja aqui. A conexão com o Rappi é feita pelo suporte.",
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
      label: "99Food — loja conectada",
      done: Boolean(
        food99?.enabled &&
        food99.merchantId?.trim() &&
        food99.clientId?.trim() &&
        food99.clientSecret?.trim() &&
        food99.accessToken,
      ),
      severity: "recommended",
      hint: "Peça ao suporte para conectar a 99Food em Apps de delivery → 99Food.",
    });
  }

  return checks;
}
