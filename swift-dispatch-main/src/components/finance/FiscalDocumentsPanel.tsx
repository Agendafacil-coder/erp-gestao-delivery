import { useCallback, useEffect, useState } from "react";
import { FileText, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  listFiscalDocumentsFn,
  type FiscalDocumentDto,
} from "@/functions/fiscal";
import { AppCard, AppCardHeader, AppCardTitle } from "@/components/design/AppCard";

type Props = {
  tenantId: string | undefined;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  pending: "Pendente",
  authorized: "Autorizada",
  rejected: "Rejeitada",
  cancelled: "Cancelada",
};

export function FiscalDocumentsPanel({ tenantId }: Props) {
  const [rows, setRows] = useState<FiscalDocumentDto[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const list = await listFiscalDocumentsFn({ data: { tenantId } });
      setRows(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar documentos fiscais");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!tenantId) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-muted/15 px-4 py-3 text-sm">
        <p className="font-medium text-foreground">NFC-e em preparação</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          A base de documentos fiscais já está pronta. A emissão automática na SEFAZ (NFC-e) será
          liberada em breve — por enquanto use o CSV do fechamento diário para o contador.
        </p>
      </div>

      <AppCard>
        <AppCardHeader className="border-b border-border/40 flex flex-row items-center justify-between gap-3">
          <AppCardTitle className="flex items-center gap-2">
            <FileText className="size-4" />
            Documentos fiscais
          </AppCardTitle>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Atualizar
          </button>
        </AppCardHeader>
        <div className="p-3">
          {loading && rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Carregando…</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhum documento ainda. Quando a emissão estiver ativa, as NFC-e aparecerão aqui.
            </p>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-border/50 px-3 py-2 text-sm flex flex-wrap items-center justify-between gap-2"
                >
                  <div>
                    <span className="font-medium uppercase">{r.doc_type}</span>
                    {r.order_code ? (
                      <span className="text-muted-foreground ml-2">pedido {r.order_code}</span>
                    ) : null}
                    {r.number ? (
                      <span className="text-muted-foreground ml-2 font-mono text-xs">
                        nº {r.number}
                        {r.series ? `/${r.series}` : ""}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-xs rounded-md border border-border/60 px-2 py-0.5">
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </AppCard>
    </div>
  );
}
