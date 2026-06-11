import { Bot, Cloud, Link2, QrCode, RefreshCw, Save } from "lucide-react";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/design/AppCard";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { WhatsappHubState, WhatsappProvider } from "./types";
import { PROVIDER_LABELS } from "./types";

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
  | "apiSource"
  | "apiLoading"
  | "apiSaving"
  | "loadApiConfig"
  | "saveApiConfig"
  | "webhookInfo"
  | "gatewayOnline"
>;

const PROVIDERS: {
  id: WhatsappProvider;
  icon: typeof Bot;
  title: string;
  description: string;
  accent: string;
}[] = [
  {
    id: "evolution",
    icon: Bot,
    title: "Evolution API",
    description: "Self-hosted ou cloud. Instâncias múltiplas e alta performance.",
    accent: "text-primary",
  },
  {
    id: "zapi",
    icon: QrCode,
    title: "Z-API",
    description: "Conexão via QR Code. Escala enterprise com API REST simples.",
    accent: "text-cyan-400",
  },
  {
    id: "cloud",
    icon: Cloud,
    title: "Meta Cloud API",
    description: "Canal oficial WhatsApp Business para operações corporativas.",
    accent: "text-success",
  },
];

function sourceLabel(source: WhatsappHubState["apiSource"], enabled: boolean) {
  if (source === "env") return "Credenciais do servidor (WHATSAPP_*)";
  if (source === "tenant" && enabled) return "Integração ativa neste tenant";
  return "Não configurado — modo demonstração";
}

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
  apiSource,
  apiLoading,
  apiSaving,
  loadApiConfig,
  saveApiConfig,
  webhookInfo,
  gatewayOnline,
}: Props) {
  const placeholders = {
    evolution: {
      url: "https://api.seuservidor.com.br",
      instance: "delivery-os",
      key: "api-token-evolution",
    },
    zapi: {
      url: "https://api.z-api.io",
      instance: "3C4B2A1D...",
      key: "token-da-instancia",
    },
    cloud: {
      url: "https://graph.facebook.com",
      instance: "123456789012345",
      key: "EAAxxxx...",
    },
  }[selectedApi];

  return (
    <div className="space-y-5">
      {webhookInfo ? (
        <AppCard>
          <AppCardHeader>
            <AppCardTitle className="text-sm flex items-center gap-2">
              <Link2 className="size-4 text-primary" />
              Webhooks de entrada
            </AppCardTitle>
            <p className="text-xs text-muted-foreground">URLs para integrações externas (pagamento, iFood).</p>
          </AppCardHeader>
          <AppCardContent className="space-y-3 text-xs">
            <div className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-1">
              <p className="text-muted-foreground font-medium">Mercado Pago</p>
              <code className="block break-all text-foreground text-[11px]">{webhookInfo.endpoints.mercadopago}</code>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-1">
              <p className="text-muted-foreground font-medium">iFood</p>
              <code className="block break-all text-foreground text-[11px]">{webhookInfo.endpoints.ifood}</code>
            </div>
            <p className="text-[11px] text-muted-foreground">
              iFood: header <code className="bg-muted px-1 rounded">x-ifood-merchant-id</code> conforme seed do tenant.
            </p>
          </AppCardContent>
        </AppCard>
      ) : null}

      <AppCard>
        <AppCardHeader>
          <div>
            <AppCardTitle className="text-base">Escolha o provedor</AppCardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Status:{" "}
              <span className={gatewayOnline ? "text-success font-medium" : "text-warning font-medium"}>
                {gatewayOnline ? `Conectado · ${PROVIDER_LABELS[selectedApi]}` : sourceLabel(apiSource, apiEnabled)}
              </span>
            </p>
          </div>
        </AppCardHeader>
        <AppCardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PROVIDERS.map((p) => {
              const Icon = p.icon;
              const active = selectedApi === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedApi(p.id)}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition space-y-3",
                    active
                      ? "border-primary/45 bg-primary/8 ring-1 ring-primary/20"
                      : "border-border/50 bg-muted/15 hover:bg-muted/30",
                  )}
                >
                  <Icon className={cn("size-6", p.accent)} />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{p.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{p.description}</p>
                  </div>
                  {active ? (
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-primary">
                      Selecionado
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </AppCardContent>
      </AppCard>

      <AppCard>
        <AppCardHeader className="gap-3">
          <div>
            <AppCardTitle className="text-sm">Credenciais · {PROVIDER_LABELS[selectedApi]}</AppCardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{sourceLabel(apiSource, apiEnabled)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadApiConfig()}
              disabled={apiLoading || apiSaving}
              className="erp-btn-secondary text-xs"
            >
              <RefreshCw className={cn("size-3.5", apiLoading && "animate-spin")} />
              Recarregar
            </button>
            <button
              type="button"
              onClick={() => void saveApiConfig()}
              disabled={apiSaving || apiLoading}
              className="erp-btn-primary text-xs"
            >
              <Save className="size-3.5" />
              {apiSaving ? "Salvando…" : "Salvar integração"}
            </button>
          </div>
        </AppCardHeader>

        <AppCardContent className="space-y-5">
          {selectedApi === "zapi" ? (
            <p className="text-xs text-muted-foreground rounded-xl border border-dashed border-border p-3 leading-relaxed">
              Endpoint de envio:{" "}
              <code className="text-[11px]">/instances/&#123;id&#125;/token/&#123;token&#125;/send-text</code>
            </p>
          ) : null}
          {selectedApi === "cloud" ? (
            <p className="text-xs text-muted-foreground rounded-xl border border-dashed border-border p-3 leading-relaxed">
              Permissão necessária: <code>whatsapp_business_messaging</code>. Use o phone_number_id como instância.
            </p>
          ) : null}

          <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-border/50 bg-muted/15 p-3.5">
            <input
              type="checkbox"
              checked={apiEnabled}
              onChange={(e) => setApiEnabled(e.target.checked)}
              className="mt-0.5 size-4 rounded accent-primary"
            />
            <span>
              <span className="text-sm font-medium text-foreground block">Ativar disparos via API</span>
              <span className="text-xs text-muted-foreground">
                Quando desligado, mensagens ficam apenas no histórico (demo).
              </span>
            </span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">URL base</label>
              <Input
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder={placeholders.url}
                disabled={apiLoading}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {selectedApi === "cloud" ? "Phone Number ID" : "Instância / ID"}
              </label>
              <Input
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                placeholder={placeholders.instance}
                disabled={apiLoading}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">
                {selectedApi === "cloud" ? "Access Token" : "API Key / Token"}
              </label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={apiKeySet ? "Token salvo — deixe vazio para manter" : placeholders.key}
                disabled={apiLoading}
              />
            </div>
          </div>
        </AppCardContent>
      </AppCard>
    </div>
  );
}
