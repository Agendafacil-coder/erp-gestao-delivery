import { useEffect, useRef, useState } from "react";
import { ExternalLink, ImagePlus, Loader2, Sparkles, X } from "lucide-react";
import { updateMenuBrandingFn, type PublicMenuPayload } from "@/functions/menu";
import { pickMenuPlaceholderImage } from "@/lib/menu/menu-placeholders";
import { uploadMenuImage, validateMenuImageFile } from "@/lib/menu/upload-menu-image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type MenuBrandingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
  menuUrl: string;
  settings: PublicMenuPayload["settings"];
  onSettingsChange: (settings: PublicMenuPayload["settings"]) => void;
};

export function MenuBrandingDialog({
  open,
  onOpenChange,
  tenantId,
  tenantName,
  menuUrl,
  settings,
  onSettingsChange,
}: MenuBrandingDialogProps) {
  const [logoUrl, setLogoUrl] = useState(settings.menu_logo_url ?? "");
  const [coverUrl, setCoverUrl] = useState(settings.menu_cover_url ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const logoUrlRef = useRef(logoUrl);
  const coverUrlRef = useRef(coverUrl);

  useEffect(() => {
    logoUrlRef.current = logoUrl;
  }, [logoUrl]);

  useEffect(() => {
    coverUrlRef.current = coverUrl;
  }, [coverUrl]);

  useEffect(() => {
    if (!open) return;
    const nextLogo = settings.menu_logo_url ?? "";
    const nextCover = settings.menu_cover_url ?? "";
    setLogoUrl(nextLogo);
    setCoverUrl(nextCover);
    logoUrlRef.current = nextLogo;
    coverUrlRef.current = nextCover;
  }, [open, settings.menu_logo_url, settings.menu_cover_url]);

  const persist = async (patch: { menuLogoUrl: string | null; menuCoverUrl: string | null }) => {
    setSaving(true);
    try {
      const updated = await updateMenuBrandingFn({
        data: {
          tenantId,
          menuLogoUrl: patch.menuLogoUrl,
          menuCoverUrl: patch.menuCoverUrl,
        },
      });
      onSettingsChange(updated);
      toast.success("Aparência atualizada");
    } finally {
      setSaving(false);
    }
  };

  const revertLogo = (value: string) => {
    setLogoUrl(value);
    logoUrlRef.current = value;
  };

  const revertCover = (value: string) => {
    setCoverUrl(value);
    coverUrlRef.current = value;
  };

  const uploadAsset = async (kind: "logo" | "cover", file: File) => {
    try {
      validateMenuImageFile(file);
    } catch (e) {
      toast.error((e as Error).message);
      return;
    }

    const prevValue = kind === "logo" ? logoUrlRef.current : coverUrlRef.current;
    setUploading(kind);
    try {
      const url = await uploadMenuImage(tenantId, file);
      if (kind === "logo") {
        setLogoUrl(url);
        logoUrlRef.current = url;
        await persist({ menuLogoUrl: url, menuCoverUrl: coverUrlRef.current || null });
      } else {
        setCoverUrl(url);
        coverUrlRef.current = url;
        await persist({ menuLogoUrl: logoUrlRef.current || null, menuCoverUrl: url });
      }
    } catch (e) {
      if (kind === "logo") revertLogo(prevValue);
      else revertCover(prevValue);
      toast.error((e as Error).message);
    } finally {
      setUploading(null);
    }
  };

  const removeAsset = async (kind: "logo" | "cover") => {
    const prevValue = kind === "logo" ? logoUrlRef.current : coverUrlRef.current;
    setUploading(kind);
    try {
      if (kind === "logo") {
        setLogoUrl("");
        logoUrlRef.current = "";
        await persist({ menuLogoUrl: null, menuCoverUrl: coverUrlRef.current || null });
      } else {
        setCoverUrl("");
        coverUrlRef.current = "";
        await persist({ menuLogoUrl: logoUrlRef.current || null, menuCoverUrl: null });
      }
    } catch (e) {
      if (kind === "logo") revertLogo(prevValue);
      else revertCover(prevValue);
      toast.error((e as Error).message);
    } finally {
      setUploading(null);
    }
  };

  const previewCover =
    coverUrl.trim() ||
    pickMenuPlaceholderImage({ name: tenantName, categoryName: "burger", id: tenantName });
  const previewLogo = logoUrl.trim() || null;
  const initial = tenantName.charAt(0).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="space-y-1 border-b border-border px-5 py-4 text-left">
          <DialogTitle className="text-base font-semibold">Personalizar cardápio público</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Capa e logo que o cliente vê ao abrir o link da loja
          </p>
        </DialogHeader>

        <div className="space-y-5 px-5 py-5">
          <div className="mx-auto w-full max-w-[17.5rem]">
            <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Prévia
            </p>
            <div className="overflow-hidden rounded-[1.35rem] border border-border bg-background shadow-lg ring-1 ring-white/[0.04]">
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploading === "cover" || saving}
                className="group relative block h-28 w-full overflow-hidden"
              >
                <img src={previewCover} alt="" className="size-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {uploading === "cover" ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    "Alterar capa"
                  )}
                </span>
              </button>

              <div className="relative -mt-8 px-3 pb-3">
                <div className="rounded-xl border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploading === "logo" || saving}
                      className="group relative size-11 shrink-0 overflow-hidden rounded-xl bg-primary text-base font-bold text-primary-foreground"
                    >
                      {previewLogo ? (
                        <img src={previewLogo} alt="" className="size-full object-cover" />
                      ) : (
                        <span className="flex size-full items-center justify-center">{initial}</span>
                      )}
                      <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[9px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                        {uploading === "logo" ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          "Logo"
                        )}
                      </span>
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{tenantName}</p>
                      <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Sparkles className="size-2.5 text-primary" />
                        Cardápio online
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <AssetAction
              label="Capa"
              hint="1200×600 recomendado"
              hasValue={Boolean(coverUrl)}
              busy={uploading === "cover" || saving}
              onPick={() => coverInputRef.current?.click()}
              onRemove={() => void removeAsset("cover")}
            />
            <AssetAction
              label="Logo"
              hint="512×512 recomendado"
              hasValue={Boolean(logoUrl)}
              busy={uploading === "logo" || saving}
              onPick={() => logoInputRef.current?.click()}
              onRemove={() => void removeAsset("logo")}
            />
          </div>

          {!logoUrl && !coverUrl ? (
            <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
              Sem personalização, o cardápio usa fotos dos destaques automaticamente.
            </p>
          ) : null}

          <a
            href={menuUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            Abrir cardápio público
            <ExternalLink className="size-3.5" />
          </a>
        </div>

        <input
          ref={coverInputRef}
          type="file"
          accept="image/jpeg,image/png,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadAsset("cover", file);
            e.target.value = "";
          }}
        />
        <input
          ref={logoInputRef}
          type="file"
          accept="image/jpeg,image/png,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadAsset("logo", file);
            e.target.value = "";
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function AssetAction({
  label,
  hint,
  hasValue,
  busy,
  onPick,
  onRemove,
}: {
  label: string;
  hint: string;
  hasValue: boolean;
  busy: boolean;
  onPick: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium">{label}</p>
          <p className="text-[10px] text-muted-foreground">{hint}</p>
        </div>
        {busy ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" /> : null}
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onPick}
          disabled={busy}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1.5 text-[11px] font-medium hover:bg-muted/50 disabled:opacity-50"
        >
          <ImagePlus className="size-3.5" />
          {hasValue ? "Trocar" : "Enviar"}
        </button>
        {hasValue ? (
          <button
            type="button"
            onClick={onRemove}
            disabled={busy}
            className="inline-flex items-center justify-center rounded-lg border border-border px-2 py-1.5 text-muted-foreground hover:text-danger disabled:opacity-50"
            aria-label={`Remover ${label.toLowerCase()}`}
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
