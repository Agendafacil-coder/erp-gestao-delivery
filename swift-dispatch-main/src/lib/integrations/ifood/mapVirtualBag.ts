import type { IfoodPollingEvent } from "./eventsClient";
import type { IfoodWebhookPayload } from "./types";

function pickString(
  obj: Record<string, unknown> | undefined,
  ...keys: string[]
): string | undefined {
  if (!obj) return undefined;
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return undefined;
}

function pickNumber(
  obj: Record<string, unknown> | undefined,
  ...keys: string[]
): number | undefined {
  if (!obj) return undefined;
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "number" && Number.isFinite(val)) return val;
    if (typeof val === "string") {
      const n = Number(val);
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

export function mapVirtualBagToPayload(
  bag: Record<string, unknown>,
  event: IfoodPollingEvent,
): IfoodWebhookPayload {
  const customer = (bag.customer ?? bag.client) as Record<string, unknown> | undefined;
  const delivery = bag.delivery as Record<string, unknown> | undefined;
  const deliveryAddress = (delivery?.deliveryAddress ?? delivery?.address) as
    | Record<string, unknown>
    | undefined;
  const total = (bag.total ?? bag.payment ?? bag.summary) as Record<string, unknown> | undefined;
  const orderType =
    pickString(bag, "orderType", "type", "order_type") ?? pickString(delivery, "mode", "type");

  const bagItems =
    (bag.bag as Record<string, unknown> | undefined)?.items ?? bag.items ?? bag.products;

  const itemsRaw = Array.isArray(bagItems) ? bagItems : [];
  const items = itemsRaw.map((raw) => {
    const item = raw as Record<string, unknown>;
    const name = pickString(item, "name", "description", "productName") ?? "Item iFood";
    const quantity = pickNumber(item, "quantity", "qty") ?? 1;
    const unitPrice =
      pickNumber(item, "unitPrice", "unit_price", "price") ??
      pickNumber(item, "totalPrice", "total_price") ??
      0;
    return { name, quantity, unitPrice, totalPrice: unitPrice * quantity };
  });

  return {
    code: event.code,
    fullCode: event.fullCode ?? event.code,
    orderId: event.orderId,
    merchantId: event.merchantId,
    orderType,
    customer: {
      name: pickString(customer, "name", "fullName"),
      phone: pickString(customer, "phone", "phoneNumber", "mobilePhone"),
    },
    delivery: {
      deliveryAddress: {
        formattedAddress: pickString(deliveryAddress, "formattedAddress", "address"),
        neighborhood: pickString(deliveryAddress, "neighborhood", "district"),
        streetName: pickString(deliveryAddress, "streetName", "street"),
        streetNumber: pickString(deliveryAddress, "streetNumber", "number"),
        complement: pickString(deliveryAddress, "complement"),
      },
    },
    total: {
      orderAmount:
        pickNumber(total, "orderAmount", "subTotal", "subtotal", "itemsPrice") ??
        items.reduce((s, i) => s + (i.totalPrice ?? 0), 0),
      deliveryFee: pickNumber(total, "deliveryFee", "delivery_fee"),
    },
    items,
  };
}

export function minimalPayloadFromPollingEvent(event: IfoodPollingEvent): IfoodWebhookPayload {
  return {
    code: event.code,
    fullCode: event.fullCode ?? event.code,
    orderId: event.orderId,
    merchantId: event.merchantId,
  };
}
