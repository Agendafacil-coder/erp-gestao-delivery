import { useEffect, useState } from "react";
import { Loader2, User, X } from "lucide-react";
import { getCustomerProfileFn, type CustomerProfileDto } from "@/functions/featureFlags";
import { OrderChannelBadge } from "@/components/ops/OrderChannelBadge";
import { fmtBRL } from "@/lib/format/currency";

type Props = {
  tenantId: string;
  phone: string;
  onClose: () => void;
};

export function CustomerDrawer({ tenantId, phone, onClose }: Props) {
  const [profile, setProfile] = useState<CustomerProfileDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const data = await getCustomerProfileFn({ data: { tenantId, phone } });
        setProfile(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId, phone]);

  return (
    <div
      className="fixed z-[60] flex flex-col bg-card shadow-2xl inset-x-0 bottom-0 max-h-[min(85dvh,100%)] rounded-t-2xl border-t border-border md:inset-y-0 md:right-0 md:left-auto md:top-0 md:max-h-none md:w-full md:max-w-sm md:rounded-none md:border-l md:border-t-0"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <User className="size-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">Perfil do cliente</p>
            <p className="text-xs text-muted-foreground tabular-nums">{phone}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="ops-icon-btn size-9" aria-label="Fechar">
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
            <Loader2 className="size-4 animate-spin" />
            Carregando…
          </div>
        ) : !profile ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum histórico para este telefone.
          </p>
        ) : (
          <>
            {profile.name ? (
              <p className="text-base font-semibold">{profile.name}</p>
            ) : null}
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Pedidos" value={String(profile.order_count)} />
              <Stat label="Total" value={fmtBRL(profile.total_spent)} />
              <Stat label="Ticket médio" value={fmtBRL(profile.avg_ticket)} />
            </div>
            {profile.recent_orders.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Pedidos recentes
                </p>
                <ul className="space-y-1.5">
                  {profile.recent_orders.map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <span className="font-mono font-semibold">{o.code}</span>
                        <div className="mt-0.5">
                          <OrderChannelBadge channel={o.channel} />
                        </div>
                      </div>
                      <span className="font-mono tabular-nums shrink-0">
                        {fmtBRL(o.total_amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/10 p-2.5 text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-bold tabular-nums mt-0.5">{value}</p>
    </div>
  );
}
