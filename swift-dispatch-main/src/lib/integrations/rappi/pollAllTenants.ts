import { eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import { pollTenantRappiOrders, type RappiPollResult } from "./pollOrders";

export type RappiCronPollSummary = {
  tenants_checked: number;
  tenants_polled: number;
  tenants_skipped: number;
  orders_processed: number;
  errors: Array<{ tenantId: string; message: string }>;
  results: Array<{ tenantId: string; result: RappiPollResult }>;
  finished_at: string;
};

export async function pollAllRappiTenants(): Promise<RappiCronPollSummary> {
  const db = getDb();
  const configs = await db
    .select({
      tenantId: schema.rappiTenantConfig.tenantId,
      enabled: schema.rappiTenantConfig.enabled,
      pollingEnabled: schema.rappiTenantConfig.pollingEnabled,
    })
    .from(schema.rappiTenantConfig)
    .where(eq(schema.rappiTenantConfig.enabled, true));

  const eligible = configs.filter((c) => c.pollingEnabled !== false);
  const summary: RappiCronPollSummary = {
    tenants_checked: configs.length,
    tenants_polled: 0,
    tenants_skipped: 0,
    orders_processed: 0,
    errors: [],
    results: [],
    finished_at: new Date().toISOString(),
  };

  for (const { tenantId } of eligible) {
    try {
      const result = await pollTenantRappiOrders(tenantId);
      summary.results.push({ tenantId, result });
      if (result.skipped) {
        summary.tenants_skipped++;
      } else {
        summary.tenants_polled++;
        summary.orders_processed += result.orders_processed;
      }
    } catch (err) {
      summary.errors.push({
        tenantId,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  summary.finished_at = new Date().toISOString();
  return summary;
}
