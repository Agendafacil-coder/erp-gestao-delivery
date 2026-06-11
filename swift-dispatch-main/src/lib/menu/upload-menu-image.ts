const ALLOWED_TYPES = ["image/jpeg", "image/png"];
const MAX_BYTES = 5 * 1024 * 1024;

/** Validação síncrona — chame antes de `setUploading` para não piscar o spinner */
export function validateMenuImageFile(file: File): void {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Envie apenas JPEG ou PNG");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Imagem muito grande (máx. 5 MB)");
  }
}

export async function uploadMenuImage(tenantId: string, file: File): Promise<string> {
  validateMenuImageFile(file);

  const form = new FormData();
  form.append("tenantId", tenantId);
  form.append("file", file);

  const res = await fetch("/api/menu/upload", {
    method: "POST",
    body: form,
    credentials: "include",
  });

  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Falha no upload");
  if (!data.url) throw new Error("Falha no upload");
  return data.url;
}
