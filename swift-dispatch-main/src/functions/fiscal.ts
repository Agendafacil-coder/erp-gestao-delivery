import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import { assertCanAccessFinance } from "@/lib/rbac";
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

export type FiscalDocumentDto = {
  id: string;
  order_id: string | null;
  order_code: string | null;
  doc_type: string;
  status: string;
  access_key: string | null;
  number: string | null;
  series: string | null;
  error_message: string | null;
  issued_at: string | null;
  created_at: string;
};

export const listFiscalDocumentsFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string; limit?: number }) => data)
  .handler(async ({ data }): Promise<FiscalDocumentDto[]> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanAccessFinance(user, data.tenantId);

    const db = getDb();
    const rows = await db
      .select({
        id: schema.fiscalDocuments.id,
        orderId: schema.fiscalDocuments.orderId,
        docType: schema.fiscalDocuments.docType,
        status: schema.fiscalDocuments.status,
        accessKey: schema.fiscalDocuments.accessKey,
        number: schema.fiscalDocuments.number,
        series: schema.fiscalDocuments.series,
        errorMessage: schema.fiscalDocuments.errorMessage,
        issuedAt: schema.fiscalDocuments.issuedAt,
        createdAt: schema.fiscalDocuments.createdAt,
        orderCode: schema.orders.code,
      })
      .from(schema.fiscalDocuments)
      .leftJoin(schema.orders, eq(schema.fiscalDocuments.orderId, schema.orders.id))
      .where(eq(schema.fiscalDocuments.tenantId, data.tenantId))
      .orderBy(desc(schema.fiscalDocuments.createdAt))
      .limit(Math.min(data.limit ?? 30, 100));

    return rows.map((r) => ({
      id: r.id,
      order_id: r.orderId,
      order_code: r.orderCode ?? null,
      doc_type: r.docType,
      status: r.status,
      access_key: r.accessKey,
      number: r.number,
      series: r.series,
      error_message: r.errorMessage,
      issued_at: r.issuedAt?.toISOString() ?? null,
      created_at: r.createdAt.toISOString(),
    }));
  });

/** Cria rascunho NFC-e vinculado a um pedido (emissão SEFAZ ainda não ativa). */
export const createFiscalDraftFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string; orderId: string; docType?: "nfce" | "nfe" }) => data)
  .handler(async ({ data }): Promise<FiscalDocumentDto> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanAccessFinance(user, data.tenantId);

    const db = getDb();
    const [order] = await db
      .select({ id: schema.orders.id, code: schema.orders.code })
      .from(schema.orders)
      .where(and(eq(schema.orders.id, data.orderId), eq(schema.orders.tenantId, data.tenantId)))
      .limit(1);
    if (!order) throw new Error("Pedido não encontrado");

    const [existing] = await db
      .select({ id: schema.fiscalDocuments.id })
      .from(schema.fiscalDocuments)
      .where(
        and(
          eq(schema.fiscalDocuments.tenantId, data.tenantId),
          eq(schema.fiscalDocuments.orderId, data.orderId),
          eq(schema.fiscalDocuments.docType, data.docType ?? "nfce"),
        ),
      )
      .limit(1);
    if (existing) throw new Error("Já existe documento fiscal para este pedido");

    const [row] = await db
      .insert(schema.fiscalDocuments)
      .values({
        tenantId: data.tenantId,
        orderId: data.orderId,
        docType: data.docType ?? "nfce",
        status: "draft",
      })
      .returning();
    if (!row) throw new Error("Falha ao criar rascunho fiscal");

    return {
      id: row.id,
      order_id: row.orderId,
      order_code: order.code,
      doc_type: row.docType,
      status: row.status,
      access_key: row.accessKey,
      number: row.number,
      series: row.series,
      error_message: row.errorMessage,
      issued_at: null,
      created_at: row.createdAt.toISOString(),
    };
  });
