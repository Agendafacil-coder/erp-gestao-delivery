import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Armchair,
  BadgeCheck,
  Ban,
  Loader2,
  Plus,
  Receipt,
  RefreshCw,
  Trash2,
  UserRound,
  Users,
  UtensilsCrossed,
  Wallet,
  Printer,
  ArrowRightLeft,
  Split,
  QrCode,
} from "lucide-react";
import { toast } from "sonner";
import {
  cancelSalonTabFn,
  closeSalonTabFn,
  createSalonTableFn,
  deleteSalonTableFn,
  getSalonTabDetailFn,
  listSalonTablesFn,
  openSalonTabFn,
  splitSalonTabFn,
  transferSalonTabFn,
  updateSalonTabFn,
  updateSalonTableFn,
  type SalonTabDetail,
  type SalonTableItem,
} from "@/functions/salon";
import { SalonRoundDialog } from "@/components/salon/SalonRoundDialog";
import {
  buildSalonTableMenuUrl,
  SalonTableQrDialog,
} from "@/components/salon/SalonTableQrDialog";
import { useAuthAccess } from "@/hooks/useAuthAccess";
import { formatBRL } from "@/lib/menu/format";
import { STATUS_LABEL, type OrderStatus } from "@/lib/ops/orderWorkflow";
import { printOrderLabels } from "@/lib/ops/printOrderLabels";
import type { LocalOrder } from "@/lib/db/localDb";
import { cn } from "@/lib/utils";
import { useTenant } from "@/hooks/useTenant";

type Props = { tenantId: string };

const PAYMENT_METHODS = ["Dinheiro", "Pix", "Cartão de crédito", "Cartão de débito", "Outro"];

const REFRESH_MS = 15_000;

function tableStateClasses(table: SalonTableItem): string {
  if (!table.active) return "border-border/40 bg-muted/20 opacity-60";
  if (table.open_tabs.length === 0)
    return "border-success/40 bg-success/[0.06] hover:border-success";
  if (table.open_tabs.some((tab) => tab.status === "conta_pedida"))
    return "border-warning/60 bg-warning/[0.10] hover:border-warning";
  return "border-primary/50 bg-primary/[0.08] hover:border-primary";
}

function tableStateLabel(table: SalonTableItem): { label: string; className: string } {
  if (!table.active) return { label: "Inativa", className: "text-muted-foreground" };
  if (table.open_tabs.length === 0) return { label: "Livre", className: "text-success" };
  if (table.open_tabs.some((tab) => tab.status === "conta_pedida"))
    return { label: "Conta pedida", className: "text-warning" };
  return { label: "Ocupada", className: "text-primary" };
}

function elapsedLabel(iso: string): string {
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (min < 60) return `${min}min`;
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}`;
}

function roundStatusBadge(status: string): string {
  switch (status) {
    case "novo":
      return "bg-primary/15 text-primary";
    case "em_preparo":
      return "bg-warning/15 text-warning";
    case "entregue":
      return "bg-success/15 text-success";
    case "cancelado":
      return "bg-danger/15 text-danger";
    default:
      return "bg-muted text-muted-foreground";
  }
}

/** Rótulo do status da rodada no contexto de mesa (entregue = servido). */
function roundStatusLabel(status: string): string {
  if (status === "entregue") return "Servido";
  return STATUS_LABEL[status as OrderStatus] ?? status;
}

function normalizeRoundStatus(status: string): LocalOrder["status"] {
  const allowed: LocalOrder["status"][] = [
    "novo",
    "confirmado",
    "em_preparo",
    "pronto",
    "aguardando_entregador",
    "em_rota_entrega",
    "entregue",
    "cancelado",
  ];
  return (allowed.includes(status as LocalOrder["status"])
    ? status
    : "novo") as LocalOrder["status"];
}

export function SalonPanel({ tenantId }: Props) {
  const { role } = useAuthAccess();
  const { current } = useTenant();
  const canManageSalon =
    role != null && ["owner", "admin", "manager", "dispatcher", "cashier"].includes(role);
  const [tables, setTables] = useState<SalonTableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);
  const [tabDetail, setTabDetail] = useState<SalonTabDetail | null>(null);
  const [tabLoading, setTabLoading] = useState(false);
  const [busyAction, setBusyAction] = useState(false);

  const [newTableOpen, setNewTableOpen] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState(4);
  const [newTableArea, setNewTableArea] = useState("");
  const [creatingTable, setCreatingTable] = useState(false);
  const [newTabOpen, setNewTabOpen] = useState(false);
  const [newTabCustomer, setNewTabCustomer] = useState("");
  const [newTabPeople, setNewTabPeople] = useState(1);

  const [roundDialogOpen, setRoundDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [transferTableId, setTransferTableId] = useState("");
  const [splitOrderIds, setSplitOrderIds] = useState<string[]>([]);
  const [splitMode, setSplitMode] = useState(false);
  const [qrTable, setQrTable] = useState<SalonTableItem | null>(null);

  const loadTables = useCallback(async () => {
    try {
      const rows = await listSalonTablesFn({ data: { tenantId } });
      setTables(rows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar mesas");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const loadTabDetail = useCallback(
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
    const timer = setInterval(() => void loadTables(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadTables]);

  useEffect(() => {
    if (!selectedTabId) {
      setTabDetail(null);
      return;
    }
    void loadTabDetail(selectedTabId);
  }, [selectedTabId, loadTabDetail]);

  const refreshAll = useCallback(async () => {
    await loadTables();
    if (selectedTabId) await loadTabDetail(selectedTabId);
  }, [loadTables, loadTabDetail, selectedTabId]);

  const stats = useMemo(() => {
    const active = tables.filter((t) => t.active);
    const occupied = active.filter((t) => t.open_tabs.length > 0);
    const openTabs = active.flatMap((t) => t.open_tabs);
    const openTotal = openTabs.reduce((sum, tab) => sum + tab.total, 0);
    return {
      total: active.length,
      free: active.length - occupied.length,
      openTabs: openTabs.length,
      openTotal,
    };
  }, [tables]);

  const handleTableClick = (table: SalonTableItem) => {
    if (!table.active) return;
    if (table.id !== selectedTableId) {
      setNewTabOpen(false);
      setNewTabCustomer("");
      setNewTabPeople(1);
    }
    setSelectedTableId(table.id);
    setSelectedTabId((current) => {
      if (current && table.open_tabs.some((tab) => tab.id === current)) return current;
      return table.open_tabs[0]?.id ?? null;
    });
  };

  const handleOpenTab = async (e: React.FormEvent, table: SalonTableItem) => {
    e.preventDefault();
    setBusyAction(true);
    try {
      const created = await openSalonTabFn({
        data: {
          tenantId,
          tableId: table.id,
          customerName: newTabCustomer.trim() || undefined,
          peopleCount: newTabPeople,
        },
      });
      toast.success(`Comanda ${created.code} aberta — Mesa ${table.name}`);
      setSelectedTableId(table.id);
      setSelectedTabId(created.id);
      setNewTabOpen(false);
      setNewTabCustomer("");
      setNewTabPeople(1);
      await loadTables();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao abrir comanda");
    } finally {
      setBusyAction(false);
    }
  };

  const selectedTable = tables.find((table) => table.id === selectedTableId) ?? null;

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingTable(true);
    try {
      await createSalonTableFn({
        data: {
          tenantId,
          name: newTableName,
          capacity: newTableCapacity,
          area: newTableArea.trim() || undefined,
        },
      });
      toast.success(`Mesa ${newTableName.trim()} criada`);
      setNewTableName("");
      setNewTableArea("");
      setNewTableCapacity(4);
      setNewTableOpen(false);
      await loadTables();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar mesa");
    } finally {
      setCreatingTable(false);
    }
  };

  const handleDeactivateTable = async (table: SalonTableItem) => {
    if (!window.confirm(`Desativar a mesa ${table.name}?`)) return;
    try {
      await updateSalonTableFn({ data: { tenantId, tableId: table.id, active: false } });
      toast.success(`Mesa ${table.name} desativada`);
      await loadTables();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao desativar mesa");
    }
  };

  const handleDeleteTable = async (table: SalonTableItem) => {
    if (
      !window.confirm(
        `Excluir definitivamente a Mesa ${table.name}? O histórico das comandas será preservado.`,
      )
    )
      return;
    setBusyAction(true);
    try {
      await deleteSalonTableFn({ data: { tenantId, tableId: table.id } });
      toast.success(`Mesa ${table.name} excluída`);
      setSelectedTableId(null);
      setSelectedTabId(null);
      setNewTabOpen(false);
      await loadTables();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao excluir mesa");
    } finally {
      setBusyAction(false);
    }
  };

  const handleRequestBill = async () => {
    if (!tabDetail) return;
    setBusyAction(true);
    try {
      await updateSalonTabFn({
        data: { tenantId, tabId: tabDetail.id, status: "conta_pedida" },
      });
      toast.success("Conta pedida — comanda vai para o caixa");
      await refreshAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao pedir conta");
    } finally {
      setBusyAction(false);
    }
  };

  const handleServiceFeeChange = async (percent: number) => {
    if (!tabDetail) return;
    try {
      await updateSalonTabFn({
        data: { tenantId, tabId: tabDetail.id, serviceFeePercent: percent },
      });
      await loadTabDetail(tabDetail.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao atualizar taxa");
    }
  };

  const handleCloseTab = async () => {
    if (!tabDetail) return;
    setBusyAction(true);
    try {
      const { total } = await closeSalonTabFn({
        data: { tenantId, tabId: tabDetail.id, paymentMethod },
      });
      toast.success(`Comanda ${tabDetail.code} fechada — ${formatBRL(total)}`, { icon: "✅" });
      setCloseDialogOpen(false);
      setSelectedTabId(null);
      await loadTables();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao fechar comanda");
    } finally {
      setBusyAction(false);
    }
  };

  const handleCancelTab = async () => {
    if (!tabDetail) return;
    if (
      !window.confirm(
        `Cancelar a comanda ${tabDetail.code}? As rodadas ainda não servidas serão canceladas.`,
      )
    )
      return;
    setBusyAction(true);
    try {
      await cancelSalonTabFn({ data: { tenantId, tabId: tabDetail.id } });
      toast.success(`Comanda ${tabDetail.code} cancelada`);
      setSelectedTabId(null);
      await loadTables();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao cancelar comanda");
    } finally {
      setBusyAction(false);
    }
  };

  const handlePrintTab = () => {
    if (!tabDetail || tabDetail.rounds.length === 0) {
      toast.error("Nenhuma rodada para imprimir");
      return;
    }
    const storeName = current?.name ?? "Salão";
    const payloads = tabDetail.rounds
      .filter((r) => r.status !== "cancelado")
      .map((round) => ({
        order: {
          id: round.id,
          code: round.code,
          tenant_id: tenantId,
          customer_name: tabDetail.customer_name || tabLabel,
          customer_phone: "",
          address: `Mesa ${tabDetail.table_name ?? "—"} · ${tabDetail.code}`,
          items_count: round.items.reduce((s, i) => s + i.quantity, 0),
          total_amount: round.total_amount,
          channel: "salao",
          sla_minutes: 30,
          placed_at: round.placed_at,
          status: normalizeRoundStatus(round.status),
          priority: "normal" as const,
          notes: round.notes,
          driver_id: null,
          lat: null,
          lng: null,
        } satisfies LocalOrder,
        lines: round.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          notes: i.notes,
        })),
      }));
    if (payloads.length === 0) {
      toast.error("Nenhuma rodada válida para imprimir");
      return;
    }
    printOrderLabels(payloads, storeName, { format: "kitchen", copies: 1, tenantId });
    toast.success("Comanda enviada para impressão");
  };

  const handleTransferTab = async () => {
    if (!selectedTabId || !transferTableId) {
      toast.error("Selecione a mesa destino");
      return;
    }
    setBusyAction(true);
    try {
      await transferSalonTabFn({
        data: { tenantId, tabId: selectedTabId, tableId: transferTableId },
      });
      toast.success("Comanda movida de mesa");
      setTransferTableId("");
      setSelectedTableId(transferTableId);
      await refreshAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao transferir");
    } finally {
      setBusyAction(false);
    }
  };

  const handleSplitTab = async () => {
    if (!selectedTabId || splitOrderIds.length === 0) {
      toast.error("Marque as rodadas que vão para a nova conta");
      return;
    }
    setBusyAction(true);
    try {
      const created = await splitSalonTabFn({
        data: {
          tenantId,
          tabId: selectedTabId,
          orderIds: splitOrderIds,
          targetTableId: transferTableId || undefined,
        },
      });
      toast.success(`Nova comanda ${created.code} criada`);
      setSplitOrderIds([]);
      setSplitMode(false);
      setSelectedTabId(created.id);
      await refreshAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao dividir conta");
    } finally {
      setBusyAction(false);
    }
  };

  const toggleSplitOrder = (orderId: string) => {
    setSplitOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId],
    );
  };

  const tabLabel = tabDetail?.table_name
    ? `Mesa ${tabDetail.table_name}`
    : (tabDetail?.code ?? "Comanda");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Mesas" value={String(stats.total)} />
        <Stat label="Livres" value={String(stats.free)} />
        <Stat label="Comandas abertas" value={String(stats.openTabs)} />
        <Stat label="Em consumo" value={formatBRL(stats.openTotal)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        {/* Mapa de mesas */}
        <section className="erp-card p-4 space-y-4 min-h-[28rem]">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Armchair className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">Mapa de mesas</h2>
              {loading && tables.length > 0 ? (
                <Loader2 className="size-3 animate-spin text-muted-foreground" />
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void loadTables()}
                className="erp-btn-secondary text-xs"
              >
                <RefreshCw className="size-3.5" />
                Atualizar
              </button>
              {canManageSalon ? (
                <button
                  type="button"
                  onClick={() => setNewTableOpen((v) => !v)}
                  className="erp-btn-primary text-xs"
                >
                  <Plus className="size-3.5" />
                  Nova mesa
                </button>
              ) : null}
            </div>
          </div>

          {canManageSalon && newTableOpen ? (
            <form
              onSubmit={(e) => void handleCreateTable(e)}
              className="rounded-xl border border-border/60 bg-muted/10 p-3 grid gap-2 sm:grid-cols-[1fr_6rem_1fr_auto]"
            >
              <input
                type="number"
                min={1}
                max={9999}
                step={1}
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                placeholder="Nº da mesa"
                required
                className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <input
                type="number"
                min={1}
                max={50}
                value={newTableCapacity}
                onChange={(e) => setNewTableCapacity(Number(e.target.value) || 1)}
                title="Lugares"
                className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <input
                value={newTableArea}
                onChange={(e) => setNewTableArea(e.target.value)}
                placeholder="Área (ex.: Varanda) — opcional"
                className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <button
                type="submit"
                disabled={creatingTable}
                className="erp-btn-primary text-xs disabled:opacity-50"
              >
                {creatingTable ? <Loader2 className="size-3.5 animate-spin" /> : "Criar"}
              </button>
            </form>
          ) : null}

          {loading && tables.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Carregando mesas…
            </div>
          ) : tables.filter((t) => t.active).length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <Armchair className="size-8 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Nenhuma mesa cadastrada. Crie a primeira em “Nova mesa”.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {tables
                .filter((t) => t.active)
                .map((table) => {
                  const state = tableStateLabel(table);
                  const selected = table.id === selectedTableId;
                  const tableTotal = table.open_tabs.reduce((sum, tab) => sum + tab.total, 0);
                  const roundsCount = table.open_tabs.reduce(
                    (sum, tab) => sum + tab.rounds_count,
                    0,
                  );
                  return (
                    <button
                      key={table.id}
                      type="button"
                      onClick={() => handleTableClick(table)}
                      disabled={busyAction}
                      className={cn(
                        "group relative rounded-2xl border-2 p-3 text-left transition space-y-1.5 disabled:opacity-60",
                        tableStateClasses(table),
                        selected && "ring-2 ring-primary/40",
                      )}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-base font-bold truncate">Mesa {table.name}</span>
                        <span className={cn("text-[10px] font-bold uppercase", state.className)}>
                          {state.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Users className="size-3" />
                        {table.capacity} lugares
                        {table.area ? <span className="truncate">· {table.area}</span> : null}
                      </div>
                      {table.open_tabs.length > 0 ? (
                        <div className="text-xs space-y-0.5">
                          <p className="font-mono font-semibold tabular-nums">
                            {formatBRL(tableTotal)}
                          </p>
                          <p className="text-muted-foreground">
                            {table.open_tabs.length} comanda(s) · {roundsCount} rodada(s)
                          </p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">
                          Toque para gerenciar comandas
                        </p>
                      )}
                      {canManageSalon && table.open_tabs.length === 0 ? (
                        <span
                          role="button"
                          tabIndex={-1}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeactivateTable(table);
                          }}
                          className="absolute bottom-2 right-2 hidden rounded-md bg-background/80 p-1 text-muted-foreground hover:text-danger sm:group-hover:block"
                          title="Desativar mesa"
                        >
                          <Ban className="size-3.5" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
            </div>
          )}
        </section>

        {/* Comanda selecionada */}
        <section className="erp-card p-4 space-y-4 min-h-[28rem] max-h-[calc(100dvh-12rem)] overflow-y-auto">
          <div className="flex items-center gap-2">
            <Receipt className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">
              {selectedTable ? `Comandas da Mesa ${selectedTable.name}` : "Comandas"}
            </h2>
          </div>

          {selectedTable ? (
            <div className="space-y-2 rounded-xl border border-border/60 bg-muted/10 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {selectedTable.open_tabs.length} comanda(s) aberta(s)
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setQrTable(selectedTable)}
                    className="erp-btn-secondary text-xs"
                    title="QR da mesa para o cardápio"
                  >
                    <QrCode className="size-3.5" />
                    QR
                  </button>
                  {canManageSalon ? (
                    <button
                      type="button"
                      onClick={() => void handleDeleteTable(selectedTable)}
                      disabled={busyAction || selectedTable.open_tabs.length > 0}
                      className="erp-btn-secondary text-xs text-danger disabled:opacity-40"
                      title={
                        selectedTable.open_tabs.length > 0
                          ? "Feche ou cancele as comandas antes de excluir"
                          : "Excluir mesa"
                      }
                    >
                      <Trash2 className="size-3.5" />
                      Excluir
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setNewTabOpen((open) => !open)}
                    disabled={busyAction}
                    className="erp-btn-primary text-xs disabled:opacity-50"
                  >
                    <Plus className="size-3.5" />
                    Nova comanda
                  </button>
                </div>
              </div>
              {newTabOpen ? (
                <form
                  onSubmit={(e) => void handleOpenTab(e, selectedTable)}
                  className="grid gap-2 rounded-lg border border-primary/25 bg-primary/[0.04] p-2 sm:grid-cols-[1fr_6rem_auto]"
                >
                  <input
                    value={newTabCustomer}
                    onChange={(e) => setNewTabCustomer(e.target.value)}
                    placeholder="Cliente ou identificação (opcional)"
                    className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
                    autoFocus
                  />
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={newTabPeople}
                    onChange={(e) => setNewTabPeople(Number(e.target.value) || 1)}
                    title="Quantidade de pessoas"
                    className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={busyAction}
                    className="erp-btn-primary text-xs disabled:opacity-50"
                  >
                    {busyAction ? <Loader2 className="size-3.5 animate-spin" /> : "Abrir"}
                  </button>
                </form>
              ) : null}
              {selectedTable.open_tabs.length > 0 ? (
                <div className="grid gap-1.5">
                  {selectedTable.open_tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedTabId(tab.id)}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition",
                        selectedTabId === tab.id
                          ? "border-primary/50 bg-primary/10"
                          : "border-border/50 bg-background hover:border-primary/30",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block font-mono text-xs font-semibold">{tab.code}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {tab.customer_name || `${tab.people_count} pessoa(s)`} ·{" "}
                          {elapsedLabel(tab.opened_at)}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-sm font-semibold">
                        {formatBRL(tab.total)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Esta mesa ainda não possui comandas abertas.
                </p>
              )}
            </div>
          ) : null}

          {!selectedTable ? (
            <p className="text-sm text-muted-foreground text-center py-16">
              Selecione uma mesa para abrir ou consultar suas comandas.
            </p>
          ) : !selectedTabId ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              Abra uma nova comanda ou selecione uma comanda existente.
            </p>
          ) : tabLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Carregando comanda…
            </div>
          ) : !tabDetail ? (
            <p className="text-sm text-muted-foreground text-center py-16">
              Comanda não encontrada.
            </p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold truncate">{tabLabel}</h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    {tabDetail.code} · aberta há {elapsedLabel(tabDetail.opened_at)}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                    tabDetail.status === "conta_pedida"
                      ? "bg-warning/15 text-warning"
                      : "bg-primary/15 text-primary",
                  )}
                >
                  {tabDetail.status === "conta_pedida" ? "Conta pedida" : "Aberta"}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <UserRound className="size-3.5" />
                {tabDetail.customer_name || "Cliente não identificado"} ·{" "}
                {tabDetail.people_count} pessoa(s)
              </div>

              <button
                type="button"
                onClick={() => setRoundDialogOpen(true)}
                disabled={busyAction}
                className="erp-btn-primary w-full text-sm disabled:opacity-50"
              >
                <UtensilsCrossed className="size-4" />
                Nova rodada (enviar pedido à cozinha)
              </button>

              <button
                type="button"
                onClick={handlePrintTab}
                disabled={busyAction || tabDetail.rounds.length === 0}
                className="erp-btn-secondary w-full text-sm disabled:opacity-50"
              >
                <Printer className="size-4" />
                Imprimir comanda
              </button>

              <div className="rounded-xl border border-border/50 p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <ArrowRightLeft className="size-3.5" />
                  Mover / dividir
                </p>
                <select
                  value={transferTableId}
                  onChange={(e) => setTransferTableId(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
                >
                  <option value="">Mesa destino…</option>
                  {tables
                    .filter((t) => t.active && t.id !== selectedTableId)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        Mesa {t.name}
                        {t.open_tabs.length ? ` (${t.open_tabs.length} aberta)` : ""}
                      </option>
                    ))}
                </select>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleTransferTab()}
                    disabled={busyAction || !transferTableId}
                    className="erp-btn-secondary text-xs flex-1 disabled:opacity-50"
                  >
                    Transferir mesa
                  </button>
                  {canManageSalon ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSplitMode((v) => !v);
                        setSplitOrderIds([]);
                      }}
                      disabled={busyAction || tabDetail.rounds.length < 2}
                      className="erp-btn-secondary text-xs flex-1 disabled:opacity-50"
                    >
                      <Split className="size-3.5" />
                      {splitMode ? "Cancelar divisão" : "Dividir conta"}
                    </button>
                  ) : null}
                </div>
                {splitMode ? (
                  <button
                    type="button"
                    onClick={() => void handleSplitTab()}
                    disabled={busyAction || splitOrderIds.length === 0}
                    className="erp-btn-primary w-full text-xs disabled:opacity-50"
                  >
                    Separar {splitOrderIds.length} rodada(s) em nova comanda
                  </button>
                ) : null}
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Rodadas
                </h4>
                {tabDetail.rounds.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum pedido lançado ainda.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {tabDetail.rounds.map((round) => (
                      <li
                        key={round.id}
                        className="rounded-xl border border-border/50 p-3 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-semibold flex items-center gap-2">
                            {splitMode ? (
                              <input
                                type="checkbox"
                                checked={splitOrderIds.includes(round.id)}
                                onChange={() => toggleSplitOrder(round.id)}
                                className="rounded border-border"
                                aria-label={`Separar rodada ${round.code}`}
                              />
                            ) : null}
                            {round.code}
                          </span>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                                roundStatusBadge(round.status),
                              )}
                            >
                              {roundStatusLabel(round.status)}
                            </span>
                            <span className="font-mono text-sm tabular-nums">
                              {formatBRL(round.total_amount)}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {round.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                        </p>
                        {round.notes ? (
                          <p className="text-[11px] text-warning">Obs.: {round.notes}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/10 p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Consumo</span>
                  <span className="font-mono tabular-nums">{formatBRL(tabDetail.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm gap-2">
                  <label className="text-muted-foreground flex items-center gap-1.5">
                    Taxa de serviço
                    {canManageSalon ? (
                      <select
                        value={tabDetail.service_fee_percent}
                        onChange={(e) => void handleServiceFeeChange(Number(e.target.value))}
                        className="h-7 rounded-md border border-border bg-background px-1.5 text-xs"
                      >
                        {[0, 5, 10, 12, 15].map((p) => (
                          <option key={p} value={p}>
                            {p}%
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span>{tabDetail.service_fee_percent}%</span>
                    )}
                  </label>
                  <span className="font-mono tabular-nums">
                    {formatBRL(tabDetail.service_fee)}
                  </span>
                </div>
                {tabDetail.discount_amount > 0 ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Desconto</span>
                    <span className="font-mono tabular-nums text-success">
                      −{formatBRL(tabDetail.discount_amount)}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between border-t border-border/60 pt-2">
                  <span className="text-sm font-semibold">Total</span>
                  <span className="font-mono text-lg font-bold tabular-nums">
                    {formatBRL(tabDetail.total)}
                  </span>
                </div>
              </div>

              <div className={cn("grid gap-2", canManageSalon && "grid-cols-2")}>
                {tabDetail.status === "aberta" ? (
                  <button
                    type="button"
                    onClick={() => void handleRequestBill()}
                    disabled={busyAction || tabDetail.subtotal <= 0}
                    className="erp-btn-secondary text-xs disabled:opacity-50"
                  >
                    <Receipt className="size-3.5" />
                    Pedir conta
                  </button>
                ) : (
                  <span className="erp-btn-secondary text-xs pointer-events-none opacity-60">
                    <BadgeCheck className="size-3.5" />
                    Conta pedida
                  </span>
                )}
                {canManageSalon ? (
                  <button
                    type="button"
                    onClick={() => setCloseDialogOpen((v) => !v)}
                    disabled={busyAction || tabDetail.subtotal <= 0}
                    className="erp-btn-primary text-xs disabled:opacity-50"
                  >
                    <Wallet className="size-3.5" />
                    Fechar e receber
                  </button>
                ) : null}
              </div>

              {canManageSalon && closeDialogOpen ? (
                <div className="rounded-xl border border-primary/30 bg-primary/[0.04] p-3 space-y-2">
                  <p className="text-xs font-medium">Forma de pagamento</p>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void handleCloseTab()}
                    disabled={busyAction}
                    className="erp-btn-primary w-full text-sm disabled:opacity-50"
                  >
                    {busyAction ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <BadgeCheck className="size-4" />
                    )}
                    Confirmar {formatBRL(tabDetail.total)}
                  </button>
                </div>
              ) : null}

              {canManageSalon ? (
                <button
                  type="button"
                  onClick={() => void handleCancelTab()}
                  disabled={busyAction}
                  className="w-full inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-danger py-1.5 disabled:opacity-50"
                >
                  <Ban className="size-3.5" />
                  Cancelar comanda
                </button>
              ) : null}
            </>
          )}
        </section>
      </div>

      {tabDetail ? (
        <SalonRoundDialog
          open={roundDialogOpen}
          onOpenChange={setRoundDialogOpen}
          tenantId={tenantId}
          tabId={tabDetail.id}
          tabLabel={tabLabel}
          onAdded={() => void refreshAll()}
        />
      ) : null}

      {qrTable && current?.slug ? (
        <SalonTableQrDialog
          open={!!qrTable}
          onOpenChange={(next) => {
            if (!next) setQrTable(null);
          }}
          tableName={qrTable.name}
          menuUrl={buildSalonTableMenuUrl(
            typeof window !== "undefined" ? window.location.origin : "",
            current.slug,
            qrTable,
          )}
        />
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/10 p-2.5 text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-bold tabular-nums mt-0.5 truncate">{value}</p>
    </div>
  );
}
