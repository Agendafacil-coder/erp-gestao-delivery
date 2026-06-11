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
      label: "PostgreSQL (DATABASE_URL)",
      done: envSet("DATABASE_URL"),
      severity: "required",
      hint: "Banco gerenciado ou Docker com backup automático.",
    },
    {
      id: "session_secret",
      label: "SESSION_SECRET forte (32+ caracteres)",
      done: !isWeakSessionSecret(),
      severity: isProd ? "required" : "recommended",
      hint: "Gere: openssl rand -hex 32",
    },
    {
      id: "public_url",
      label: "PUBLIC_APP_URL pública com HTTPS",
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
      label: `Provedor de pagamento (${hub.providerLabel})`,
      done: isProd ? hub.provider !== "mock" && hub.ready : hub.ready || hub.provider === "mock",
      severity: isProd ? "required" : "optional",
      hint: "PAYMENT_PROVIDER=mercadopago | stripe | asaas",
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
        label: "Evolution API configurada",
        done: configured,
        severity: "recommended",
        hint: "WHATSAPP_API_URL, WHATSAPP_API_KEY, WHATSAPP_INSTANCE",
      },
      {
        id: "whatsapp_manager_phone",
        label: "Telefone do gerente (alertas SLA)",
        done: envSet("WHATSAPP_MANAGER_PHONE"),
        severity: "optional",
        hint: "WHATSAPP_MANAGER_PHONE=5511999999999",
      },
    ],
  };
}

function buildPushCategory(): ReadinessCategory {
  const vapid = envSet("VAPID_PUBLIC_KEY") && envSet("VAPID_PRIVATE_KEY");
  return {
    id: "push",
    label: "Push (PWA entregador)",
    items: [
      {
        id: "vapid",
        label: "Chaves VAPID configuradas",
        done: vapid,
        severity: "recommended",
        hint: "npx web-push generate-vapid-keys",
      },
      {
        id: "vapid_subject",
        label: "VAPID_SUBJECT (mailto ou https)",
        done: envSet("VAPID_SUBJECT"),
        severity: "optional",
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
        label: "Cron iFood protegido (IFOOD_CRON_SECRET)",
        done: envSet("IFOOD_CRON_SECRET"),
        severity: "recommended",
        hint: "POST /api/cron/ifood-poll com header x-cron-secret",
      },
      {
        id: "mapbox",
        label: "Mapbox (mapa e rastreio)",
        done: envSet("VITE_MAPBOX_TOKEN"),
        severity: "recommended",
        hint: "VITE_MAPBOX_TOKEN=pk....",
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
      warnings.push("PAYMENT_PROVIDER=mock não deve ser usado em produção.");
    }
    if (isProd && isWeakSessionSecret()) {
      warnings.push("SESSION_SECRET fraco — risco de sessões forjadas.");
    }
    if (isProd && !isPublicUrlProductionReady()) {
      warnings.push("PUBLIC_APP_URL deve ser HTTPS público para webhooks e rastreio.");
    }

    const publicAppUrl = (
      envValue("PUBLIC_APP_URL") || envValue("VITE_APP_URL") || "http://localhost:3000"
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
      },
      categories,
      warnings,
    };
  } finally {
    process.env = prev;
  }
}
