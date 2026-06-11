import { useEffect, useRef, useState } from "react";
import { Check, ExternalLink, ImagePlus, Loader2, X } from "lucide-react";
import { updateMenuBrandingFn, type PublicMenuPayload } from "@/functions/menu";
import { MenuBrandingPreview } from "@/components/menu/admin/MenuBrandingPreview";
import { MENU_LAYOUTS } from "@/components/menu/public/menu-layout";
import { pickMenuPlaceholderImage } from "@/lib/menu/menu-placeholders";
import type { MenuLayoutId } from "@/lib/menu/public-settings";
import { cn } from "@/lib/utils";
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
  const [layout, setLayout] = useState<MenuLayoutId>(settings.menu_layout ?? "classic");
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
    setLayout(settings.menu_layout ?? "classic");
    logoUrlRef.current = nextLogo;
    coverUrlRef.current = nextCover;
  }, [open, settings.menu_logo_url, settings.menu_cover_url, settings.menu_layout]);

  const persist = async (patch: {
    menuLogoUrl?: string | null;
    menuCoverUrl?: string | null;
    menuLayout?: MenuLayoutId;
  }) => {
    setSaving(true);
    try {
      const updated = await updateMenuBrandingFn({
        data: {
          tenantId,
          menuLogoUrl: patch.menuLogoUrl,
          menuCoverUrl: patch.menuCoverUrl,
          menuLayout: patch.menuLayout,
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

  const selectLayout = async (next: MenuLayoutId) => {
    if (next === layout || saving) return;
    const prev = layout;
    setLayout(next);
    try {
      await persist({
        menuLogoUrl: logoUrlRef.current || null,
        menuCoverUrl: coverUrlRef.current || null,
        menuLayout: next,
      });
    } catch {
      setLayout(prev);
    }
  };

  const previewCover =
    coverUrl.trim() ||
    pickMenuPlaceholderImage({ name: tenantName, categoryName: "burger", id: tenantName });
  const previewLogo = logoUrl.trim() || null;

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
              Prévia ao vivo · {MENU_LAYOUTS[layout].label}
            </p>
            <MenuBrandingPreview
              layoutId={layout}
              tenantName={tenantName}
              coverUrl={previewCover}
              logoUrl={previewLogo}
              coverBusy={uploading === "cover" || saving}
              logoBusy={uploading === "logo" || saving}
              onPickCover={() => coverInputRef.current?.click()}
              onPickLogo={() => logoInputRef.current?.click()}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium">Modelo do cardápio</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.values(MENU_LAYOUTS) as (typeof MENU_LAYOUTS)[MenuLayoutId][]).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  disabled={saving}
                  onClick={() => void selectLayout(option.id)}
                  className={cn(
                    "relative rounded-xl border px-3 py-3 text-left transition-colors",
                    layout === option.id
                      ? "border-primary bg-primary/8 ring-1 ring-primary/25"
                      : "border-border bg-muted/20 hover:bg-muted/40",
                  )}
                >
                  {layout === option.id ? (
                    <span className="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-2.5" />
                    </span>
                  ) : null}
                  <LayoutPreviewIcon layoutId={option.id} />
                  <p className="mt-2 text-xs font-semibold">{option.label}</p>
                  <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                    {option.description}
                  </p>
                </button>
              ))}
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

function LayoutPreviewIcon({ layoutId }: { layoutId: MenuLayoutId }) {
  if (layoutId === "gallery") {
    return (
      <div className="grid grid-cols-2 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="overflow-hidden rounded-md border border-border/60 bg-muted/30">
            <div className="aspect-square bg-muted" />
            <div className="space-y-0.5 p-1">
              <div className="h-1.5 w-full rounded-sm bg-muted-foreground/20" />
              <div className="h-2 w-2/3 rounded-sm bg-primary/25" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (layoutId === "clean") {
    return (
      <div className="space-y-1.5 rounded-md border border-border bg-white p-1.5 shadow-sm">
        <div className="h-2 w-2/3 rounded-sm bg-muted/80" />
        <div className="flex gap-1">
          {[0, 1].map((i) => (
            <div key={i} className="h-4 flex-1 rounded-full bg-muted/50" />
          ))}
        </div>
        <div className="rounded-md border border-border/80 p-1">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-1 py-0.5">
              <div className="size-3 shrink-0 rounded-sm bg-muted" />
              <div className="h-2 flex-1 rounded-sm bg-muted/60" />
              <div className="size-3 shrink-0 rounded-full bg-primary/30" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-1 rounded-md border border-border bg-background p-1.5">
      <div className="h-3 rounded-sm bg-muted" />
      {[0, 1].map((i) => (
        <div key={i} className="flex gap-1">
          <div className="h-5 flex-1 rounded-sm bg-muted/80" />
          <div className="size-5 shrink-0 rounded-md bg-muted" />
        </div>
      ))}
    </div>
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
