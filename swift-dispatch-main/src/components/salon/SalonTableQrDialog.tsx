import { useMemo } from "react";
import { Copy, Printer, QrCode } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableName: string;
  /** URL absoluta do cardápio com ?mesa= */
  menuUrl: string;
};

export function SalonTableQrDialog({ open, onOpenChange, tableName, menuUrl }: Props) {
  const qrSrc = useMemo(() => {
    if (!menuUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&data=${encodeURIComponent(menuUrl)}`;
  }, [menuUrl]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(menuUrl);
      toast.success("Link da mesa copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const printQr = () => {
    const win = window.open("", "_blank", "noopener,noreferrer,width=420,height=560");
    if (!win) {
      toast.error("Permita pop-ups para imprimir o QR");
      return;
    }
    win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/><title>QR Mesa ${tableName}</title>
<style>
  body{font-family:system-ui,sans-serif;text-align:center;padding:24px;color:#111}
  h1{font-size:22px;margin:0 0 8px} p{font-size:12px;color:#555;word-break:break-all}
  img{width:280px;height:280px;margin:16px auto;display:block}
</style></head><body>
  <h1>Mesa ${tableName}</h1>
  <p>Escaneie para ver o cardápio</p>
  <img src="${qrSrc}" alt="QR Mesa ${tableName}" />
  <p>${menuUrl}</p>
  <script>window.onload=function(){window.print()}<\/script>
</body></html>`);
    win.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="size-4 text-primary" />
            QR da Mesa {tableName}
          </DialogTitle>
          <DialogDescription>
            Cliente escaneia e abre o cardápio com a mesa marcada. O garçom confirma o pedido no
            salão.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          {qrSrc ? (
            <img
              src={qrSrc}
              alt={`QR Mesa ${tableName}`}
              className="size-56 rounded-xl border border-border bg-white p-2"
            />
          ) : null}
          <p className="text-[11px] text-muted-foreground text-center break-all px-2">{menuUrl}</p>
          <div className="flex flex-wrap gap-2 w-full">
            <button type="button" onClick={() => void copyLink()} className="erp-btn-secondary flex-1 text-xs">
              <Copy className="size-3.5" />
              Copiar link
            </button>
            <button type="button" onClick={printQr} className="erp-btn-primary flex-1 text-xs">
              <Printer className="size-3.5" />
              Imprimir QR
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function buildSalonTableMenuUrl(
  origin: string,
  tenantSlug: string,
  table: { name: string; public_token: string | null },
): string {
  const mesa = table.public_token?.trim() || table.name.trim();
  return `${origin.replace(/\/$/, "")}/${tenantSlug}?mesa=${encodeURIComponent(mesa)}`;
}
