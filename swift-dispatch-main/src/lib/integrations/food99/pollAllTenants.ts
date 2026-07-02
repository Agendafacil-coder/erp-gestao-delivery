import { eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import { pollTenantFood99Events, type Food99PollResult } from "./pollEvents";

export type Food99CronPollSummary = {
  tenants_checked: number;
  tenants_polled: number;
  tenants_skipped: number;
  orders_processed: number;
  errors: Array<{ tenantId: string; message: string }>;
  results: Array<{ tenantId: string; result: Food99PollResult }>;
  finished_at: string;
};

export async function pollAllFood99Tenants(): Promise<Food99CronPollSummary> {
  const db = getDb();
  const configs = await db
    .select({
      tenantId: schema.food99TenantConfig.tenantId,
      enabled: schema.food99TenantConfig.enabled,
      pollingEnabled: schema.food99TenantConfig.pollingEnabled,
    })
    .from(schema.food99TenantConfig)
    .where(eq(schema.food99TenantConfig.enabled, true));

  const eligible = configs.filter((c) => c.pollingEnabled !== false);
  const summary: Food99CronPollSummary = {
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
      const result = await pollTenantFood99Events(tenantId);
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
