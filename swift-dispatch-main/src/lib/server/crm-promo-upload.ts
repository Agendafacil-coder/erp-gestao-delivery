import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import { getSessionUserFromRequest } from "@/functions/session";
import { assertCanAccessWhatsapp } from "@/lib/rbac";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = new Set(["image/jpeg", "image/png"]);
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

function uploadsRoot() {
  return path.join(process.cwd(), "uploads", "crm");
}

function safeFilename(name: string): boolean {
  return /^[a-f0-9-]+\.(jpg|png)$/i.test(name);
}

async function assertCrmUploadAccess(request: Request, tenantId: string) {
  const user = await getSessionUserFromRequest(request);
  if (!user) throw new Error("Não autenticado");
  const db = getDb();
  const [row] = await db
    .select({ id: schema.userRoles.id })
    .from(schema.userRoles)
    .where(
      and(eq(schema.userRoles.userId, user.id), eq(schema.userRoles.tenantId, tenantId)),
    )
    .limit(1);
  if (!row) throw new Error("Sem permissão");
  assertCanAccessWhatsapp(user, tenantId);
  return user;
}

export async function handleCrmPromoUploadRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);

  // GET /api/crm/uploads/:tenantId/:filename
  const serveMatch = url.pathname.match(/^\/api\/crm\/uploads\/([^/]+)\/([^/]+)$/);
  if (serveMatch && request.method === "GET") {
    const [, tenantId, filename] = serveMatch;
    if (!safeFilename(filename)) {
      return new Response("Arquivo inválido", { status: 400 });
    }
    try {
      const filePath = path.join(uploadsRoot(), tenantId, filename);
      const buf = await readFile(filePath);
      const ext = filename.split(".").pop()?.toLowerCase();
      const type = ext === "png" ? "image/png" : "image/jpeg";
      return new Response(buf, {
        headers: {
          "Content-Type": type,
          "Cache-Control": "public, max-age=86400",
        },
      });
    } catch {
      return new Response("Não encontrado", { status: 404 });
    }
  }

  // POST /api/crm/promo-upload
  if (url.pathname !== "/api/crm/promo-upload" || request.method !== "POST") {
    return null;
  }

  try {
    const form = await request.formData();
    const tenantId = form.get("tenantId");
    const file = form.get("file");

    if (typeof tenantId !== "string" || !tenantId) {
      return Response.json({ error: "tenantId obrigatório" }, { status: 400 });
    }

    await assertCrmUploadAccess(request, tenantId);

    if (!(file instanceof File)) {
      return Response.json({ error: "Arquivo obrigatório" }, { status: 400 });
    }

    if (!ALLOWED.has(file.type)) {
      return Response.json(
        { error: "Use apenas imagens JPEG (.jpg) ou PNG (.png)" },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return Response.json({ error: "Imagem muito grande (máx. 5 MB)" }, { status: 400 });
    }

    const ext = EXT[file.type];
    const filename = `${randomUUID()}.${ext}`;
    const dir = path.join(uploadsRoot(), tenantId);
    await mkdir(dir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), buffer);

    const publicUrl = `/api/crm/uploads/${tenantId}/${filename}`;
    return Response.json({ url: publicUrl, filename, mime: file.type });
  } catch (e) {
    const msg = (e as Error).message;
    const status = msg === "Não autenticado" ? 401 : 400;
    return Response.json({ error: msg }, { status });
  }
}

/** Lê upload local do CRM e devolve data-URI (para Evolution/Z-API). */
export async function readCrmPromoAsDataUri(
  mediaPath: string,
): Promise<{ dataUri: string; mime: string } | null> {
  const match = mediaPath.match(/^\/api\/crm\/uploads\/([^/]+)\/([^/]+)$/);
  if (!match || !safeFilename(match[2])) return null;
  try {
    const buf = await readFile(path.join(uploadsRoot(), match[1], match[2]));
    const ext = match[2].split(".").pop()?.toLowerCase();
    const mime = ext === "png" ? "image/png" : "image/jpeg";
    return { dataUri: `data:${mime};base64,${buf.toString("base64")}`, mime };
  } catch {
    return null;
  }
}
