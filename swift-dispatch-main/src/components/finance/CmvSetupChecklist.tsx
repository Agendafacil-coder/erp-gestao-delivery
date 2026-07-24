import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, PiggyBank, X } from "lucide-react";
import { toast } from "sonner";
import { patchMenuItemFn } from "@/functions/menu";
import { fmtBRL } from "@/lib/format/currency";
import { marginPct, type InventoryMenuItem } from "@/lib/finance/inventorySummary";
import { cn } from "@/lib/utils";

const GOAL = 10;
const DISMISS_PREFIX = "cmv_setup_dismissed_at_";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type Props = {
  tenantId: string;
  items: InventoryMenuItem[];
  onSaved?: () => void;
  /** compact = banner no Resumo; full = checklist com inputs em Custos */
  variant?: "full" | "compact";
  onOpenCustos?: () => void;
};

function isDismissed(tenantId: string): boolean {
  try {
    const raw = localStorage.getItem(`${DISMISS_PREFIX}${tenantId}`);
    if (!raw) return false;
    // legado: "1" → trata como dismissido agora e reescreve timestamp
    if (raw === "1") {
      localStorage.setItem(`${DISMISS_PREFIX}${tenantId}`, String(Date.now()));
      return true;
    }
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function setDismissed(tenantId: string) {
  try {
    localStorage.setItem(`${DISMISS_PREFIX}${tenantId}`, String(Date.now()));
  } catch {
    /* ignore */
  }
}

function clearDismissed(tenantId: string) {
  try {
    localStorage.removeItem(`${DISMISS_PREFIX}${tenantId}`);
  } catch {
    /* ignore */
  }
}

/**
 * Onboarding CMV: cadastre o custo dos primeiros produtos (meta: 10)
 * para o Resumo/DRE usarem margem real em vez da estimativa de 65%.
 */
export function CmvSetupChecklist({
  tenantId,
  items,
  onSaved,
  variant = "full",
  onOpenCustos,
}: Props) {
  const [dismissed, setDismissedState] = useState(() => isDismissed(tenantId));
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    setDismissedState(isDismissed(tenantId));
  }, [tenantId]);

  const withCost = items.filter((i) => i.unit_cost != null && i.unit_cost > 0).length;
  const withoutCost = useMemo(() => {
    return items
      .filter((i) => i.unit_cost == null || i.unit_cost <= 0)
      .sort((a, b) => {
        if (a.available !== b.available) return a.available ? -1 : 1;
        return a.name.localeCompare(b.name, "pt-BR");
      })
      .slice(0, GOAL);
  }, [items]);

  const progress = Math.min(GOAL, withCost);
  const done = withoutCost.length === 0 || withCost >= GOAL;

  if (items.length === 0) return null;
  if (dismissed) return null;

  if (done) {
    if (variant === "compact") return null;
    return (
      <div className="rounded-2xl border border-success/30 bg-success/10 px-4 py-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 text-sm">
          <CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">CMV pronto para o dia a dia</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {withCost} produto(s) com custo. O Resumo e o DRE usam margem real nas entregas.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setDismissed(tenantId);
            setDismissedState(true);
          }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Ok
        </button>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="rounded-2xl border border-warning/35 bg-warning/[0.08] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2 text-sm min-w-0">
          <PiggyBank className="size-4 text-warning shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-medium text-foreground">
              Cadastre o custo de {Math.min(GOAL - withCost, withoutCost.length)} produto(s)
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Meta: {GOAL} itens com custo ({progress}/{GOAL}). Sem isso, o lucro usa estimativa de
              65%.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setDismissed(tenantId);
              setDismissedState(true);
            }}
            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
          >
            Depois
          </button>
          {onOpenCustos ? (
            <button
              type="button"
              onClick={onOpenCustos}
              className="erp-btn-primary text-xs h-9 px-3"
            >
              Cadastrar custos
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const saveCost = async (item: InventoryMenuItem) => {
    const raw = drafts[item.id] ?? "";
    const value = Number(raw.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Informe um custo válido (ex.: 12,50)");
      return;
    }
    if (value >= item.price) {
      toast.message("Custo maior ou igual ao preço — confira se está certo", {
        description: `Preço de venda: ${fmtBRL(item.price)}`,
      });
    }
    setSavingId(item.id);
    try {
      await patchMenuItemFn({
        data: { tenantId, itemId: item.id, unitCost: value },
      });
      toast.success(`Custo de ${item.name} salvo`);
      setDrafts((d) => {
        const next = { ...d };
        delete next[item.id];
        return next;
      });
      clearDismissed(tenantId);
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar custo");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-primary/25 bg-primary/[0.05] p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <PiggyBank className="size-4 text-primary" />
            Checklist CMV — primeiros {GOAL} produtos
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Cadastre o custo unitário dos itens principais. Em poucos minutos o DRE deixa de usar a
            estimativa de 65% e mostra margem real.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDismissed(tenantId);
            setDismissedState(true);
          }}
          className="ops-icon-btn size-8 text-muted-foreground"
          aria-label="Dispensar"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(progress / GOAL) * 100}%` }}
          />
        </div>
        <span className="text-xs font-semibold tabular-nums text-primary shrink-0">
          {progress}/{GOAL}
        </span>
      </div>

      <ul className="space-y-2">
        {withoutCost.map((item, index) => {
          const draft = drafts[item.id] ?? "";
          const preview = draft ? Number(draft.replace(",", ".")) : null;
          const margin =
            preview != null && Number.isFinite(preview) && preview > 0
              ? marginPct(item.price, preview)
              : null;
          return (
            <li
              key={item.id}
              className="rounded-xl border border-border/50 bg-background/80 px-3 py-2.5 space-y-2"
            >
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium truncate">
                  <span className="text-muted-foreground tabular-nums mr-1.5">{index + 1}.</span>
                  {item.name}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  vende {fmtBRL(item.price)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Custo R$"
                  value={draft}
                  onChange={(e) =>
                    setDrafts((d) => ({ ...d, [item.id]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void saveCost(item);
                  }}
                  className="h-9 w-28 rounded-lg border border-border bg-background px-3 text-sm tabular-nums"
                />
                {margin != null ? (
                  <span
                    className={cn(
                      "text-[11px] tabular-nums",
                      margin >= 40 ? "text-success" : margin >= 20 ? "text-warning" : "text-danger",
                    )}
                  >
                    margem {margin}%
                  </span>
                ) : null}
                <button
                  type="button"
                  disabled={savingId === item.id || !draft.trim()}
                  onClick={() => void saveCost(item)}
                  className="erp-btn-primary text-xs h-9 px-3 disabled:opacity-50 ml-auto"
                >
                  {savingId === item.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    "Salvar"
                  )}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
