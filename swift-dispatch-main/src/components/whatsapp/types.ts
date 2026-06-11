import type { Dispatch, SetStateAction } from "react";
import type { WhatsappMessageLog } from "@/lib/whatsapp/orderNotifications";
import type { WhatsappTemplateKey } from "@/lib/whatsapp/templates";

export type WhatsappTab = "logs" | "templates" | "api";
export type WhatsappProvider = "evolution" | "zapi" | "cloud";
export type RecipientType = "cliente" | "entregador" | "gerente";
export type MessageStatus = "sent" | "failed" | "pending" | "demo";

export type MessageLog = {
  id: string;
  timestamp: string;
  createdAt: string;
  recipient: string;
  type: RecipientType;
  content: string;
  status: MessageStatus;
  templateKey: string | null;
};

export type LogFilter = "all" | RecipientType;
export type StatusFilter = "all" | MessageStatus;

export const PROVIDER_LABELS: Record<WhatsappProvider, string> = {
  evolution: "Evolution API",
  zapi: "Z-API",
  cloud: "Meta Cloud",
};

export const PROVIDER_SHORT: Record<WhatsappProvider, string> = {
  evolution: "EV",
  zapi: "ZA",
  cloud: "WA",
};

export const RECIPIENT_LABEL: Record<RecipientType, string> = {
  cliente: "Cliente",
  entregador: "Entregador",
  gerente: "Gerente",
};

export const STATUS_LABEL: Record<MessageStatus, string> = {
  sent: "Enviado",
  failed: "Falhou",
  pending: "Pendente",
  demo: "Demo",
};

export const TEMPLATE_PREVIEW_VARS: Record<string, string> = {
  cliente: "Maria Silva",
  pedido: "#5042",
  eta: "35",
  link_rastreio: "https://delivery.os/r/5042",
  entregador: "Carlos",
  distancia: "120",
  bairro: "Centro",
  endereco: "Rua das Flores, 42",
  minutos: "48",
  sla: "40",
};

export function mapServerLog(row: WhatsappMessageLog): MessageLog {
  return {
    id: row.id,
    timestamp: new Date(row.created_at).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    createdAt: row.created_at,
    recipient: row.recipient_label,
    type: row.recipient_type,
    content: row.content,
    status: row.status,
    templateKey: row.template_key,
  };
}

export function previewTemplateText(template: string): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => TEMPLATE_PREVIEW_VARS[key] ?? `{{${key}}}`);
}

export type WhatsappHubState = {
  activeTab: WhatsappTab;
  setActiveTab: (tab: WhatsappTab) => void;
  logs: MessageLog[];
  logsLoading: boolean;
  loadLogs: () => Promise<void>;
  triggerManualTest: (phone?: string) => Promise<void>;
  templates: Record<WhatsappTemplateKey, string>;
  setTemplates: Dispatch<SetStateAction<Record<WhatsappTemplateKey, string>>>;
  templatesLoading: boolean;
  templatesSaving: boolean;
  saveTemplates: () => Promise<void>;
  resetTemplates: () => Promise<void>;
  selectedApi: WhatsappProvider;
  setSelectedApi: (p: WhatsappProvider) => void;
  apiUrl: string;
  setApiUrl: (v: string) => void;
  apiKey: string;
  setApiKey: (v: string) => void;
  instanceName: string;
  setInstanceName: (v: string) => void;
  apiEnabled: boolean;
  setApiEnabled: (v: boolean) => void;
  apiKeySet: boolean;
  apiSource: "tenant" | "env" | "none";
  apiLoading: boolean;
  apiSaving: boolean;
  loadApiConfig: () => Promise<void>;
  saveApiConfig: () => Promise<void>;
  gatewayOnline: boolean;
  webhookInfo: { endpoints: { mercadopago: string; ifood: string; mock_payment: string } } | null;
};
