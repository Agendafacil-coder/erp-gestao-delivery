import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { createCheckoutFn } from "@/functions/payments";
import { createPublicOrderFn, quotePublicOrderFn } from "@/functions/publicOrders";
import { getPublicMenuFn, type PublicMenuPayload } from "@/functions/menu";
import { MenuLightShell } from "@/components/menu/MenuLightShell";
import { CheckoutStepper } from "@/components/menu/public/CheckoutStepper";
import { MenuStickyFooter } from "@/components/menu/public/MenuStickyFooter";
import { MENU_PAGE_MAX } from "@/components/menu/public/menu-layout";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/menu/format";
import { buildLineDisplayName } from "@/lib/menu/cart-line";
import { cartItemCount, cartTotal, clearCart, getCart } from "@/lib/public-cart";
import { OrderBumpSection } from "@/components/menu/public/OrderBumpSection";
import { formatBrazilPostalCode } from "@/lib/geo/addressNavigation";
import { toast } from "sonner";
import {
  CreditCard,
  Banknote,
  Smartphone,
  Store,
  Truck,
  ChevronRight,
  Tag,
  Shield,
  Coins,
} from "lucide-react";

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
  const [cartVersion, setCartVersion] = useState(0);
  const items = useMemo(() => getCart(tenantSlug), [tenantSlug, cartVersion]);
  const subtotal = cartTotal(items);

  const [menu, setMenu] = useState<PublicMenuPayload | null>(null);
  const [step, setStep] = useState(0);
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">("delivery");
  const [neighborhood, setNeighborhood] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [coupon, setCoupon] = useState("");
  const [method, setMethod] = useState<"pix" | "card" | "on_delivery">("pix");
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState<Awaited<ReturnType<typeof quotePublicOrderFn>> | null>(null);
  const [useLoyalty, setUseLoyalty] = useState(false);

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

  const loyaltyBalance = 120;
  const loyaltyDiscount = useLoyalty ? Math.min(5, (quote?.total ?? subtotal) * 0.1) : 0;
  const total = Math.max(0, (quote?.total ?? subtotal) - loyaltyDiscount);
  const deliveryFee = quote?.delivery_fee ?? 0;
  const discount = (quote?.discount ?? 0) + loyaltyDiscount;
  const coinsEarned = Math.floor(total * 0.08);

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
          postal_code: fulfillment === "delivery" ? postalCode || undefined : undefined,
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
            trackingToken: order.tracking_token,
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
      <MenuLightShell
        tenantSlug={tenantSlug}
        title="Checkout"
        showBack
        hideFloatingCart
        menuLayout={menu?.settings.menu_layout}
      >
        <p className="py-20 text-center text-sm text-[var(--menu-muted)]">Sacola vazia</p>
      </MenuLightShell>
    );
  }

  return (
    <MenuLightShell
      tenantSlug={tenantSlug}
      title="Finalizar pedido"
      subtitle={formatBRL(total)}
      showBack
      backTo="/$tenantSlug/carrinho"
      cartCount={cartItemCount(items)}
      hideFloatingCart
      menuLayout={menu?.settings.menu_layout}
    >
      <div className={cn("mx-auto w-full px-4 py-4 pb-40", MENU_PAGE_MAX)}>
        <CheckoutStepper steps={STEPS} current={step} />

        <ul className="menu-card mb-4 space-y-2 p-3">
          {items.map((item) => (
            <li key={item.line_id} className="flex justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-[var(--menu-muted)]">
                {item.quantity}× {buildLineDisplayName(item)}
              </span>
              <span className="shrink-0 font-medium tabular-nums">
                {formatBRL(item.unit_price * item.quantity)}
              </span>
            </li>
          ))}
        </ul>

        {step === 0 && (
          <section className="menu-card space-y-4 p-4">
            <h2 className="font-semibold">Como deseja receber?</h2>
            <div className="menu-segmented">
              {settings?.delivery_enabled !== false && (
                <button
                  type="button"
                  onClick={() => setFulfillment("delivery")}
                  className={cn(
                    "menu-segmented__item",
                    fulfillment === "delivery" && "menu-segmented__item--active",
                  )}
                >
                  <Truck
                    className={cn(
                      "size-6",
                      fulfillment === "delivery"
                        ? "text-[var(--menu-accent)]"
                        : "text-[var(--menu-muted)]",
                    )}
                  />
                  <span>Entrega</span>
                </button>
              )}
              {settings?.pickup_enabled !== false && (
                <button
                  type="button"
                  onClick={() => setFulfillment("pickup")}
                  className={cn(
                    "menu-segmented__item",
                    fulfillment === "pickup" && "menu-segmented__item--active",
                  )}
                >
                  <Store
                    className={cn(
                      "size-6",
                      fulfillment === "pickup"
                        ? "text-[var(--menu-accent)]"
                        : "text-[var(--menu-muted)]",
                    )}
                  />
                  <span>Retirada</span>
                </button>
              )}
            </div>

            {fulfillment === "delivery" ? (
              <>
                {neighborhoods.length > 0 ? (
                  <div>
                    <label className="menu-label">Bairro</label>
                    <select
                      className="menu-input mt-1.5"
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
                  <label className="menu-label">
                    CEP{" "}
                    <span className="font-normal text-[var(--menu-muted)]">(opcional, recomendado)</span>
                  </label>
                  <input
                    className="menu-input mt-1.5"
                    value={postalCode}
                    onChange={(e) => setPostalCode(formatBrazilPostalCode(e.target.value))}
                    placeholder="00000-000"
                    inputMode="numeric"
                    autoComplete="postal-code"
                  />
                  <p className="mt-1 text-[11px] text-[var(--menu-muted)]">
                    Ajuda a localizar sua entrega com mais precisão no mapa.
                  </p>
                </div>
                <div>
                  <label className="menu-label">Endereço completo</label>
                  <input
                    className="menu-input mt-1.5"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rua, número, complemento"
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-[var(--menu-muted)]">
                Retire em:{" "}
                <span className="font-medium text-[var(--menu-fg)]">
                  {settings?.store_address ?? "Loja principal"}
                </span>
              </p>
            )}

            <div>
              <label className="menu-label flex items-center gap-2">
                <Tag className="size-3.5" />
                Cupom de desconto
              </label>
              <input
                className="menu-input mt-1.5 uppercase"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                placeholder="Código promocional"
              />
              {quote?.coupon_label ? (
                <p className="mt-1 text-xs text-[var(--menu-success)]">{quote.coupon_label} aplicado</p>
              ) : null}
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="menu-card space-y-4 p-4">
            <h2 className="font-semibold">Seus dados</h2>
            <div>
              <label className="menu-label">Nome</label>
              <input
                className="menu-input mt-1.5"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Como no interfone"
              />
            </div>
            <div>
              <label className="menu-label">WhatsApp / telefone</label>
              <input
                className="menu-input mt-1.5"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <label className="menu-label">Observações do pedido</label>
              <textarea
                className="menu-input mt-1.5 min-h-[4.5rem] resize-none py-2.5"
                rows={2}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Ex: tocar o interfone 12"
              />
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="menu-card mb-4 space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-semibold">
                <Coins className="size-4 text-[var(--menu-accent)]" />
                MENUCOINS
              </h2>
              <span className="rounded-full bg-[var(--menu-accent)]/15 px-2.5 py-0.5 text-xs font-bold text-[var(--menu-accent)]">
                {loyaltyBalance} coins
              </span>
            </div>
            <p className="text-xs text-[var(--menu-muted)]">
              Ganhe <span className="font-semibold text-[var(--menu-fg)]">+{coinsEarned} coins</span>{" "}
              neste pedido.
            </p>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--menu-border)] bg-[var(--menu-surface)] p-3">
              <input
                type="checkbox"
                checked={useLoyalty}
                onChange={(e) => setUseLoyalty(e.target.checked)}
                className="size-4 accent-[var(--menu-accent)]"
              />
              <span className="text-sm">
                Usar 50 coins <span className="font-semibold text-[var(--menu-success)]">(-R$ 5,00)</span>
              </span>
            </label>
          </section>
        )}

        {step === 2 && (
          <section className="menu-card space-y-3 p-4">
            <h2 className="font-semibold">Pagamento</h2>
            {PAYMENT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = method === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMethod(opt.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors",
                    selected
                      ? "border-[var(--menu-accent)] bg-[var(--menu-accent)]/10"
                      : "border-transparent bg-[var(--menu-surface)]",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-10 items-center justify-center rounded-full",
                      selected
                        ? "bg-[var(--menu-gradient)] text-white"
                        : "bg-[var(--menu-card)] text-[var(--menu-muted)]",
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{opt.label}</div>
                    <div className="text-xs text-[var(--menu-muted)]">{opt.desc}</div>
                  </div>
                </button>
              );
            })}
          </section>
        )}

        <section className="menu-card mt-4 p-4 text-sm">
          <div className="flex justify-between text-[var(--menu-muted)]">
            <span>Subtotal</span>
            <span>{formatBRL(quote?.subtotal ?? subtotal)}</span>
          </div>
          {fulfillment === "delivery" && deliveryFee > 0 && (
            <div className="mt-1 flex justify-between text-[var(--menu-muted)]">
              <span>Taxa de entrega</span>
              <span>{formatBRL(deliveryFee)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="mt-1 flex justify-between text-[var(--menu-success)]">
              <span>Desconto</span>
              <span>- {formatBRL(discount)}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-[var(--menu-border)] pt-2 text-base font-bold">
            <span>Total</span>
            <span className="menu-price text-lg">{formatBRL(total)}</span>
          </div>
          {quote && !quote.meets_minimum && (
            <p className="mt-2 text-xs text-[var(--menu-accent)]">
              Faltam {formatBRL(quote.min_order_amount - quote.subtotal)} para o pedido mínimo
            </p>
          )}
        </section>
      </div>

      <MenuStickyFooter className="space-y-2">
        <div className={cn("flex gap-2", step > 0 && "grid grid-cols-[auto_1fr]")}>
          {step > 0 ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setStep(step - 1)}
              className="menu-btn-secondary min-h-[3rem] px-5"
            >
              Voltar
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy || (quote != null && !quote.meets_minimum)}
            onClick={nextStep}
            className="menu-btn-primary flex min-h-[3rem] flex-1 items-center justify-center gap-2 py-4"
          >
            {busy
              ? "Enviando…"
              : step < 2
                ? "Continuar"
                : `Confirmar · ${formatBRL(total)}`}
            {step < 2 && !busy && <ChevronRight className="size-5" />}
          </button>
        </div>
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--menu-muted)]">
          <Shield className="size-3" />
          Pedido 100% seguro
        </p>
      </MenuStickyFooter>

      <OrderBumpSection
        tenantSlug={tenantSlug}
        menu={menu}
        cartItems={items}
        onCartChange={() => setCartVersion((v) => v + 1)}
      />
    </MenuLightShell>
  );
}
