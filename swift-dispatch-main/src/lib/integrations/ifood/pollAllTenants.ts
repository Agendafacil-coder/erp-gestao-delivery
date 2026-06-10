import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { pollTenantIfoodEvents, type IfoodPollResult } from "./pollEvents";

export type IfoodCronPollSummary = {
  tenants_checked: number;
  tenants_polled: number;
  tenants_skipped: number;
  events_processed: number;
  errors: Array<{ tenantId: string; message: string }>;
  results: Array<{ tenantId: string; result: IfoodPollResult }>;
  finished_at: string;
};

/** Polling server-side para todos os tenants com integração iFood ativa. */
export async function pollAllIfoodTenants(): Promise<IfoodCronPollSummary> {
  const db = getDb();
  const configs = await db
    .select({
      tenantId: schema.ifoodTenantConfig.tenantId,
      enabled: schema.ifoodTenantConfig.enabled,
      pollingEnabled: schema.ifoodTenantConfig.pollingEnabled,
    })
    .from(schema.ifoodTenantConfig)
    .where(eq(schema.ifoodTenantConfig.enabled, true));

  const eligible = configs.filter((c) => c.pollingEnabled !== false);
  const summary: IfoodCronPollSummary = {
    tenants_checked: configs.length,
    tenants_polled: 0,
    tenants_skipped: 0,
    events_processed: 0,
    errors: [],
    results: [],
    finished_at: new Date().toISOString(),
  };

  for (const { tenantId } of eligible) {
    try {
      const result = await pollTenantIfoodEvents(tenantId);
      summary.results.push({ tenantId, result });
      if (result.skipped) {
        summary.tenants_skipped++;
      } else {
        summary.tenants_polled++;
        summary.events_processed += result.events_processed;
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
