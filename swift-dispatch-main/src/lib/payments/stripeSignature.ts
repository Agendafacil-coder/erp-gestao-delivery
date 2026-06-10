import { createHmac, timingSafeEqual } from "node:crypto";

import type { PaymentWebhookMeta } from "./types";

/** Valida stripe-signature (t=timestamp,v1=hmac). */
export function verifyStripeWebhookSignature(meta: PaymentWebhookMeta): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const header = meta.signature?.trim();
  const rawBody = meta.rawBody;
  if (!header || rawBody == null) return false;

  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  );
  const ts = parts.t;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const signed = `${ts}.${rawBody}`;
  const expected = createHmac("sha256", secret).update(signed, "utf8").digest("hex");

  try {
    return timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
  } catch {
    return v1 === expected;
  }
}
