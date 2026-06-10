import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getVapidPublicKey } from "@/lib/push/send";
import { getSessionUserFromRequest } from "@/functions/session";

const SW_PATH = "/sw.js";

const SERVICE_WORKER_SOURCE = `
self.addEventListener("push", (event) => {
  let data = { title: "Delivery OS", body: "Nova notificação", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch { /* ignore */ }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/favicon.ico",
      tag: data.tag || "delivery-os",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
`.trim();

export async function handlePushApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname === SW_PATH) {
    return new Response(SERVICE_WORKER_SOURCE, {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  }

  if (url.pathname === "/api/push/vapid-public-key") {
    const key = getVapidPublicKey();
    if (!key) {
      return Response.json({ enabled: false, publicKey: null });
    }
    return Response.json({ enabled: true, publicKey: key });
  }

  if (url.pathname !== "/api/push/subscribe") return null;

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const user = await getSessionUserFromRequest(request);
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const endpoint = body.endpoint?.trim();
  const p256dh = body.keys?.p256dh?.trim();
  const auth = body.keys?.auth?.trim();
  if (!endpoint || !p256dh || !auth) {
    return new Response("Missing subscription fields", { status: 400 });
  }

  const db = getDb();
  const now = new Date();
  const [existing] = await db
    .select({ id: schema.pushSubscriptions.id })
    .from(schema.pushSubscriptions)
    .where(eq(schema.pushSubscriptions.endpoint, endpoint))
    .limit(1);

  if (existing) {
    await db
      .update(schema.pushSubscriptions)
      .set({ userId: user.id, p256dh, auth, updatedAt: now })
      .where(eq(schema.pushSubscriptions.id, existing.id));
  } else {
    await db.insert(schema.pushSubscriptions).values({
      userId: user.id,
      endpoint,
      p256dh,
      auth,
      updatedAt: now,
    });
  }

  return Response.json({ ok: true });
}
