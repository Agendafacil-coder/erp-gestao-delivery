import { useState } from "react";
import { Loader2, RefreshCw, Save, Wifi, WifiOff, Zap } from "lucide-react";
import { AppCard, AppCardContent } from "@/components/design/AppCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [connectOpen, setConnectOpen] = useState(false);

  const connect = async () => {
    const ok = await saveApiConfig();
    if (ok) setConnectOpen(false);
  };

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
                  : "Toque no botão abaixo e cole os dados da sua conta. Leva menos de um minuto."}
              </p>
            </div>
          </div>

          {!gatewayOnline ? (
            <div className="space-y-3">
              <button
                type="button"
                disabled={apiLoading}
                onClick={() => setConnectOpen(true)}
                className="erp-btn-primary w-full justify-center text-base py-3 disabled:opacity-50"
              >
                <Zap className="size-4" />
                Conectar WhatsApp
              </button>
              <p className="text-xs text-muted-foreground text-center">
                Você vai precisar do endereço, do nome da instância e do token do seu serviço de
                WhatsApp.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/15 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Enviar mensagens</p>
                  <p className="text-xs text-muted-foreground">
                    Desligue para pausar todos os envios sem perder a conexão.
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
                  {apiSaving ? "Salvando…" : "Salvar"}
                </button>
                <button
                  type="button"
                  onClick={() => setConnectOpen(true)}
                  disabled={apiSaving || apiLoading}
                  className="erp-btn-secondary text-sm"
                >
                  Trocar dados da conta
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
          )}
        </AppCardContent>
      </AppCard>

      <Dialog open={connectOpen} onOpenChange={(open) => !apiSaving && setConnectOpen(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar o WhatsApp</DialogTitle>
            <DialogDescription>
              Copie os dados do seu serviço de WhatsApp e cole aqui. Se tiver dúvida, peça ajuda ao
              suporte.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Qual serviço você usa?</span>
              <select
                value={selectedApi}
                onChange={(e) => setSelectedApi(e.target.value as WhatsappProvider)}
                disabled={apiLoading || apiSaving}
                className="w-full h-11 rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="evolution">Evolution</option>
                <option value="zapi">Z-API</option>
                <option value="cloud">Meta (WhatsApp Cloud)</option>
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Endereço do serviço (URL)</span>
              <Input
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://…"
                disabled={apiLoading || apiSaving}
                className="h-11"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Nome da instância ou ID</span>
              <Input
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                placeholder="Ex.: loja-centro"
                disabled={apiLoading || apiSaving}
                className="h-11"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium">
                Token / senha de acesso {apiKeySet ? "(já salvo)" : ""}
              </span>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={apiKeySet ? "Deixe vazio para manter o salvo" : "Cole o token aqui"}
                disabled={apiLoading || apiSaving}
                className="h-11"
              />
            </label>

            <button
              type="button"
              disabled={apiSaving || apiLoading}
              onClick={() => void connect()}
              className="erp-btn-primary w-full justify-center text-sm py-3 disabled:opacity-50"
            >
              {apiSaving ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
              {apiSaving ? "Conectando…" : "Conectar agora"}
            </button>
            <p className="text-[11px] text-muted-foreground text-center">
              Depois de conectar, as mensagens automáticas passam a sair pelo seu WhatsApp.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
