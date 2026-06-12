import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import { normalizeOrderStatus } from "@/lib/ops/orderWorkflow";

export type SubmitOrderReviewInput = {
  orderId: string;
  token: string;
  score: number;
  comment?: string;
};

export type OrderReviewDto = {
  score: number;
  comment: string | null;
  created_at: string;
};

export const submitOrderReviewFn = createServerFn({ method: "POST" })
  .inputValidator((data: SubmitOrderReviewInput) => data)
  .handler(async ({ data }): Promise<OrderReviewDto> => {
    const score = Math.round(data.score);
    if (score < 1 || score > 5) throw new Error("Nota deve ser entre 1 e 5");

    const db = getDb();
    const [order] = await db
      .select()
      .from(schema.orders)
      .where(
        and(eq(schema.orders.id, data.orderId), eq(schema.orders.trackingToken, data.token)),
      )
      .limit(1);

    if (!order) throw new Error("Pedido não encontrado ou link inválido");
    if (normalizeOrderStatus(order.status) !== "entregue") {
      throw new Error("Avaliação disponível após a entrega");
    }

    const [existing] = await db
      .select({ id: schema.orderReviews.id })
      .from(schema.orderReviews)
      .where(eq(schema.orderReviews.orderId, order.id))
      .limit(1);

    if (existing) throw new Error("Este pedido já foi avaliado");

    const comment = data.comment?.trim().slice(0, 500) || null;
    const [review] = await db
      .insert(schema.orderReviews)
      .values({
        orderId: order.id,
        tenantId: order.tenantId,
        score,
        comment,
      })
      .returning();

    if (score <= 2) {
      await db.insert(schema.alerts).values({
        tenantId: order.tenantId,
        level: "high",
        title: `Avaliação baixa · ${order.code}`,
        detail: `${order.customerName} deu nota ${score}${comment ? `: ${comment}` : ""}`,
      });
    }

    return {
      score: review.score,
      comment: review.comment,
      created_at: review.createdAt.toISOString(),
    };
  });
