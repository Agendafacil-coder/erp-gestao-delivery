import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  CheckCircle2,
  Loader2,
  Receipt,
  RefreshCw,
  UtensilsCrossed,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  getSalonTabDetailFn,
  listSalonTablesFn,
  openSalonTabFn,
  transferSalonTabFn,
  updateSalonTabFn,
  type SalonTabDetail,
  type SalonTableItem,
} from "@/functions/salon";
import { SalonRoundDialog } from "@/components/salon/SalonRoundDialog";
import { formatBRL } from "@/lib/menu/format";
import { cn } from "@/lib/utils";

type Props = { tenantId: string };

const REFRESH_MS = 12_000;

type TableFilter = "all" | "free" | "busy";

function tableTone(table: SalonTableItem): string {
  if (table.open_tabs.length === 0) return "border-success/50 bg-success/[0.08]";
  if (table.open_tabs.some((t) => t.status === "conta_pedida"))
    return "border-warning/60 bg-warning/[0.14]";
  return "border-primary/50 bg-primary/[0.10]";
}

function tableLabel(table: SalonTableItem): string {
  if (table.open_tabs.length === 0) return "Livre";
  if (table.open_tabs.some((t) => t.status === "conta_pedida")) return "Conta";
  return "Ocupada";
}

/**
 * App do garçom — mapa thumb-first: abrir, pedir, conta e transferir mesa.
 */
export function WaiterMobileSalon({ tenantId }: Props) {
  const [tables, setTables] = useState<SalonTableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);
  const [tabDetail, setTabDetail] = useState<SalonTabDetail | null>(null);
  const [tabLoading, setTabLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [roundOpen, setRoundOpen] = useState(false);
  const [people, setPeople] = useState(2);
  const [filter, setFilter] = useState<TableFilter>("all");
  const [transferOpen, setTransferOpen] = useState(false);
  const [confirmBill, setConfirmBill] = useState(false);
  const [billJustRequested, setBillJustRequested] = useState(false);

  const loadTables = useCallback(async () => {
    try {
      const rows = await listSalonTablesFn({ data: { tenantId } });
      setTables(rows.filter((t) => t.active));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar mesas");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const loadTab = useCallback(
    async (tabId: string) => {
      setTabLoading(true);
      try {
        const detail = await getSalonTabDetailFn({ data: { tenantId, tabId } });
        setTabDetail(detail);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falha ao carregar comanda");
        setTabDetail(null);
      } finally {
        setTabLoading(false);
      }
    },
    [tenantId],
  );

  useEffect(() => {
    void loadTables();
    const t = setInterval(() => void loadTables(), REFRESH_MS);
    return () => clearInterval(t);
  }, [loadTables]);

  useEffect(() => {
    if (!selectedTabId) {
      setTabDetail(null);
      return;
    }
    void loadTab(selectedTabId);
  }, [selectedTabId, loadTab]);

  useEffect(() => {
    if (!billJustRequested) return;
    const t = setTimeout(() => setBillJustRequested(false), 4000);
    return () => clearTimeout(t);
  }, [billJustRequested]);

  const selectedTable = tables.find((t) => t.id === selectedTableId) ?? null;

  const stats = useMemo(() => {
    const free = tables.filter((t) => t.open_tabs.length === 0).length;
    const busyCount = tables.length - free;
    const open = tables.reduce((s, t) => s + t.open_tabs.length, 0);
    const awaitingBill = tables.filter((t) =>
      t.open_tabs.some((tab) => tab.status === "conta_pedida"),
    ).length;
    return { free, busy: busyCount, open, awaitingBill, total: tables.length };
  }, [tables]);

  const visibleTables = useMemo(() => {
    if (filter === "free") return tables.filter((t) => t.open_tabs.length === 0);
    if (filter === "busy") return tables.filter((t) => t.open_tabs.length > 0);
    return tables;
  }, [tables, filter]);

  const transferTargets = useMemo(
    () => tables.filter((t) => t.id !== selectedTableId),
    [tables, selectedTableId],
  );

  const selectTable = (table: SalonTableItem) => {
    setSelectedTableId(table.id);
    setSelectedTabId(table.open_tabs[0]?.id ?? null);
    setPeople(2);
    setTransferOpen(false);
    setConfirmBill(false);
  };

  const clearSelection = () => {
    setSelectedTableId(null);
    setSelectedTabId(null);
    setTabDetail(null);
    setTransferOpen(false);
    setConfirmBill(false);
  };

  const handleOpenTab = async () => {
    if (!selectedTable) return;
    setBusy(true);
    try {
      const created = await openSalonTabFn({
        data: { tenantId, tableId: selectedTable.id, peopleCount: people },
      });
      toast.success(`Mesa ${selectedTable.name} · comanda ${created.code}`);
      setSelectedTabId(created.id);
      await loadTables();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao abrir comanda");
    } finally {
      setBusy(false);
    }
  };

  const handleRequestBill = async () => {
    if (!selectedTabId || !tabDetail) return;
    setBusy(true);
    try {
      await updateSalonTabFn({
        data: { tenantId, tabId: selectedTabId, status: "conta_pedida" },
      });
      setConfirmBill(false);
      setBillJustRequested(true);
      toast.success(`Conta pedida · ${formatBRL(tabDetail.total)}`, {
        description: "O caixa já pode fechar esta mesa.",
        duration: 4500,
      });
      await loadTables();
      await loadTab(selectedTabId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao pedir conta");
    } finally {
      setBusy(false);
    }
  };

  const handleTransfer = async (targetTableId: string) => {
    if (!selectedTabId) return;
    const target = tables.find((t) => t.id === targetTableId);
    setBusy(true);
    try {
      await transferSalonTabFn({
        data: { tenantId, tabId: selectedTabId, tableId: targetTableId },
      });
      toast.success(`Comanda movida para Mesa ${target?.name ?? ""}`);
      setTransferOpen(false);
      setSelectedTableId(targetTableId);
      await loadTables();
      if (selectedTabId) await loadTab(selectedTabId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao transferir");
    } finally {
      setBusy(false);
    }
  };

  const canRequestBill =
    !!tabDetail &&
    tabDetail.status !== "conta_pedida" &&
    tabDetail.status !== "paga" &&
    tabDetail.status !== "cancelada";

  const billAlreadyRequested = tabDetail?.status === "conta_pedida";

  return (
    <div className="flex flex-col min-h-0 flex-1 max-w-lg mx-auto w-full">
      <div className="flex items-center justify-between gap-2 px-0.5 pb-2 shrink-0">
        <p className="text-xs text-muted-foreground">
          {stats.free} livres · {stats.busy} ocupadas
          {stats.awaitingBill > 0 ? ` · ${stats.awaitingBill} conta` : ""}
        </p>
        <button
          type="button"
          onClick={() => void loadTables()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border/50 px-3 py-2 text-xs min-h-10"
        >
          <RefreshCw className={cn("size-3.5", loading && tables.length > 0 && "animate-spin")} />
          Atualizar
        </button>
      </div>

      <div className="flex gap-1.5 pb-3 shrink-0 overflow-x-auto">
        {(
          [
            ["all", "Todas"],
            ["free", "Livres"],
            ["busy", "Ocupadas"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition",
              filter === value
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/50 text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {billJustRequested ? (
        <div className="mb-3 flex items-start gap-2 rounded-2xl border border-success/30 bg-success/10 px-3 py-2.5 text-sm shrink-0">
          <CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">Conta enviada ao caixa</p>
            <p className="text-xs text-muted-foreground">
              A mesa fica marcada até o fechamento.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex-1 min-h-0 overflow-y-auto pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))]">
        {loading && tables.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Carregando mesas…
          </div>
        ) : tables.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 px-4 py-12 text-center text-sm text-muted-foreground">
            Nenhuma mesa ativa. Peça ao caixa para cadastrar mesas no salão.
          </div>
        ) : visibleTables.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">
            Nenhuma mesa neste filtro.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {visibleTables.map((table) => {
              const selected = table.id === selectedTableId;
              const total = table.open_tabs.reduce((s, t) => s + t.total, 0);
              const awaiting = table.open_tabs.some((t) => t.status === "conta_pedida");
              return (
                <button
                  key={table.id}
                  type="button"
                  onClick={() => selectTable(table)}
                  className={cn(
                    "min-h-[6.75rem] rounded-2xl border-2 p-3.5 text-left transition active:scale-[0.98]",
                    tableTone(table),
                    selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                  )}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-base font-bold leading-tight">Mesa {table.name}</span>
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wide",
                        awaiting ? "text-warning" : "opacity-80",
                      )}
                    >
                      {tableLabel(table)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground flex items-center gap-1">
                    <Users className="size-3" />
                    {table.capacity}
                    {table.area ? ` · ${table.area}` : ""}
                  </p>
                  {table.open_tabs.length > 0 ? (
                    <p className="mt-2 text-sm font-semibold tabular-nums">{formatBRL(total)}</p>
                  ) : (
                    <p className="mt-2 text-[11px] text-muted-foreground">Toque para abrir</p>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {selectedTable ? (
          <div className="mt-3 rounded-2xl border border-border/60 bg-card p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Mesa {selectedTable.name}</h2>
              <button
                type="button"
                onClick={clearSelection}
                className="ops-icon-btn size-9 text-muted-foreground"
                aria-label="Fechar detalhe"
              >
                <X className="size-4" />
              </button>
            </div>

            {selectedTable.open_tabs.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-1 px-1">
                {selectedTable.open_tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedTabId(tab.id)}
                    className={cn(
                      "shrink-0 rounded-xl border px-3 py-2.5 text-xs font-medium min-h-11",
                      selectedTabId === tab.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50",
                    )}
                  >
                    {tab.code} · {formatBRL(tab.total)}
                    {tab.status === "conta_pedida" ? " · conta" : ""}
                  </button>
                ))}
              </div>
            ) : null}

            {tabLoading && !tabDetail ? (
              <p className="text-xs text-muted-foreground flex items-center gap-2 py-2">
                <Loader2 className="size-3.5 animate-spin" />
                Carregando comanda…
              </p>
            ) : tabDetail ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{tabDetail.code}</span>
                  <span className="font-semibold tabular-nums text-base">
                    {formatBRL(tabDetail.total)}
                  </span>
                </div>

                {billAlreadyRequested ? (
                  <div className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
                    <p className="font-medium text-foreground">Conta pedida — aguardando caixa</p>
                    <p className="text-muted-foreground mt-0.5">
                      Total {formatBRL(tabDetail.total)}. Não é preciso pedir de novo.
                    </p>
                  </div>
                ) : null}

                <ul className="max-h-36 overflow-y-auto space-y-1.5 text-xs border-t border-border/40 pt-2">
                  {tabDetail.rounds.length === 0 ? (
                    <li className="text-muted-foreground py-1">
                      Nenhum item ainda — use Pedir para lançar na cozinha.
                    </li>
                  ) : (
                    tabDetail.rounds.flatMap((r) =>
                      r.items.map((item, idx) => (
                        <li key={`${r.id}-${idx}`} className="flex justify-between gap-2">
                          <span className="truncate">
                            {item.quantity}× {item.name}
                          </span>
                          <span className="tabular-nums text-muted-foreground shrink-0">
                            {formatBRL(item.unit_price * item.quantity)}
                          </span>
                        </li>
                      )),
                    )
                  )}
                </ul>

                {!billAlreadyRequested && tabDetail.rounds.length > 0 ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setTransferOpen((v) => !v)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary min-h-10"
                  >
                    <ArrowRightLeft className="size-3.5" />
                    Transferir de mesa
                  </button>
                ) : null}

                {transferOpen ? (
                  <div className="rounded-xl border border-border/50 bg-muted/15 p-2 space-y-1.5">
                    <p className="text-[11px] text-muted-foreground px-1">Mover para:</p>
                    <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
                      {transferTargets.length === 0 ? (
                        <p className="col-span-3 text-xs text-muted-foreground px-1 py-2">
                          Sem outras mesas.
                        </p>
                      ) : (
                        transferTargets.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            disabled={busy}
                            onClick={() => void handleTransfer(t.id)}
                            className="rounded-xl border border-border/50 bg-background px-2 py-2.5 text-xs font-medium min-h-11 active:bg-muted"
                          >
                            {t.name}
                            {t.open_tabs.length > 0 ? (
                              <span className="block text-[10px] text-muted-foreground font-normal">
                                ocupada
                              </span>
                            ) : null}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : selectedTable.open_tabs.length === 0 ? (
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground block">
                  Quantas pessoas?
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={people}
                    onChange={(e) => setPeople(Number(e.target.value) || 1)}
                    className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3 text-base"
                  />
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Depois use <strong className="text-foreground font-medium">Abrir</strong> na barra
                  de baixo.
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-center text-xs text-muted-foreground px-4">
            Toque em uma mesa para abrir comanda, lançar pedido ou pedir a conta.
          </p>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-md px-3 pt-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))]">
        {confirmBill && tabDetail ? (
          <div className="mx-auto max-w-lg mb-2.5 rounded-2xl border border-warning/40 bg-warning/10 p-3 space-y-2">
            <p className="text-sm font-medium">
              Pedir conta · Mesa {selectedTable?.name} · {formatBRL(tabDetail.total)}?
            </p>
            <p className="text-[11px] text-muted-foreground">
              O caixa será avisado. A mesa fica marcada até o pagamento.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmBill(false)}
                className="rounded-xl border border-border/50 py-2.5 text-xs font-medium min-h-11"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleRequestBill()}
                className="rounded-xl bg-warning text-warning-foreground py-2.5 text-xs font-semibold min-h-11 disabled:opacity-50"
              >
                {busy ? <Loader2 className="size-3.5 animate-spin mx-auto" /> : "Confirmar"}
              </button>
            </div>
          </div>
        ) : null}
        <div className="mx-auto max-w-lg grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={busy || !selectedTable || selectedTable.open_tabs.length > 0}
            onClick={() => void handleOpenTab()}
            className="flex flex-col items-center justify-center gap-0.5 min-h-[3.35rem] rounded-2xl bg-success text-success-foreground text-[11px] font-semibold disabled:opacity-35"
          >
            <Receipt className="size-5" />
            Abrir
          </button>
          <button
            type="button"
            disabled={busy || !selectedTabId || billAlreadyRequested}
            onClick={() => setRoundOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 min-h-[3.35rem] rounded-2xl bg-primary text-primary-foreground text-[11px] font-semibold disabled:opacity-35"
          >
            <UtensilsCrossed className="size-5" />
            Pedir
          </button>
          <button
            type="button"
            disabled={busy || !canRequestBill}
            onClick={() => setConfirmBill(true)}
            className="flex flex-col items-center justify-center gap-0.5 min-h-[3.35rem] rounded-2xl bg-warning text-warning-foreground text-[11px] font-semibold disabled:opacity-35"
          >
            <Wallet className="size-5" />
            {billAlreadyRequested ? "Pedida" : "Conta"}
          </button>
        </div>
      </div>

      {selectedTabId ? (
        <SalonRoundDialog
          open={roundOpen}
          onOpenChange={setRoundOpen}
          tenantId={tenantId}
          tabId={selectedTabId}
          tabLabel={selectedTable ? `Mesa ${selectedTable.name}` : "Comanda"}
          onAdded={() => {
            void loadTables();
            if (selectedTabId) void loadTab(selectedTabId);
          }}
        />
      ) : null}
    </div>
  );
}
