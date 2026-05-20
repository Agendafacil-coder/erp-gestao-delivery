import { getSessionUserFromRequest } from "@/functions/session";
import { upsertMenuItemForUser, type UpsertMenuItemInput } from "@/lib/menu/menu-service";

export async function handleMenuAdminApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname === "/api/menu/admin/item" && request.method === "POST") {
    try {
      const user = await getSessionUserFromRequest(request);
      if (!user) {
        return Response.json({ error: "Não autenticado" }, { status: 401 });
      }

      const body = (await request.json()) as UpsertMenuItemInput;
      const row = await upsertMenuItemForUser(user, body);
      return Response.json(row);
    } catch (e) {
      const msg = (e as Error).message;
      const status =
        msg === "Não autenticado" ? 401 : msg.includes("permissão") ? 403 : 400;
      return Response.json({ error: msg }, { status });
    }
  }

  return null;
}
