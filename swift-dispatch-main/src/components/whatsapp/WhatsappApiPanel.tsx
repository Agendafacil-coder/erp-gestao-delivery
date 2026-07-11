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

/** O dono conecta o WhatsApp nesta tela — sem passar pelo suporte. */
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
                {gatewayOnline ? "WhatsApp ligado" : "Conectar WhatsApp"}
              </p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {gatewayOnline
                  ? "Mensagens para clientes e entregadores já podem ser enviadas."
                  : "Preencha os dados do seu WhatsApp abaixo e toque em Conectar."}
              </p>
            </div>
          </div>

          <ol className="space-y-4">
            <li className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                  1
                </span>
                <span className="text-sm font-medium">Escolha o serviço</span>
              </div>
              <select
                value={selectedApi}
                onChange={(e) => setSelectedApi(e.target.value as WhatsappProvider)}
                disabled={apiLoading}
                className="ml-8 w-[calc(100%-2rem)] h-10 rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="evolution">Evolution</option>
                <option value="zapi">Z-API</option>
                <option value="cloud">Meta (WhatsApp Cloud)</option>
              </select>
            </li>

            <li className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                  2
                </span>
                <span className="text-sm font-medium">Cole os dados da conta</span>
              </div>
              <div className="ml-8 space-y-3 w-[calc(100%-2rem)]">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Endereço do serviço (URL)
                  </label>
                  <Input
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="https://…"
                    disabled={apiLoading}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Nome da instância ou ID
                  </label>
                  <Input
                    value={instanceName}
                    onChange={(e) => setInstanceName(e.target.value)}
                    placeholder="Ex.: loja-centro"
                    disabled={apiLoading}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Token / senha de acesso
                  </label>
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={apiKeySet ? "Já salvo — deixe vazio para manter" : "Cole o token aqui"}
                    disabled={apiLoading}
                  />
                </div>
              </div>
            </li>

            <li className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                  3
                </span>
                <span className="text-sm font-medium">Confirme o envio e conecte</span>
              </div>
              <div className="ml-8 space-y-3 w-[calc(100%-2rem)]">
                <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/15 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Enviar mensagens</p>
                    <p className="text-xs text-muted-foreground">
                      Precisa estar ligado para o WhatsApp funcionar de verdade.
                    </p>
                  </div>
                  <Switch
                    checked={apiEnabled}
                    onCheckedChange={setApiEnabled}
                    disabled={apiLoading}
                    className="shrink-0 data-[state=unchecked]:bg-border/80"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void saveApiConfig()}
                    disabled={apiSaving || apiLoading}
                    className="erp-btn-primary text-sm"
                  >
                    <Save className="size-3.5" />
                    {apiSaving ? "Salvando…" : gatewayOnline ? "Salvar" : "Conectar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void loadApiConfig()}
                    disabled={apiLoading || apiSaving}
                    className="erp-btn-secondary text-sm"
                  >
                    <RefreshCw className={cn("size-3.5", apiLoading && "animate-spin")} />
                    Atualizar status
                  </button>
                </div>
              </div>
            </li>
          </ol>
        </AppCardContent>
      </AppCard>
    </div>
  );
}
