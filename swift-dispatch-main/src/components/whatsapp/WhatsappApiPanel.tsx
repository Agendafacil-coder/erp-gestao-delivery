import { useState } from "react";
import { RefreshCw, Save, Wifi, WifiOff } from "lucide-react";
import { AppCard, AppCardContent } from "@/components/design/AppCard";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { WhatsappHubState, WhatsappProvider } from "./types";

type Props = Pick<
  WhatsappHubState,
  | "selectedApi"
  | "setSelectedApi"
  | "apiUrl"
  | "setApiUrl"
  | "apiKey"
  | "setApiKey"
  | "instanceName"
  | "setInstanceName"
  | "apiEnabled"
  | "setApiEnabled"
  | "apiKeySet"
  | "apiLoading"
  | "apiSaving"
  | "loadApiConfig"
  | "saveApiConfig"
  | "gatewayOnline"
>;

/** Tela do dono: só status. Formulário técnico só em “Sou do suporte”. */
export function WhatsappApiPanel({
  selectedApi,
  setSelectedApi,
  apiUrl,
  setApiUrl,
  apiKey,
  setApiKey,
  instanceName,
  setInstanceName,
  apiEnabled,
  setApiEnabled,
  apiKeySet,
  apiLoading,
  apiSaving,
  loadApiConfig,
  saveApiConfig,
  gatewayOnline,
}: Props) {
  const [supportMode, setSupportMode] = useState(false);

  if (supportMode) {
    return (
      <div className="space-y-4 max-w-xl">
        <button
          type="button"
          onClick={() => setSupportMode(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Voltar
        </button>

        <AppCard>
          <AppCardContent className="p-5 space-y-4">
            <p className="text-sm font-medium">Configuração do suporte</p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <select
                value={selectedApi}
                onChange={(e) => setSelectedApi(e.target.value as WhatsappProvider)}
                disabled={apiLoading}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="evolution">Evolution</option>
                <option value="zapi">Z-API</option>
                <option value="cloud">Meta</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">URL</label>
              <Input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} disabled={apiLoading} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Instância / ID</label>
              <Input
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                disabled={apiLoading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Token</label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={apiKeySet ? "Salvo — vazio mantém" : ""}
                disabled={apiLoading}
              />
            </div>

            <label className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/15 px-4 py-3">
              <span className="text-sm">Ativar envio real</span>
              <Switch
                checked={apiEnabled}
                onCheckedChange={setApiEnabled}
                disabled={apiLoading}
                className="shrink-0 data-[state=unchecked]:bg-border/80"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void saveApiConfig()}
                disabled={apiSaving || apiLoading}
                className="erp-btn-primary text-sm"
              >
                <Save className="size-3.5" />
                {apiSaving ? "Salvando…" : "Salvar conexão"}
              </button>
              <button
                type="button"
                onClick={() => void loadApiConfig()}
                disabled={apiLoading || apiSaving}
                className="erp-btn-secondary text-sm"
              >
                <RefreshCw className={cn("size-3.5", apiLoading && "animate-spin")} />
                Recarregar
              </button>
            </div>
          </AppCardContent>
        </AppCard>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-3">
      <AppCard>
        <AppCardContent className="p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "size-11 rounded-xl flex items-center justify-center shrink-0",
                gatewayOnline ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
              )}
            >
              {gatewayOnline ? <Wifi className="size-5" /> : <WifiOff className="size-5" />}
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold text-foreground">
                {gatewayOnline ? "WhatsApp ligado" : "WhatsApp desligado"}
              </p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {gatewayOnline
                  ? "Avisos para clientes e entregadores já podem ser enviados."
                  : "Ainda não está ligado nesta loja. O suporte faz essa conexão."}
              </p>
            </div>
          </div>

          {gatewayOnline ? (
            <>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/15 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Enviar avisos</p>
                  <p className="text-xs text-muted-foreground">
                    Desligado: mensagens só ficam no histórico.
                  </p>
                </div>
                <Switch
                  checked={apiEnabled}
                  onCheckedChange={setApiEnabled}
                  disabled={apiLoading}
                  className="shrink-0 data-[state=unchecked]:bg-border/80"
                />
              </div>
              <button
                type="button"
                onClick={() => void saveApiConfig()}
                disabled={apiSaving || apiLoading}
                className="erp-btn-primary text-sm"
              >
                <Save className="size-3.5" />
                {apiSaving ? "Salvando…" : "Salvar"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => void loadApiConfig()}
              disabled={apiLoading}
              className="erp-btn-secondary text-sm"
            >
              <RefreshCw className={cn("size-3.5", apiLoading && "animate-spin")} />
              Atualizar status
            </button>
          )}
        </AppCardContent>
      </AppCard>

      <button
        type="button"
        onClick={() => setSupportMode(true)}
        className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground px-1"
      >
        Sou do suporte
      </button>
    </div>
  );
}
