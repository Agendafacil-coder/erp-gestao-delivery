import { webhookUrl, WEBHOOK_ENDPOINTS } from "@/lib/integrations/endpoints";
import { buildPaymentHubStatus } from "@/lib/payments/paymentEnvStatus";

export type ReadinessSeverity = "required" | "recommended" | "optional";

export type ReadinessItem = {
  id: string;
  label: string;
  done: boolean;
  severity: ReadinessSeverity;
  hint?: string;
};

export type ReadinessCategory = {
  id: string;
  label: string;
  items: ReadinessItem[];
};

export type ProductionReadinessReport = {
  nodeEnv: string;
  isProduction: boolean;
  ready: boolean;
  progress: { done: number; total: number; requiredDone: number; requiredTotal: number };
  publicAppUrl: string;
  webhookUrls: {
    payments: string;
    ifood: string;
    rappi: string;
    food99: string;
  };
  categories: ReadinessCategory[];
  warnings: string[];
};

function envSet(key: string): boolean {
  return Boolean(process.env[key]?.trim());
}

function envValue(key: string): string {
  return process.env[key]?.trim() ?? "";
}

function isProductionEnv(): boolean {
  return process.env.NODE_ENV === "production";
}

function isWeakSessionSecret(): boolean {
  const secret = envValue("SESSION_SECRET");
  if (secret.length < 32) return true;
  return /change-me|dev-session|demo/i.test(secret);
}

function isPublicUrlProductionReady(): boolean {
  const url = envValue("PUBLIC_APP_URL") || envValue("VITE_APP_URL");
  if (!url) return false;
  if (/localhost|127\.0\.0\.1/i.test(url)) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function buildCoreCategory(isProd: boolean): ReadinessCategory {
  const items: ReadinessItem[] = [
    {
      id: "database",
      label: "Banco de dados configurado",
      done: envSet("DATABASE_URL"),
      severity: "required",
      hint: "Peça ao suporte para configurar o banco de dados da loja.",
    },
    {
      id: "session_secret",
      label: "Segurança de login configurada",
      done: !isWeakSessionSecret(),
      severity: isProd ? "required" : "recommended",
      hint: "Configuração feita pelo suporte técnico.",
    },
    {
      id: "public_url",
      label: "Endereço público do sistema (https)",
      done: isPublicUrlProductionReady(),
      severity: isProd ? "required" : "recommended",
      hint: "Ex.: https://app.seudominio.com.br",
    },
  ];

  return { id: "core", label: "Infraestrutura", items };
}

function buildPaymentsCategory(isProd: boolean): ReadinessCategory {
  const hub = buildPaymentHubStatus();
  const items: ReadinessItem[] = [
    {
      id: "payment_provider",
      label: `Pagamentos online (${hub.providerLabel})`,
      done: isProd ? hub.provider !== "mock" && hub.ready : hub.ready || hub.provider === "mock",
      severity: isProd ? "required" : "optional",
      hint: "Mercado Pago, Stripe ou Asaas — configure em Financeiro → Pagamentos.",
    },
    ...hub.setupSteps
      .filter((step) => step.id !== "public_url")
      .map((step) => ({
        id: step.id,
        label: step.label,
        done: step.done,
        severity: (step.id === "public_url" ? "required" : "recommended") as ReadinessSeverity,
      })),
  ];

  return { id: "payments", label: "Pagamentos online", items };
}

function buildWhatsappCategory(): ReadinessCategory {
  const configured =
    envSet("WHATSAPP_API_URL") && envSet("WHATSAPP_API_KEY") && envSet("WHATSAPP_INSTANCE");
  return {
    id: "whatsapp",
    label: "WhatsApp",
    items: [
      {
        id: "whatsapp_evolution",
        label: "Servidor de WhatsApp configurado",
        done: configured,
        severity: "recommended",
        hint: "Conecte em Sistema → WhatsApp → Conectar WhatsApp.",
      },
      {
        id: "whatsapp_manager_phone",
        label: "Telefone do gerente para avisos de atraso",
        done: envSet("WHATSAPP_MANAGER_PHONE"),
        severity: "optional",
        hint: "Configuração feita pelo suporte técnico.",
      },
    ],
  };
}

function buildPushCategory(): ReadinessCategory {
  const vapid = envSet("VAPID_PUBLIC_KEY") && envSet("VAPID_PRIVATE_KEY");
  return {
    id: "push",
    label: "App do entregador",
    items: [
      {
        id: "vapid",
        label: "Alertas no celular do entregador",
        done: vapid,
        severity: "recommended",
        hint: "Configuração feita pelo suporte técnico.",
      },
      {
        id: "vapid_subject",
        label: "Notificações push ativas",
        done: envSet("VAPID_SUBJECT"),
        severity: "optional",
        hint: "Configuração feita pelo suporte técnico.",
      },
    ],
  };
}

function buildIntegrationsCategory(): ReadinessCategory {
  return {
    id: "integrations",
    label: "Integrações",
    items: [
      {
        id: "ifood_cron",
        label: "Importação automática de pedidos iFood",
        done: envSet("IFOOD_CRON_SECRET"),
        severity: "recommended",
        hint: "Ative em Sistema → Automações → iFood.",
      },
      {
        id: "rappi_cron",
        label: "Importação automática de pedidos Rappi",
        done: envSet("RAPPI_CRON_SECRET") || envSet("IFOOD_CRON_SECRET"),
        severity: "optional",
        hint: "Ative em Sistema → Automações → Rappi.",
      },
      {
        id: "food99_cron",
        label: "Importação automática de pedidos 99Food",
        done: envSet("FOOD99_CRON_SECRET") || envSet("IFOOD_CRON_SECRET"),
        severity: "optional",
        hint: "Ative em Sistema → Automações → 99Food.",
      },
      {
        id: "mapbox",
        label: "Mapa e rastreio de entrega",
        done: envSet("VITE_MAPBOX_TOKEN"),
        severity: "recommended",
        hint: "Configuração feita pelo suporte técnico.",
      },
    ],
  };
}

export function buildProductionReadinessReport(
  env: NodeJS.ProcessEnv = process.env,
): ProductionReadinessReport {
  const prev = process.env;
  process.env = { ...prev, ...env };

  try {
    const isProd = isProductionEnv();
    const categories = [
      buildCoreCategory(isProd),
      buildPaymentsCategory(isProd),
      buildWhatsappCategory(),
      buildPushCategory(),
      buildIntegrationsCategory(),
    ];

    const allItems = categories.flatMap((c) => c.items);
    const required = allItems.filter((i) => i.severity === "required");
    const warnings: string[] = [];

    if (isProd && envValue("PAYMENT_PROVIDER") === "mock") {
      warnings.push("Pagamentos ainda em modo de teste — não use em produção.");
    }
    if (isProd && isWeakSessionSecret()) {
      warnings.push("Segurança de login fraca — fale com o suporte.");
    }
    if (isProd && !isPublicUrlProductionReady()) {
      warnings.push(
        "O endereço do sistema precisa ser https para pagamentos e rastreio funcionarem.",
      );
    }

    const publicAppUrl = (
      envValue("PUBLIC_APP_URL") ||
      envValue("VITE_APP_URL") ||
      "http://localhost:3000"
    ).replace(/\/$/, "");

    return {
      nodeEnv: envValue("NODE_ENV") || "development",
      isProduction: isProd,
      ready: required.every((i) => i.done),
      progress: {
        done: allItems.filter((i) => i.done).length,
        total: allItems.length,
        requiredDone: required.filter((i) => i.done).length,
        requiredTotal: required.length,
      },
      publicAppUrl,
      webhookUrls: {
        payments: webhookUrl(WEBHOOK_ENDPOINTS.payments.webhook.path),
        ifood: webhookUrl(WEBHOOK_ENDPOINTS.ifood.orders.path),
        rappi: webhookUrl(WEBHOOK_ENDPOINTS.rappi.orders.path),
        food99: webhookUrl(WEBHOOK_ENDPOINTS.food99.orders.path),
      },
      categories,
      warnings,
    };
  } finally {
    process.env = prev;
  }
}
