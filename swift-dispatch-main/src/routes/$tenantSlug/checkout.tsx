import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { createCheckoutFn } from "@/functions/payments";
import { createPublicOrderFn } from "@/functions/publicOrders";
import { MenuLightShell } from "@/components/menu/MenuLightShell";
import { formatBRL } from "@/lib/menu/format";
import { cartTotal, clearCart, getCart } from "@/lib/public-cart";
import { toast } from "sonner";
import { CreditCard, Banknote, Smartphone } from "lucide-react";

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

function CheckoutPage() {
  const { tenantSlug } = Route.useParams();
  const navigate = useNavigate();
  const items = getCart(tenantSlug);
  const total = cartTotal(items);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [method, setMethod] = useState<"pix" | "card" | "on_delivery">("pix");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!items.length) {
      toast.error("Carrinho vazio");
      return;
    }
    setBusy(true);
    try {
      const order = await createPublicOrderFn({
        data: {
          tenantSlug,
          customer_name: name,
          customer_phone: phone,
          address,
          lines: items,
          payment_method: method,
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
      });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <MenuLightShell
      tenantSlug={tenantSlug}
      title="Finalizar pedido"
      subtitle={formatBRL(total)}
      showBack
      backTo="/$tenantSlug/carrinho"
    >
      <form onSubmit={submit} className="max-w-lg mx-auto px-4 py-5 pb-28 space-y-6">
        <section className="bg-white rounded-2xl border border-black/[0.06] p-4 shadow-sm space-y-4">
          <h2 className="font-semibold text-[#1c1c1e]">Seus dados</h2>
          <div>
            <label className="text-xs font-medium text-[#888]">Nome completo</label>
            <input
              className="mt-1.5 w-full h-11 rounded-xl border border-black/10 bg-[#fafafa] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ea1d2c]/25"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Como no interfone"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#888]">WhatsApp / telefone</label>
            <input
              className="mt-1.5 w-full h-11 rounded-xl border border-black/10 bg-[#fafafa] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ea1d2c]/25"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#888]">Endereço de entrega</label>
            <input
              className="mt-1.5 w-full h-11 rounded-xl border border-black/10 bg-[#fafafa] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ea1d2c]/25"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, número, complemento"
              required
            />
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-black/[0.06] p-4 shadow-sm space-y-3">
          <h2 className="font-semibold text-[#1c1c1e]">Pagamento</h2>
          <div className="space-y-2">
            {PAYMENT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = method === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMethod(opt.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    selected
                      ? "border-[#ea1d2c] bg-[#fff5f5]"
                      : "border-transparent bg-[#f7f7f8]"
                  }`}
                >
                  <div
                    className={`size-10 rounded-full flex items-center justify-center ${
                      selected ? "bg-[#ea1d2c] text-white" : "bg-white text-[#888]"
                    }`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-[#1c1c1e]">{opt.label}</div>
                    <div className="text-xs text-[#888]">{opt.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-black/[0.06] p-4 shadow-sm">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-[#888]">{items.length} itens</span>
            <span className="font-bold text-[#1c1c1e]">{formatBRL(total)}</span>
          </div>
          <p className="text-[11px] text-[#aaa]">Taxa de entrega calculada na confirmação</p>
        </section>

        <button
          type="submit"
          disabled={busy || !items.length}
          className="w-full rounded-2xl bg-[#ea1d2c] py-4 text-white font-semibold shadow-[0_8px_32px_rgba(234,29,44,0.35)] disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {busy ? "Enviando pedido…" : `Confirmar · ${formatBRL(total)}`}
        </button>
      </form>
    </MenuLightShell>
  );
}
