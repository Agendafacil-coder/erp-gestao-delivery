import { getSessionUserFromRequest } from "@/functions/session";
import { mapMenuItemDtoFromRow } from "@/lib/menu/menu-mappers.server";
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
      const dto = await mapMenuItemDtoFromRow(row);
      return Response.json(dto);
    } catch (e) {
      const msg = (e as Error).message;
      const status =
        msg === "Não autenticado" ? 401 : msg.includes("permissão") ? 403 : 400;
      return Response.json({ error: msg }, { status });
    }
  }

  return null;
}
