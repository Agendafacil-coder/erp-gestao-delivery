import { AlertOctagon, AlertTriangle, CheckCircle, Info } from "lucide-react";
import type { OperationalAlertRow } from "@/lib/ops/dashboardMetrics";
import { ALERT_COLOR } from "@/lib/ops/alertTheme";
import { OperationalAlertBadge } from "@/components/ops/OperationalAlertsUI";
import type { OperationalAlertType } from "@/lib/ops/operationalAlerts";
import {
  AppCard,
  AppCardHeader,
  AppCardTitle,
  AppCardDescription,
} from "@/components/design/AppCard";

type Props = {
  alerts: OperationalAlertRow[];
};

const LEVEL_ICON = {
  crit: AlertOctagon,
  high: AlertTriangle,
  med: AlertTriangle,
  low: Info,
} as const;

export function OperationalAlertsPanel({ alerts }: Props) {
  return (
    <AppCard className="flex flex-col min-h-[280px] lg:min-h-0 lg:h-full">
      <AppCardHeader>
        <div>
          <AppCardTitle>Alertas operacionais</AppCardTitle>
          <AppCardDescription>
            {alerts.length === 0 ? "Operação estável" : `${alerts.length} ponto(s) de atenção`}
          </AppCardDescription>
        </div>
      </AppCardHeader>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {alerts.length === 0 ? (
          <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
            <CheckCircle className="size-10 text-success/60 mb-2" />
            <span className="text-sm font-medium text-foreground">Tudo sob controle</span>
            <span className="text-xs mt-1 max-w-[220px]">
              Sem gargalos críticos detectados no momento.
            </span>
          </div>
        ) : (
          alerts.map((a) => {
            const Icon = LEVEL_ICON[a.level] ?? Info;
            return (
              <div
                key={a.id}
                className={`rounded-lg border border-border border-l-[3px] pl-3 pr-3 py-2.5 ${ALERT_COLOR[a.level]}`}
              >
                <div className="flex items-start gap-2">
                  <Icon className="size-4 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <div className="text-sm font-semibold leading-tight">{a.title}</div>
                      {a.type ? (
                        <OperationalAlertBadge
                          type={a.type as OperationalAlertType}
                          level={a.level}
                        />
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {a.detail}
                    </div>
                  </div>
                  {a.agoMin > 0 ? (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {a.agoMin} min
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </AppCard>
  );
}
