import { createHmac, timingSafeEqual } from "node:crypto";

import type { PaymentWebhookMeta } from "./types";

/** Valida x-signature do Mercado Pago (manifest HMAC-SHA256). */
export function verifyMercadoPagoWebhookSignature(meta: PaymentWebhookMeta): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const signatureHeader = meta.signature?.trim();
  const dataId = meta.dataId?.trim();
  const requestId = meta.requestId?.trim();
  if (!signatureHeader || !dataId || !requestId) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k.trim(), v?.trim() ?? ""];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  try {
    return timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
  } catch {
    return v1 === expected;
  }
}
