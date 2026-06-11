import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import type { AutomationEvent } from "./detectAutomationEvents";

const MAX_PER_TENANT = 80;
const RETENTION_MAX_ROWS = 200;
const RETENTION_DAYS = 14;
const PRUNE_INTERVAL_MS = 5 * 60_000;
const buffers = new Map<string, AutomationEvent[]>();
const lastPruneByTenant = new Map<string, number>();
let seq = 0;

function fmtTime(d = new Date()) {
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function rowToEvent(row: {
  eventKey: string;
  ruleId: string;
  message: string;
  level: string;
  createdAt: Date;
}): AutomationEvent {
  return {
    id: row.eventKey,
    at: fmtTime(row.createdAt),
    ruleId: row.ruleId,
    message: row.message,
    level: row.level as AutomationEvent["level"],
  };
}

async function persistAutomationEvent(tenantId: string, entry: AutomationEvent): Promise<void> {
  const db = getDb();
  await db
    .insert(schema.automationEvents)
    .values({
      tenantId,
      eventKey: entry.id,
      ruleId: entry.ruleId,
      message: entry.message,
      level: entry.level,
    })
    .onConflictDoNothing();

  void pruneAutomationEvents(tenantId).catch(() => {});
}

async function pruneAutomationEvents(tenantId: string): Promise<void> {
  const now = Date.now();
  if (now - (lastPruneByTenant.get(tenantId) ?? 0) < PRUNE_INTERVAL_MS) return;
  lastPruneByTenant.set(tenantId, now);

  const db = getDb();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await db
    .delete(schema.automationEvents)
    .where(
      and(
        eq(schema.automationEvents.tenantId, tenantId),
        lt(schema.automationEvents.createdAt, cutoff),
      ),
    );

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.automationEvents)
    .where(eq(schema.automationEvents.tenantId, tenantId));

  const excess = (count ?? 0) - RETENTION_MAX_ROWS;
  if (excess <= 0) return;

  const oldest = await db
    .select({ id: schema.automationEvents.id })
    .from(schema.automationEvents)
    .where(eq(schema.automationEvents.tenantId, tenantId))
    .orderBy(schema.automationEvents.createdAt)
    .limit(excess);

  if (oldest.length === 0) return;
  await db.delete(schema.automationEvents).where(
    inArray(
      schema.automationEvents.id,
      oldest.map((r) => r.id),
    ),
  );
}

async function loadAutomationEventsFromDb(
  tenantId: string,
  limit = MAX_PER_TENANT,
): Promise<AutomationEvent[]> {
  const db = getDb();
  const rows = await db
    .select({
      eventKey: schema.automationEvents.eventKey,
      ruleId: schema.automationEvents.ruleId,
      message: schema.automationEvents.message,
      level: schema.automationEvents.level,
      createdAt: schema.automationEvents.createdAt,
    })
    .from(schema.automationEvents)
    .where(eq(schema.automationEvents.tenantId, tenantId))
    .orderBy(desc(schema.automationEvents.createdAt))
    .limit(limit);

  return rows.map(rowToEvent);
}

/** Até 200 eventos com timestamp ISO — para exportação CSV. */
export async function loadAutomationHistoryForExport(
  tenantId: string,
  limit = RETENTION_MAX_ROWS,
): Promise<Array<AutomationEvent & { atIso: string }>> {
  const db = getDb();
  const rows = await db
    .select({
      eventKey: schema.automationEvents.eventKey,
      ruleId: schema.automationEvents.ruleId,
      message: schema.automationEvents.message,
      level: schema.automationEvents.level,
      createdAt: schema.automationEvents.createdAt,
    })
    .from(schema.automationEvents)
    .where(eq(schema.automationEvents.tenantId, tenantId))
    .orderBy(desc(schema.automationEvents.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.eventKey,
    at: fmtTime(row.createdAt),
    atIso: row.createdAt.toISOString(),
    ruleId: row.ruleId,
    message: row.message,
    level: row.level as AutomationEvent["level"],
  }));
}

export function pushServerAutomationEvent(
  tenantId: string,
  event: Omit<AutomationEvent, "id" | "at"> & { id?: string },
): void {
  const entry: AutomationEvent = {
    id: event.id ?? `srv-${tenantId}-${++seq}-${Date.now()}`,
    at: fmtTime(),
    ruleId: event.ruleId,
    message: event.message,
    level: event.level,
  };
  const buf = buffers.get(tenantId) ?? [];
  if (buf.some((e) => e.id === entry.id)) return;
  buf.unshift(entry);
  if (buf.length > MAX_PER_TENANT) buf.length = MAX_PER_TENANT;
  buffers.set(tenantId, buf);

  void persistAutomationEvent(tenantId, entry).catch(() => {});
}

/** Buffer em memória — sem query Postgres (ideal para SSE frequente). */
export function getBufferedAutomationEvents(tenantId: string): AutomationEvent[] {
  return buffers.get(tenantId) ?? [];
}

/** Lê do Postgres e mescla com buffer recente (antes do INSERT completar). */
export async function getServerAutomationEvents(tenantId: string): Promise<AutomationEvent[]> {
  let dbEvents: AutomationEvent[] = [];
  try {
    dbEvents = await loadAutomationEventsFromDb(tenantId);
  } catch {
    /* fallback abaixo */
  }

  const mem = buffers.get(tenantId) ?? [];
  if (dbEvents.length === 0) return mem;

  const dbIds = new Set(dbEvents.map((e) => e.id));
  const pending = mem.filter((e) => !dbIds.has(e.id));
  const merged = [...pending, ...dbEvents].slice(0, MAX_PER_TENANT);
  buffers.set(tenantId, merged);
  return merged;
}

/** Apenas para testes */
export function clearServerAutomationEvents(tenantId?: string): void {
  if (tenantId) buffers.delete(tenantId);
  else buffers.clear();
}
