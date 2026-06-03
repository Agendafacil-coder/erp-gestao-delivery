import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { createCheckoutFn } from "@/functions/payments";
import { createPublicOrderFn, quotePublicOrderFn } from "@/functions/publicOrders";
import { getPublicMenuFn, type PublicMenuPayload } from "@/functions/menu";
import { MenuLightShell } from "@/components/menu/MenuLightShell";
import { formatBRL } from "@/lib/menu/format";
import { buildLineDisplayName } from "@/lib/menu/cart-line";
import { cartTotal, clearCart, getCart } from "@/lib/public-cart";
import { toast } from "sonner";
import {
  CreditCard,
  Banknote,
  Smartphone,
  Store,
  Truck,
  ChevronRight,
  Tag,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/$tenantSlug/checkout")({
  component: CheckoutPage,
});

const PAYMENT_OPTIONS = [
  { id: "pix" as const, label: "Pix", desc: "Pagamento instantâneo", icon: Smartphone },
  { id: "card" as const, label: "Cartão", desc: "Crédito ou débito online", icon: CreditCard },
  {
    id: "on_delivery" as const,
    label: "Na entrega",
    desc: "Dinheiro ou cartão na porta",
    icon: Banknote,
  },
];

const STEPS = ["Entrega", "Dados", "Pagamento"] as const;

function CheckoutPage() {
  const { tenantSlug } = Route.useParams();
  const navigate = useNavigate();
  const items = getCart(tenantSlug);
  const subtotal = cartTotal(items);

  const [menu, setMenu] = useState<PublicMenuPayload | null>(null);
  const [step, setStep] = useState(0);
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">("delivery");
  const [neighborhood, setNeighborhood] = useState("");
  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [coupon, setCoupon] = useState("");
  const [method, setMethod] = useState<"pix" | "card" | "on_delivery">("pix");
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState<Awaited<ReturnType<typeof quotePublicOrderFn>> | null>(null);

  useEffect(() => {
    void getPublicMenuFn({ data: { tenantSlug } }).then(setMenu).catch(() => {});
  }, [tenantSlug]);

  const settings = menu?.settings;
  const neighborhoods = settings?.neighborhood_fees ?? [];

  const lines = useMemo(
    () =>
      items.map((i) => ({
        menu_item_id: i.menu_item_id,
        name: i.name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        notes: i.notes,
        variation_id: i.variation_id,
        variation_name: i.variation_name,
        addons: i.addons,
      })),
    [items],
  );

  useEffect(() => {
    if (!items.length) return;
    const t = setTimeout(() => {
      void quotePublicOrderFn({
        data: {
          tenantSlug,
          lines,
          fulfillment_type: fulfillment,
          neighborhood: neighborhood || undefined,
          coupon_code: coupon || undefined,
        },
      })
        .then(setQuote)
        .catch(() => setQuote(null));
    }, 300);
    return () => clearTimeout(t);
  }, [tenantSlug, lines, fulfillment, neighborhood, coupon, items.length]);

  const total = quote?.total ?? subtotal;
  const deliveryFee = quote?.delivery_fee ?? 0;
  const discount = quote?.discount ?? 0;

  const submit = async () => {
    if (!items.length) {
      toast.error("Carrinho vazio");
      return;
    }
    if (quote && !quote.meets_minimum) {
      toast.error(`Pedido mínimo de ${formatBRL(quote.min_order_amount)}`);
      return;
    }
    setBusy(true);
    try {
      const order = await createPublicOrderFn({
        data: {
          tenantSlug,
          customer_name: name,
          customer_phone: phone,
          address: fulfillment === "delivery" ? address : "Retirada na loja",
          lines,
          notes: orderNotes || undefined,
          payment_method: method,
          fulfillment_type: fulfillment,
          neighborhood: fulfillment === "delivery" ? neighborhood : undefined,
          coupon_code: coupon || undefined,
        },
      });

      if (method !== "on_delivery") {
        await createCheckoutFn({
          data: {
            orderId: order.order_id,
            tenantSlug,
            amount: order.total_amount,
            method,
          },
        });
      }

      clearCart(tenantSlug);
      navigate({
        to: "/rastreio/$orderId/$token",
        params: { orderId: order.order_id, token: order.tracking_token },
        search: { confirmed: "1" },
      });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const nextStep = () => {
    if (step === 0) {
      if (fulfillment === "delivery" && !address.trim()) {
        toast.error("Informe o endereço");
        return;
      }
    }
    if (step === 1) {
      if (!name.trim() || !phone.trim()) {
        toast.error("Preencha nome e telefone");
        return;
      }
    }
    if (step < 2) setStep(step + 1);
    else void submit();
  };

  if (!items.length) {
    return (
      <MenuLightShell tenantSlug={tenantSlug} title="Checkout" showBack>
        <p className="py-20 text-center text-sm text-[#888]">Sacola vazia</p>
      </MenuLightShell>
    );
  }

  return (
    <MenuLightShell
      tenantSlug={tenantSlug}
      title="Finalizar"
      subtitle={formatBRL(total)}
      showBack
      backTo="/$tenantSlug/carrinho"
    >
      <div className="mx-auto max-w-lg px-4 py-4 pb-32">
        <div className="mb-6 flex gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-xs font-bold",
                  i <= step ? "bg-[#ea1d2c] text-white" : "bg-[#e5e5ea] text-[#888]",
                )}
              >
                {i < step ? <CheckCircle2 className="size-4" /> : i + 1}
              </div>
              <span className="text-[10px] font-medium text-[#888]">{label}</span>
            </div>
          ))}
        </div>

        <ul className="mb-4 space-y-2 rounded-2xl border border-black/[0.06] bg-white p-3 shadow-sm">
          {items.map((item) => (
            <li key={item.line_id} className="flex justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-[#555]">
                {item.quantity}× {buildLineDisplayName(item)}
              </span>
              <span className="shrink-0 font-medium tabular-nums">
                {formatBRL(item.unit_price * item.quantity)}
              </span>
            </li>
          ))}
        </ul>

        {step === 0 && (
          <section className="space-y-4 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-[#1c1c1e]">Como deseja receber?</h2>
            <div className="grid grid-cols-2 gap-2">
              {settings?.delivery_enabled !== false && (
                <button
                  type="button"
                  onClick={() => setFulfillment("delivery")}
                  className={cn(
                    "flex flex-col items-center gap-2 min-h-[5rem] rounded-xl border-2 p-4 transition-colors",
                    fulfillment === "delivery"
                      ? "border-[#ea1d2c] bg-[#fff5f5]"
                      : "border-[#ebebef] bg-[#fafafa]",
                  )}
                >
                  <Truck className="size-6 text-[#ea1d2c]" />
                  <span className="text-sm font-semibold">Entrega</span>
                </button>
              )}
              {settings?.pickup_enabled !== false && (
                <button
                  type="button"
                  onClick={() => setFulfillment("pickup")}
                  className={cn(
                    "flex flex-col items-center gap-2 min-h-[5rem] rounded-xl border-2 p-4 transition-colors",
                    fulfillment === "pickup"
                      ? "border-[#ea1d2c] bg-[#fff5f5]"
                      : "border-[#ebebef] bg-[#fafafa]",
                  )}
                >
                  <Store className="size-6 text-[#ea1d2c]" />
                  <span className="text-sm font-semibold">Retirada</span>
                </button>
              )}
            </div>

            {fulfillment === "delivery" ? (
              <>
                {neighborhoods.length > 0 ? (
                  <div>
                    <label className="text-xs font-medium text-[#888]">Bairro</label>
                    <select
                      className="mt-1.5 h-11 min-h-[2.75rem] w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 text-base"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                    >
                      <option value="">Selecione o bairro</option>
                      {neighborhoods.map((n) => (
                        <option key={n.name} value={n.name}>
                          {n.name} — entrega {formatBRL(n.fee)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <div>
                  <label className="text-xs font-medium text-[#888]">Endereço completo</label>
                  <input
                    className="mt-1.5 h-11 min-h-[2.75rem] w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 text-base focus:outline-none focus:ring-2 focus:ring-[#ea1d2c]/25"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rua, número, complemento"
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-[#888]">
                Retire em:{" "}
                <span className="font-medium text-[#555]">
                  {settings?.store_address ?? "Loja principal"}
                </span>
              </p>
            )}

            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-[#888]">
                <Tag className="size-3.5" />
                Cupom de desconto
              </label>
              <input
                className="mt-1.5 h-11 min-h-[2.75rem] w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 text-base uppercase"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                placeholder="Código promocional"
              />
              {quote?.coupon_label ? (
                <p className="mt-1 text-xs text-green-600">{quote.coupon_label} aplicado</p>
              ) : null}
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="space-y-4 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-[#1c1c1e]">Seus dados</h2>
            <div>
              <label className="text-xs font-medium text-[#888]">Nome</label>
              <input
                className="mt-1.5 h-11 min-h-[2.75rem] w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 text-base"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Como no interfone"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#888]">WhatsApp / telefone</label>
              <input
                className="mt-1.5 h-11 min-h-[2.75rem] w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 text-base"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#888]">Observações do pedido</label>
              <textarea
                className="mt-1.5 w-full resize-none rounded-xl border border-black/10 bg-[#fafafa] px-3 py-2.5 text-base min-h-[4.5rem]"
                rows={2}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Ex: tocar o interfone 12"
              />
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-3 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-[#1c1c1e]">Pagamento</h2>
            {PAYMENT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = method === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMethod(opt.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left",
                    selected ? "border-[#ea1d2c] bg-[#fff5f5]" : "border-transparent bg-[#f7f7f8]",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-10 items-center justify-center rounded-full",
                      selected ? "bg-[#ea1d2c] text-white" : "bg-white text-[#888]",
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{opt.label}</div>
                    <div className="text-xs text-[#888]">{opt.desc}</div>
                  </div>
                </button>
              );
            })}
          </section>
        )}

        <section className="mt-4 rounded-2xl border border-black/[0.06] bg-white p-4 text-sm shadow-sm">
          <div className="flex justify-between text-[#888]">
            <span>Subtotal</span>
            <span>{formatBRL(quote?.subtotal ?? subtotal)}</span>
          </div>
          {fulfillment === "delivery" && deliveryFee > 0 && (
            <div className="mt-1 flex justify-between text-[#888]">
              <span>Taxa de entrega</span>
              <span>{formatBRL(deliveryFee)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="mt-1 flex justify-between text-green-600">
              <span>Desconto</span>
              <span>- {formatBRL(discount)}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-[#ebebef] pt-2 font-bold text-[#1c1c1e]">
            <span>Total</span>
            <span>{formatBRL(total)}</span>
          </div>
          {quote && !quote.meets_minimum && (
            <p className="mt-2 text-xs text-[#ea1d2c]">
              Faltam {formatBRL(quote.min_order_amount - quote.subtotal)} para o pedido mínimo
            </p>
          )}
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-[#f7f7f8] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-lg">
          <button
            type="button"
            disabled={busy || (quote != null && !quote.meets_minimum)}
            onClick={nextStep}
            className="flex w-full min-h-[3rem] items-center justify-center gap-2 rounded-2xl bg-[#ea1d2c] py-4 text-base font-semibold text-white shadow-[0_8px_32px_rgba(234,29,44,0.35)] disabled:opacity-50"
          >
            {busy
              ? "Enviando…"
              : step < 2
                ? "Continuar"
                : `Confirmar pedido · ${formatBRL(total)}`}
            {step < 2 && !busy && <ChevronRight className="size-5" />}
          </button>
        </div>
      </div>
    </MenuLightShell>
  );
}
