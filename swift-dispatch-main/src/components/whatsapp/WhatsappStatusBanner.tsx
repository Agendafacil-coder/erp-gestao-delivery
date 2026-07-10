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
          <p className="font-semibold text-success">WhatsApp conectado</p>
          <p className="text-muted-foreground mt-0.5 leading-relaxed">
            Mensagens reais ativas
            {apiSource === "env"
              ? " (configurado no servidor)."
              : ` via ${PROVIDER_LABELS[provider]}.`}
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
          Ainda em modo de teste
        </p>
        <p className="text-muted-foreground mt-0.5 leading-relaxed">
          Ainda não está ligado. O suporte conecta o WhatsApp da loja — veja a aba{" "}
          <strong className="text-foreground">Ligado?</strong>.
        </p>
      </div>
    </div>
  );
}
