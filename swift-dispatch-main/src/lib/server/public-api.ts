import { getPublicMenuFn } from "@/functions/menu";
import { createPublicOrderFn } from "@/functions/publicOrders";
import { createCheckoutFn } from "@/functions/payments";

export async function handlePublicApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname === "/api/public/menu" && request.method === "GET") {
    const slug = url.searchParams.get("slug");
    if (!slug) return new Response("slug obrigatório", { status: 400 });
    try {
      const menu = await getPublicMenuFn({ data: { tenantSlug: slug } });
      return Response.json(menu);
    } catch (e) {
      return new Response((e as Error).message, { status: 404 });
    }
  }

  if (url.pathname === "/api/public/orders" && request.method === "POST") {
    try {
      const body = await request.json();
      const order = await createPublicOrderFn({ data: body });
      return Response.json(order);
    } catch (e) {
      return new Response((e as Error).message, { status: 400 });
    }
  }

  if (url.pathname === "/api/public/checkout" && request.method === "POST") {
    try {
      const body = await request.json();
      const result = await createCheckoutFn({ data: body });
      return Response.json(result);
    } catch (e) {
      return new Response((e as Error).message, { status: 400 });
    }
  }

  return null;
}
