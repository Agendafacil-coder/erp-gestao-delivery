import { AlertTriangle, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WhatsappProvider } from "./types";
import { PROVIDER_LABELS } from "./types";

type Props = {
  gatewayOnline: boolean;
  provider: WhatsappProvider;
  apiSource: "tenant" | "env" | "none";
  className?: string;
};

export function WhatsappStatusBanner({ gatewayOnline, provider, apiSource, className }: Props) {
  if (gatewayOnline) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-success/30 bg-success/8 px-4 py-3.5 flex items-start gap-3 text-sm",
          className,
        )}
      >
        <div className="size-9 rounded-xl bg-success/15 flex items-center justify-center shrink-0">
          <Wifi className="size-4 text-success" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-success">API conectada</p>
          <p className="text-muted-foreground mt-0.5 leading-relaxed">
            Disparos ativos via <strong className="text-foreground">{PROVIDER_LABELS[provider]}</strong>
            {apiSource === "env" ? " (variáveis do servidor)" : " neste tenant"}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-warning/35 bg-warning/8 px-4 py-3.5 flex items-start gap-3 text-sm",
        className,
      )}
    >
      <div className="size-9 rounded-xl bg-warning/15 flex items-center justify-center shrink-0">
        <WifiOff className="size-4 text-warning" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-warning flex items-center gap-1.5">
          <AlertTriangle className="size-3.5 shrink-0" />
          Modo demonstração
        </p>
        <p className="text-muted-foreground mt-0.5 leading-relaxed">
          Mensagens são registradas no histórico. Para envio real, configure a aba{" "}
          <strong className="text-foreground">Conexão API</strong> (Evolution, Z-API ou Meta Cloud) ou
          defina <code className="text-xs bg-muted px-1 py-0.5 rounded">WHATSAPP_*</code> no servidor.
        </p>
      </div>
    </div>
  );
}
