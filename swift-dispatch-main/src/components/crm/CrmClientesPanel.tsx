import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpDown,
  ImageIcon,
  ImagePlus,
  Loader2,
  Megaphone,
  RefreshCw,
  Save,
  Search,
  Send,
  User,
  Users,
  X,
} from "lucide-react";
import {
  getCrmCustomerDetailFn,
  listCrmCustomersFn,
  sendCrmPromoFn,
  syncCrmCustomersFn,
  updateCrmCustomerFn,
  type CrmCustomerDetail,
  type CrmCustomerListItem,
} from "@/functions/crm";
import { uploadCrmPromoImage, validatePromoImageFile } from "@/lib/crm/upload-promo-image";
import type { CustomerSegment } from "@/lib/crm/segments";
import { fmtBRL } from "@/lib/format/currency";
import { formatPhoneShort } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  tenantId: string;
};

type PromoMode = "individual" | "broadcast";

type SortKey = "recent" | "orders" | "spent" | "name";

const SORT_OPTIONS: Array<{ id: SortKey; label: string }> = [
  { id: "recent", label: "Mais recentes" },
  { id: "orders", label: "Mais pedidos" },
  { id: "spent", label: "Maior gasto" },
  { id: "name", label: "Nome (A–Z)" },
];

const SEGMENT_FILTERS: Array<{ id: CustomerSegment; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "vip", label: "VIP" },
  { id: "inactive_30d", label: "Sumidos" },
  { id: "high_ticket", label: "Gastam mais" },
];

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function matchesSegment(c: CrmCustomerListItem, segment: CustomerSegment): boolean {
  switch (segment) {
    case "vip":
      return c.order_count >= 5;
    case "inactive_30d":
      return !c.last_order_at || Date.now() - new Date(c.last_order_at).getTime() > THIRTY_DAYS_MS;
    case "high_ticket":
      return c.order_count > 0 && c.total_spent / c.order_count > 80;
    default:
      return true;
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function CrmClientesPanel({ tenantId }: Props) {
  const [customers, setCustomers] = useState<CrmCustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [q, setQ] = useState("");
  const [segment, setSegment] = useState<CustomerSegment>("all");
  const [sortBy, setSortBy] = useState<SortKey>("recent");
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [detail, setDetail] = useState<CrmCustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editTags, setEditTags] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [promoMode, setPromoMode] = useState<PromoMode>("individual");
  const [promoMessage, setPromoMessage] = useState(
    "Olá! Temos uma promoção especial pra você hoje. Peça pelo nosso cardápio 🍕",
  );
  const [promoImageUrl, setPromoImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const loadCustomers = useCallback(
    async (search?: string) => {
      setLoading(true);
      try {
        const rows = await listCrmCustomersFn({
          data: { tenantId, q: search?.trim() || undefined },
        });
        setCustomers(rows);
        setSelectedPhone((prev) => {
          if (prev && rows.some((r) => r.phone === prev)) return prev;
          return rows[0]?.phone ?? null;
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falha ao carregar clientes");
      } finally {
        setLoading(false);
      }
    },
    [tenantId],
  );

  // Busca ao vivo: dispara sozinha enquanto digita, sem precisar de Enter.
  useEffect(() => {
    const timer = setTimeout(() => void loadCustomers(q), q.trim() ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadCustomers, q]);

  const visibleCustomers = useMemo(() => {
    const rows = customers.filter((c) => matchesSegment(c, segment));
    switch (sortBy) {
      case "orders":
        rows.sort((a, b) => b.order_count - a.order_count);
        break;
      case "spent":
        rows.sort((a, b) => b.total_spent - a.total_spent);
        break;
      case "name":
        rows.sort((a, b) =>
          (a.name?.trim() || "\uffff").localeCompare(b.name?.trim() || "\uffff", "pt-BR"),
        );
        break;
      default:
        rows.sort(
          (a, b) =>
            new Date(b.last_order_at ?? 0).getTime() - new Date(a.last_order_at ?? 0).getTime(),
        );
    }
    return rows;
  }, [customers, segment, sortBy]);

  // Mantém a seleção dentro do que está visível após filtrar/ordenar.
  useEffect(() => {
    if (visibleCustomers.length === 0) return;
    if (!selectedPhone || !visibleCustomers.some((c) => c.phone === selectedPhone)) {
      setSelectedPhone(visibleCustomers[0].phone);
    }
  }, [visibleCustomers, selectedPhone]);

  useEffect(() => {
    if (!selectedPhone) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      setDetailLoading(true);
      try {
        const data = await getCrmCustomerDetailFn({
          data: { tenantId, phone: selectedPhone },
        });
        if (!cancelled) {
          setDetail(data);
          setEditName(data?.name ?? "");
          setEditNotes(data?.notes ?? "");
          setEditTags(data?.tags ?? "");
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Falha ao carregar cliente");
          setDetail(null);
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId, selectedPhone]);

  const baseStats = useMemo(() => {
    const vip = customers.filter((c) => matchesSegment(c, "vip")).length;
    const inactive = customers.filter((c) => matchesSegment(c, "inactive_30d")).length;
    const totalSpent = customers.reduce((a, c) => a + c.total_spent, 0);
    const totalOrders = customers.reduce((a, c) => a + c.order_count, 0);
    const avgTicket = totalOrders > 0 ? totalSpent / totalOrders : 0;
    return { vip, inactive, avgTicket, total: customers.length };
  }, [customers]);

  const handleSaveProfile = async () => {
    if (!selectedPhone) return;
    setSavingProfile(true);
    try {
      await updateCrmCustomerFn({
        data: {
          tenantId,
          phone: selectedPhone,
          name: editName,
          notes: editNotes,
          tags: editTags,
        },
      });
      toast.success("Cliente atualizado");
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              name: editName.trim() || null,
              notes: editNotes.trim() || null,
              tags: editTags.trim() || null,
            }
          : prev,
      );
      setCustomers((prev) =>
        prev.map((c) =>
          c.phone === selectedPhone
            ? { ...c, name: editName.trim() || null }
            : c,
        ),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar cliente");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { upserted } = await syncCrmCustomersFn({ data: { tenantId } });
      toast.success(`${upserted} cliente(s) atualizado(s) a partir dos pedidos`);
      await loadCustomers(q);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao sincronizar");
    } finally {
      setSyncing(false);
    }
  };

  const togglePhone = (phone: string) => {
    setSelectedPhones((prev) => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedPhones(new Set(visibleCustomers.map((c) => c.phone)));
  };

  const recipients = useMemo(() => {
    if (promoMode === "individual") {
      if (!selectedPhone) return [];
      const row = customers.find((c) => c.phone === selectedPhone);
      return [{ phone: selectedPhone, name: detail?.name ?? row?.name ?? null }];
    }
    return customers
      .filter((c) => selectedPhones.has(c.phone))
      .map((c) => ({ phone: c.phone, name: c.name }));
  }, [promoMode, selectedPhone, customers, detail?.name, selectedPhones]);

  const handlePromoImage = async (file: File) => {
    try {
      validatePromoImageFile(file);
    } catch (e) {
      toast.error((e as Error).message);
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }
    setUploadingImage(true);
    try {
      const url = await uploadCrmPromoImage(tenantId, file);
      setPromoImageUrl(url);
      toast.success("Imagem pronta para envio");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleSendPromo = async () => {
    if (!promoMessage.trim() && !promoImageUrl.trim()) {
      toast.error("Informe um texto ou a URL de uma imagem");
      return;
    }
    if (recipients.length === 0) {
      toast.error(
        promoMode === "individual"
          ? "Selecione um cliente"
          : "Marque ao menos um cliente na lista",
      );
      return;
    }

    setSending(true);
    let sent = 0;
    try {
      for (const r of recipients.slice(0, 50)) {
        try {
          await sendCrmPromoFn({
            data: {
              tenantId,
              phone: r.phone,
              message: promoMessage.trim(),
              imageUrl: promoImageUrl.trim() || null,
              recipientLabel: r.name ?? r.phone,
            },
          });
          sent++;
          if (recipients.length > 1) {
            await new Promise((res) => setTimeout(res, 800));
          }
        } catch {
          /* continua batch */
        }
      }
      toast.success(
        sent === 1
          ? "Promoção enviada"
          : `${sent} mensagem(ns) enviada(s) (máx. 50 por vez)`,
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {customers.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Clientes" value={String(baseStats.total)} />
          <Stat label="VIP" value={String(baseStats.vip)} />
          <Stat label="Sumidos" value={String(baseStats.inactive)} />
          <Stat label="Ticket médio" value={fmtBRL(baseStats.avgTicket)} />
        </div>
      ) : null}

    <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)_minmax(0,22rem)]">
      {/* Lista */}
      <section className="erp-card flex flex-col min-h-[28rem] max-h-[calc(100dvh-12rem)]">
        <div className="p-4 border-b border-border space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Users className="size-4 text-primary shrink-0" />
              <h2 className="text-sm font-semibold truncate">Clientes</h2>
              <span className="text-xs text-muted-foreground tabular-nums">
                {segment === "all"
                  ? customers.length
                  : `${visibleCustomers.length} de ${customers.length}`}
              </span>
              {loading && customers.length > 0 ? (
                <Loader2 className="size-3 animate-spin text-muted-foreground shrink-0" />
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => void handleSync()}
              disabled={syncing}
              className="erp-btn-secondary text-xs disabled:opacity-50"
              title="Atualizar a partir dos pedidos"
            >
              {syncing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Atualizar
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar nome ou telefone…"
              className="w-full h-9 pl-9 pr-8 rounded-lg border border-border bg-background text-sm"
            />
            {q ? (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                title="Limpar busca"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {SEGMENT_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSegment(f.id)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                  segment === f.id
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground hover:bg-muted/40",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="size-3.5 text-muted-foreground shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="h-8 flex-1 rounded-lg border border-border bg-background px-2 text-xs"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && customers.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Carregando…
            </div>
          ) : customers.length === 0 ? (
            <div className="p-6 text-center space-y-2">
              {q.trim() ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum cliente encontrado para “{q.trim()}”.
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Nenhum cliente ainda.</p>
                  <button
                    type="button"
                    onClick={() => void handleSync()}
                    disabled={syncing}
                    className="erp-btn-primary text-xs"
                  >
                    Puxar dos pedidos
                  </button>
                </>
              )}
            </div>
          ) : visibleCustomers.length === 0 ? (
            <div className="p-6 text-center space-y-2">
              <p className="text-sm text-muted-foreground">Nenhum cliente nesse filtro.</p>
              <button
                type="button"
                onClick={() => setSegment("all")}
                className="erp-btn-secondary text-xs"
              >
                Ver todos
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {visibleCustomers.map((c) => {
                const active = c.phone === selectedPhone;
                const checked = selectedPhones.has(c.phone);
                return (
                  <li key={c.phone} className="flex items-stretch">
                    {promoMode === "broadcast" ? (
                      <label className="flex items-center px-3 border-r border-border/40 shrink-0 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePhone(c.phone)}
                          className="size-3.5 accent-primary"
                        />
                      </label>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setSelectedPhone(c.phone)}
                      className={cn(
                        "flex-1 text-left px-3 py-2.5 transition min-w-0",
                        active ? "bg-primary/10" : "hover:bg-muted/40",
                      )}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {c.name?.trim() || "Sem nome"}
                        </p>
                        {matchesSegment(c, "vip") ? (
                          <span className="shrink-0 rounded-full bg-warning/15 text-warning px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                            VIP
                          </span>
                        ) : null}
                        {matchesSegment(c, "inactive_30d") ? (
                          <span className="shrink-0 rounded-full bg-muted text-muted-foreground px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                            Sumido
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                        {formatPhoneShort(c.phone) || c.phone}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {c.order_count} pedido{c.order_count === 1 ? "" : "s"} ·{" "}
                        {fmtBRL(c.total_spent)} · {formatDate(c.last_order_at)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {promoMode === "broadcast" && customers.length > 0 ? (
          <div className="p-3 border-t border-border shrink-0 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={selectAllVisible}
              className="erp-btn-secondary text-[11px]"
            >
              Marcar todos
            </button>
            <button
              type="button"
              onClick={() => setSelectedPhones(new Set())}
              className="erp-btn-secondary text-[11px]"
            >
              Limpar
            </button>
            <span className="text-[11px] text-muted-foreground self-center ml-auto">
              {selectedPhones.size} selecionado(s)
            </span>
          </div>
        ) : null}
      </section>

      {/* Detalhe */}
      <section className="erp-card p-5 space-y-5 min-h-[28rem] max-h-[calc(100dvh-12rem)] overflow-y-auto">
        {!selectedPhone ? (
          <p className="text-sm text-muted-foreground text-center py-16">
            Selecione um cliente na lista.
          </p>
        ) : detailLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Carregando perfil…
          </div>
        ) : !detail ? (
          <p className="text-sm text-muted-foreground text-center py-16">
            Cliente não encontrado.
          </p>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <div className="size-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <User className="size-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold truncate">
                  {detail.name || "Cliente"}
                </h2>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {formatPhoneShort(detail.phone) || detail.phone}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Último pedido: {formatDate(detail.last_order_at)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Stat label="Pedidos" value={String(detail.order_count)} />
              <Stat label="Total gasto" value={fmtBRL(detail.total_spent)} />
              <Stat label="Ticket médio" value={fmtBRL(detail.avg_ticket)} />
            </div>

            <div className="space-y-3 rounded-xl border border-border/50 bg-muted/10 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Dados do cliente
              </h3>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Nome</span>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nome do cliente"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Etiquetas (separadas por vírgula)
                </span>
                <input
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="Ex.: fiel, aniversariante"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Observações</span>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  placeholder="Anotações internas da loja…"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
                />
              </label>
              <button
                type="button"
                onClick={() => void handleSaveProfile()}
                disabled={savingProfile}
                className="erp-btn-primary text-xs disabled:opacity-50"
              >
                {savingProfile ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )}
                {savingProfile ? "Salvando…" : "Salvar dados"}
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Preferência — mais pedidos
              </h3>
              {detail.top_items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Ainda sem itens registrados nos pedidos deste telefone.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {detail.top_items.map((item, idx) => (
                    <li
                      key={item.name}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <span
                          className={cn(
                            "size-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0",
                            idx === 0
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {idx + 1}
                        </span>
                        <span className="truncate font-medium">{item.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                        {item.quantity}× · {item.times_ordered} pedido
                        {item.times_ordered === 1 ? "" : "s"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Pedidos recentes
              </h3>
              {detail.recent_orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum pedido.</p>
              ) : (
                <ul className="space-y-2">
                  {detail.recent_orders.map((o) => (
                    <li
                      key={o.id}
                      className="rounded-lg border border-border/50 px-3 py-2.5 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-semibold">{o.code}</span>
                        <span className="font-mono text-sm tabular-nums">
                          {fmtBRL(o.total_amount)}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDate(o.placed_at)} · {o.status}
                        {o.channel ? ` · ${o.channel}` : ""}
                      </p>
                      {o.items.length > 0 ? (
                        <p className="text-xs text-muted-foreground truncate">
                          {o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </section>

      {/* Promo WhatsApp */}
      <section className="erp-card p-5 space-y-4 lg:col-span-2 xl:col-span-1 min-h-[28rem]">
        <div className="flex items-center gap-2">
          <Megaphone className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Promoção no WhatsApp</h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Envie texto e imagem para um cliente ou para uma lista (como transmissão).
          Precisa do WhatsApp conectado em Sistema → WhatsApp → Conexão.
        </p>

        <div className="segmented-control w-full">
          <button
            type="button"
            data-active={promoMode === "individual"}
            onClick={() => setPromoMode("individual")}
            className="segmented-item text-xs flex-1"
          >
            Individual
          </button>
          <button
            type="button"
            data-active={promoMode === "broadcast"}
            onClick={() => setPromoMode("broadcast")}
            className="segmented-item text-xs flex-1"
          >
            Lista / transmissão
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          {promoMode === "individual"
            ? selectedPhone
              ? `Para: ${detail?.name || formatPhoneShort(selectedPhone) || selectedPhone}`
              : "Selecione um cliente na lista"
            : `${recipients.length} destinatário(s) marcados (máx. 50 por envio)`}
        </p>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Texto</label>
          <textarea
            value={promoMessage}
            onChange={(e) => setPromoMessage(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
            placeholder="Mensagem da promoção…"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <ImageIcon className="size-3.5" />
            Imagem da promoção (opcional)
          </label>
          <p className="text-[11px] text-muted-foreground">JPEG ou PNG · até 5 MB</p>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handlePromoImage(file);
            }}
          />
          <div className="flex flex-wrap items-start gap-3">
            <div className="size-24 rounded-xl border border-dashed border-border bg-muted/15 overflow-hidden flex items-center justify-center shrink-0">
              {promoImageUrl ? (
                <img
                  src={promoImageUrl}
                  alt="Prévia da promoção"
                  className="size-full object-cover"
                />
              ) : (
                <ImagePlus className="size-7 text-muted-foreground/40" />
              )}
            </div>
            <div className="flex flex-col gap-2 min-w-0">
              <button
                type="button"
                disabled={uploadingImage || sending}
                onClick={() => imageInputRef.current?.click()}
                className="erp-btn-secondary text-xs disabled:opacity-50"
              >
                {uploadingImage ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="size-3.5" />
                )}
                {uploadingImage
                  ? "Enviando…"
                  : promoImageUrl
                    ? "Trocar imagem"
                    : "Escolher JPEG ou PNG"}
              </button>
              {promoImageUrl ? (
                <button
                  type="button"
                  onClick={() => setPromoImageUrl("")}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-danger"
                >
                  <X className="size-3" />
                  Remover imagem
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleSendPromo()}
          disabled={sending || uploadingImage || recipients.length === 0}
          className="erp-btn-primary text-sm w-full disabled:opacity-50"
        >
          {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          {promoMode === "individual" ? "Enviar promoção" : `Enviar para ${recipients.length}`}
        </button>
      </section>
    </div>
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
