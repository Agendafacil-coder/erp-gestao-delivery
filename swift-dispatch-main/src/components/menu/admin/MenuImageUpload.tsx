import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

type MenuImageUploadProps = {
  tenantId: string;
  value: string;
  onChange: (url: string) => void;
};

export function MenuImageUpload({ tenantId, value, onChange }: MenuImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);

  useEffect(() => {
    setPreview(value || null);
  }, [value]);

  const upload = async (file: File) => {
    const allowed = ["image/jpeg", "image/png"];
    if (!allowed.includes(file.type)) {
      toast.error("Envie apenas JPEG ou PNG");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 5 MB)");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("tenantId", tenantId);
      form.append("file", file);

      const res = await fetch("/api/menu/upload", {
        method: "POST",
        body: form,
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha no upload");

      onChange(data.url);
      setPreview(data.url);
      toast.success("Foto enviada");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void upload(file);
  };

  const clear = () => {
    onChange("");
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">Foto do produto</label>
      <p className="text-[11px] text-muted-foreground">JPEG ou PNG · até 5 MB</p>

      <div className="flex flex-wrap items-start gap-4">
        <div className="size-28 rounded-2xl border border-dashed border-border bg-surface/50 overflow-hidden flex items-center justify-center shrink-0">
          {preview ? (
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <ImagePlus className="size-8 text-muted-foreground/50" />
          )}
        </div>

        <div className="flex flex-col gap-2 min-w-[200px]">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,.jpg,.jpeg,.png"
            className="hidden"
            onChange={onFileChange}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-surface-elevated/50 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImagePlus className="size-4" />
            )}
            {uploading ? "Enviando…" : preview ? "Trocar foto" : "Enviar foto"}
          </button>
          {preview && (
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-danger"
            >
              <X className="size-3.5" />
              Remover foto
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
