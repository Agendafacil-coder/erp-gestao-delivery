import { useMemo, useState } from "react";
import { FileUp, Upload } from "lucide-react";
import { importMenuItemsFn } from "@/functions/menu";
import { parseMenuImportCsv } from "@/lib/menu/menu-import";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SAMPLE_CSV = `categoria;nome;preco;descricao;estoque;estoque_minimo;destaque;combo;bebida
Lanches;X-Burger;32,90;Hambúrguer artesanal;50;10;sim;nao;nao
Bebidas;Suco natural;8,00;Laranja ou limão;;0;nao;nao;sim`;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  onImported: () => Promise<void>;
};

export function MenuImportDialog({ open, onOpenChange, tenantId, onImported }: Props) {
  const [csv, setCsv] = useState(SAMPLE_CSV);
  const [importing, setImporting] = useState(false);

  const preview = useMemo(() => parseMenuImportCsv(csv), [csv]);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    setCsv(text);
  };

  const runImport = async () => {
    if (!preview.rows.length) {
      toast.error(preview.errors[0] ?? "CSV inválido");
      return;
    }
    setImporting(true);
    try {
      const result = await importMenuItemsFn({ data: { tenantId, csv } });
      await onImported();
      const msg = [
        `${result.created.length} produto(s) importado(s)`,
        result.categoriesCreated > 0
          ? `${result.categoriesCreated} categoria(s) criada(s)`
          : null,
      ]
        .filter(Boolean)
        .join(" · ");
      toast.success(msg);
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} aviso(s): ${result.errors.slice(0, 2).join("; ")}`);
      }
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar produtos (CSV)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground leading-relaxed">
            Colunas: <span className="font-medium text-foreground">categoria, nome, preço</span>{" "}
            (obrigatórias). Opcionais: descrição, estoque, estoque_minimo, destaque, combo, bebida.
            Aceita vírgula ou ponto-e-vírgula. Categorias novas são criadas automaticamente.
          </p>

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-6 text-muted-foreground transition hover:border-primary/40 hover:bg-muted/30">
            <FileUp className="size-4" />
            <span>Selecionar arquivo .csv</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={10}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-xs leading-relaxed outline-none focus:ring-1 focus:ring-primary/40"
            spellCheck={false}
          />

          <div className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5 space-y-1">
            <p className="text-xs font-medium">
              Prévia:{" "}
              <span className={cn(preview.rows.length > 0 ? "text-success" : "text-muted-foreground")}>
                {preview.rows.length}{" "}
                {preview.rows.length === 1 ? "linha válida" : "linhas válidas"}
              </span>
            </p>
            {preview.errors.length > 0 ? (
              <ul className="text-[11px] text-warning space-y-0.5 max-h-24 overflow-y-auto">
                {preview.errors.slice(0, 8).map((err) => (
                  <li key={err}>{err}</li>
                ))}
                {preview.errors.length > 8 ? (
                  <li>… e mais {preview.errors.length - 8} aviso(s)</li>
                ) : null}
              </ul>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              onClick={() => setCsv(SAMPLE_CSV)}
              className="erp-btn-secondary text-xs"
            >
              Restaurar exemplo
            </button>
            <button
              type="button"
              disabled={importing || preview.rows.length === 0}
              onClick={() => void runImport()}
              className="erp-btn-primary text-xs"
            >
              <Upload className={cn("size-3.5", importing && "animate-pulse")} />
              {importing ? "Importando…" : `Importar ${preview.rows.length || ""}`}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
