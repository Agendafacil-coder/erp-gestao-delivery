import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Bike,
  CheckCircle2,
  ChevronDown,
  Flame,
  Package,
  Sliders,
  Truck,
} from "lucide-react";
import { peakHoursFromOrders } from "@/lib/ops/orderAnalytics";
import { needsDispatch } from "@/lib/ops/orderWorkflow";
import { useSlaSettings } from "@/hooks/useSlaSettings";
import { DEFAULT_SLA_SETTINGS, type SlaSettings } from "@/lib/ops/slaSettings";
import { USE_POSTGRES } from "@/lib/repositories";
import { useTenant } from "@/hooks/useTenant";
import { useOps } from "@/hooks/useOps";
import { cn } from "@/lib/utils";

type StatusLevel = "empty" | "ok" | "warning" | "critical";

function operacaoStatus(input: {
  totalOrders: number;
  kitchenQueue: number;
  readyForDispatch: number;
  idleDrivers: number;
  activeDrivers: number;
}): { level: StatusLevel; title: string; hint: string } {
  const { totalOrders, kitchenQueue, readyForDispatch, idleDrivers, activeDrivers } = input;

  if (totalOrders === 0) {
    return {
      level: "empty",
      title: "Sem pedidos no turno",
      hint: "Quando chegarem novos pedidos, o status da operação aparece aqui.",
    };
  }

  if (readyForDispatch > 0 && activeDrivers > 0 && idleDrivers === 0) {
    return {
      level: "critical",
      title: "Pedidos prontos, mas nenhum entregador livre",
      hint: "Libere entregadores ou despache manualmente para evitar atraso.",
    };
  }

  if (readyForDispatch >= 3) {
    return {
      level: "warning",
      title: "Muitos pedidos aguardando saída",
      hint: `${readyForDispatch} pedido${readyForDispatch === 1 ? "" : "s"} pronto${readyForDispatch === 1 ? "" : "s"} para enviar.`,
    };
  }

  if (kitchenQueue >= 6) {
    return {
      level: "warning",
      title: "Cozinha com fila alta",
      hint: `${kitchenQueue} pedido${kitchenQueue === 1 ? "" : "s"} ainda em preparo.`,
    };
  }

  if (activeDrivers === 0 && readyForDispatch > 0) {
    return {
      level: "critical",
      title: "Pedidos prontos sem entregadores online",
      hint: "Chame entregadores ou ajuste o despacho.",
    };
  }

  return {
    level: "ok",
    title: "Operação sob controle",
    hint: "Filas e entregadores em nível normal para o turno atual.",
  };
}

const STATUS_STYLES: Record<
  StatusLevel,
  { border: string; bg: string; icon: typeof CheckCircle2; iconClass: string }
> = {
  empty: {
    border: "border-border/60",
    bg: "bg-muted/30",
    icon: Package,
    iconClass: "text-muted-foreground",
  },
  ok: {
    border: "border-success/30",
    bg: "bg-success/5",
    icon: CheckCircle2,
    iconClass: "text-success",
  },
  warning: {
    border: "border-warning/30",
    bg: "bg-warning/5",
    icon: AlertTriangle,
    iconClass: "text-warning",
  },
  critical: {
    border: "border-danger/30",
    bg: "bg-danger/5",
    icon: AlertTriangle,
    iconClass: "text-danger",
  },
};

export function IndicadoresPanel() {
  const { current } = useTenant();
  const { orders, drivers, fetchData } = useOps();
  const [showSlaConfig, setShowSlaConfig] = useState(false);
  const {
    settings: slaSettings,
    setSettings: setSlaSettings,
    saving: slaSaving,
    apply: applySlaSettings,
    reset: resetSlaSettings,
  } = useSlaSettings(current?.id, () => void fetchData());

  const activeDrivers = drivers.filter((d) => d.status !== "offline").length;
  const idleDrivers = drivers.filter((d) => d.status === "disponivel" || d.status === "ocioso").length;

  const kitchenQueue = useMemo(
    () => orders.filter((o) => ["novo", "confirmado", "em_preparo"].includes(o.status)).length,
    [orders],
  );
  const readyForDispatch = useMemo(() => orders.filter((o) => needsDispatch(o.status)).length, [orders]);
  const inDelivery = useMemo(
    () => orders.filter((o) => o.status === "em_rota_entrega").length,
    [orders],
  );

  const peakHoursData = useMemo(() => peakHoursFromOrders(orders), [orders]);

  const status = operacaoStatus({
    totalOrders: orders.length,
    kitchenQueue,
    readyForDispatch,
    idleDrivers,
    activeDrivers,
  });
  const StatusIcon = STATUS_STYLES[status.level].icon;

  const pipeline = [
    {
      label: "Na cozinha",
      value: kitchenQueue,
      hint: "Novo, confirmado ou em preparo",
      icon: Flame,
      tone: kitchenQueue >= 6 ? "text-warning" : "text-foreground",
    },
    {
      label: "Prontos p/ sair",
      value: readyForDispatch,
      hint: "Aguardando entregador",
      icon: Package,
      tone: readyForDispatch >= 3 ? "text-warning" : "text-foreground",
    },
    {
      label: "Em entrega",
      value: inDelivery,
      hint: "A caminho do cliente",
      icon: Truck,
      tone: "text-foreground",
    },
  ];

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Resumo do <strong className="font-medium text-foreground">turno atual</strong>. Use para decidir na hora
        se precisa reforçar cozinha ou entregadores. Para histórico, vá em Relatórios.
      </p>

      <div
        className={cn(
          "rounded-2xl border px-4 py-4 sm:px-5",
          STATUS_STYLES[status.level].border,
          STATUS_STYLES[status.level].bg,
        )}
      >
        <div className="flex items-start gap-3">
          <StatusIcon className={cn("size-5 shrink-0 mt-0.5", STATUS_STYLES[status.level].iconClass)} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{status.title}</p>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{status.hint}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {pipeline.map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.label} className="erp-card p-4 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">{step.label}</span>
                <Icon className={cn("size-4", step.tone)} />
              </div>
              <div className={cn("text-3xl font-semibold tabular-nums tracking-tight", step.tone)}>
                {step.value}
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">{step.hint}</p>
            </div>
          );
        })}
      </div>

      <div className="erp-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bike className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Entregadores</p>
            <p className="text-xs text-muted-foreground">
              {activeDrivers} online · {idleDrivers} livre{idleDrivers === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="flex gap-4 text-center sm:text-right">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pedidos no turno</p>
            <p className="text-xl font-semibold tabular-nums">{orders.length}</p>
          </div>
        </div>
      </div>

      <div className="erp-card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Pedidos por hora</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Volume do turno atual, hora a hora</p>
        </div>

        <div className="h-[200px]">
          {peakHoursData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Ainda não há pedidos para montar o gráfico.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHoursData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [value, "Pedidos"]}
                />
                <Bar dataKey="orders" name="Pedidos" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-muted/20">
        <button
          type="button"
          onClick={() => setShowSlaConfig((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Sliders className="size-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Ajustes de prazo estimado</p>
              <p className="text-xs text-muted-foreground truncate">
                Opcional — só muda como o sistema calcula o risco de atraso
              </p>
            </div>
          </div>
          <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition", showSlaConfig && "rotate-180")} />
        </button>

        {showSlaConfig ? (
          <div className="border-t border-border/50 px-4 py-4 space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Esses parâmetros não aparecem para o cliente. Eles influenciam alertas internos de atraso no turno.
              {" "}
              {USE_POSTGRES ? "Salvos por unidade." : "Salvos neste navegador (modo demo)."}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <label className="space-y-1.5 block">
                <span className="font-medium text-foreground">Quando considerar risco alto (%)</span>
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={Math.round(slaSettings.slaRiskRatio * 100)}
                  onChange={(e) =>
                    setSlaSettings((s) => ({
                      ...s,
                      slaRiskRatio: Number(e.target.value) / 100,
                    }))
                  }
                  className="w-full p-2.5 bg-background border border-border rounded-lg"
                />
              </label>
              <label className="space-y-1.5 block">
                <span className="font-medium text-foreground">Fila crítica na cozinha (pedidos)</span>
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={slaSettings.kitchenBottleneckMin}
                  onChange={(e) =>
                    setSlaSettings((s) => ({
                      ...s,
                      kitchenBottleneckMin: Number(e.target.value),
                    }))
                  }
                  className="w-full p-2.5 bg-background border border-border rounded-lg"
                />
              </label>
              <label className="space-y-1.5 block">
                <span className="font-medium text-foreground">Raio para agrupar entregas (km)</span>
                <input
                  type="number"
                  min={0.5}
                  max={10}
                  step={0.1}
                  value={slaSettings.batchRadiusKm}
                  onChange={(e) =>
                    setSlaSettings((s) => ({
                      ...s,
                      batchRadiusKm: Number(e.target.value),
                    }))
                  }
                  className="w-full p-2.5 bg-background border border-border rounded-lg"
                />
              </label>
              <label className="space-y-1.5 block">
                <span className="font-medium text-foreground">Trânsito</span>
                <select
                  value={slaSettings.congestionMode}
                  onChange={(e) =>
                    setSlaSettings((s) => ({
                      ...s,
                      congestionMode: e.target.value as SlaSettings["congestionMode"],
                    }))
                  }
                  className="w-full p-2.5 bg-background border border-border rounded-lg"
                >
                  <option value="auto">Automático</option>
                  <option value="manual">Manual</option>
                </select>
              </label>
              <label className="space-y-1.5 block md:col-span-2">
                <span className="font-medium text-foreground">Multiplicador manual de trânsito</span>
                <input
                  type="number"
                  min={1}
                  max={3}
                  step={0.1}
                  disabled={slaSettings.congestionMode !== "manual"}
                  value={slaSettings.congestionMultiplier}
                  onChange={(e) =>
                    setSlaSettings((s) => ({
                      ...s,
                      congestionMultiplier: Number(e.target.value),
                    }))
                  }
                  className="w-full p-2.5 bg-background border border-border rounded-lg disabled:opacity-50"
                />
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => void resetSlaSettings()}
                disabled={slaSaving}
                className="px-3 py-2 text-xs border border-border rounded-lg hover:bg-background transition disabled:opacity-50"
              >
                Restaurar padrão
              </button>
              <button
                type="button"
                onClick={() => void applySlaSettings(slaSettings)}
                disabled={slaSaving}
                className="px-3 py-2 text-xs erp-btn-primary font-semibold rounded-lg disabled:opacity-50"
              >
                {slaSaving ? "Salvando…" : "Salvar ajustes"}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Padrão: risco {Math.round(DEFAULT_SLA_SETTINGS.slaRiskRatio * 100)}% · cozinha{" "}
              {DEFAULT_SLA_SETTINGS.kitchenBottleneckMin} ped. · raio {DEFAULT_SLA_SETTINGS.batchRadiusKm} km
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
