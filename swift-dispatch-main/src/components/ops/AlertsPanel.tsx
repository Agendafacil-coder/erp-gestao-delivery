import { Bell, CheckCircle } from "lucide-react";
import { useMemo } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useOperationalAlerts } from "@/hooks/useOperationalAlerts";
import type { LocalOrder, LocalDriver, LocalAlert } from "@/lib/db/localDb";
import { OperationalAlertRow } from "@/components/ops/OperationalAlertsUI";

type AlertsPanelProps = {
  tick?: number;
  orders?: LocalOrder[];
  drivers?: LocalDriver[];
  storedAlerts?: LocalAlert[];
};

export function AlertsPanel({ orders = [], drivers = [], storedAlerts = [] }: AlertsPanelProps) {
  const { t } = useI18n();
  const { dashboard } = useOperationalAlerts({ orders, drivers, storedAlerts });

  const hasCritical = useMemo(
    () => dashboard.some((a) => a.level === "crit" || a.level === "high"),
    [dashboard],
  );

  return (
    <div className="erp-card flex flex-col h-[420px] lg:h-[520px]">
      <div className="erp-card-header">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bell className="size-4 text-primary" />
          </div>
          <div>
            <div className="font-semibold text-sm leading-none">Central de alertas</div>
            <p className="text-sm text-muted-foreground mt-1">
              Operação · {dashboard.length} {dashboard.length === 1 ? "alerta" : "alertas"}
            </p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground hidden sm:inline">Ao vivo</span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {dashboard.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <CheckCircle className="size-10 text-success/55 mb-2" />
            <span className="text-sm font-medium text-foreground">{t("common", "allClear")}</span>
            <span className="text-[10px] mt-1 max-w-[200px]">
              Sem alertas operacionais no momento.
            </span>
          </div>
        ) : (
          dashboard.map((a) => <OperationalAlertRow key={a.id} alert={a} />)
        )}
      </div>
      <div className="px-4 py-3 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground truncate max-w-[160px] font-medium">
          {hasCritical ? "Ação necessária na operação" : "Monitoramento ativo"}
        </span>
        <span className="text-[10px] text-muted-foreground">
          SLA · cozinha · entrega · pagamento
        </span>
      </div>
    </div>
  );
}
