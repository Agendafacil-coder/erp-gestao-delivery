import { WEBHOOK_ENDPOINTS, webhookUrl } from "@/lib/integrations/endpoints";
import type { PaymentProviderName } from "./providerName";

export type ProviderCredentialStatus = {
  accessTokenSet?: boolean;
  webhookSecretSet?: boolean;
  secretKeySet?: boolean;
  apiKeySet?: boolean;
  webhookTokenSet?: boolean;
  sandbox?: boolean;
};

export type PaymentHubStatus = {
  provider: PaymentProviderName;
  providerLabel: string;
  nodeEnv: string;
  webhookUrl: string;
  publicAppUrl: string;
  ready: boolean;
  credentials: {
    mercadopago: { accessTokenSet: boolean; webhookSecretSet: boolean };
    stripe: { secretKeySet: boolean; webhookSecretSet: boolean };
    asaas: { apiKeySet: boolean; webhookTokenSet: boolean; sandbox: boolean };
  };
  setupSteps: Array<{ id: string; label: string; done: boolean }>;
  supportedProviders: Array<{
    id: PaymentProviderName;
    label: string;
    pix: boolean;
    card: boolean;
    envHint: string;
  }>;
};

const PROVIDER_LABELS: Record<PaymentProviderName, string> = {
  mock: "Mock (desenvolvimento)",
  mercadopago: "Mercado Pago",
  stripe: "Stripe",
  asaas: "Asaas",
};

function envSet(key: string): boolean {
  return Boolean(process.env[key]?.trim());
}

function resolveProvider(): PaymentProviderName {
  const isProd = process.env.NODE_ENV === "production";
  const raw = process.env.PAYMENT_PROVIDER?.trim();
  if (raw === "mercadopago" || raw === "stripe" || raw === "asaas" || raw === "mock") {
    return raw;
  }
  return isProd ? "mercadopago" : "mock";
}

function buildSetupSteps(
  provider: PaymentProviderName,
  creds: PaymentHubStatus["credentials"],
): PaymentHubStatus["setupSteps"] {
  const publicUrl = (
    process.env.PUBLIC_APP_URL ??
    process.env.VITE_APP_URL ??
    "http://localhost:3000"
  ).trim();

  const steps: PaymentHubStatus["setupSteps"] = [
    {
      id: "public_url",
      label: "Defina PUBLIC_APP_URL com URL pública do app",
      done: publicUrl.length > 0 && !publicUrl.includes("localhost"),
    },
    {
      id: "webhook",
      label: "Configure o webhook no painel do PSP",
      done: provider === "mock" || isProviderReady(provider, creds),
    },
  ];

  switch (provider) {
    case "mercadopago":
      steps.push(
        {
          id: "mp_token",
          label: "MERCADOPAGO_ACCESS_TOKEN no .env do servidor",
          done: creds.mercadopago.accessTokenSet,
        },
        {
          id: "mp_secret",
          label: "MERCADOPAGO_WEBHOOK_SECRET (recomendado em produção)",
          done: creds.mercadopago.webhookSecretSet,
        },
      );
      break;
    case "stripe":
      steps.push(
        {
          id: "stripe_key",
          label: "STRIPE_SECRET_KEY no .env do servidor",
          done: creds.stripe.secretKeySet,
        },
        {
          id: "stripe_wh",
          label: "STRIPE_WEBHOOK_SECRET (eventos payment_intent / checkout.session)",
          done: creds.stripe.webhookSecretSet,
        },
      );
      break;
    case "asaas":
      steps.push(
        {
          id: "asaas_key",
          label: "ASAAS_API_KEY no .env do servidor",
          done: creds.asaas.apiKeySet,
        },
        {
          id: "asaas_wh",
          label: "ASAAS_WEBHOOK_TOKEN no webhook do Asaas",
          done: creds.asaas.webhookTokenSet,
        },
      );
      break;
    default:
      steps.push({
        id: "mock_ok",
        label: "Modo mock — use /api/payments/confirm-mock no rastreio",
        done: true,
      });
  }

  return steps;
}

function isProviderReady(
  provider: PaymentProviderName,
  creds: PaymentHubStatus["credentials"],
): boolean {
  if (provider === "mock") return true;
  if (provider === "mercadopago") return creds.mercadopago.accessTokenSet;
  if (provider === "stripe") return creds.stripe.secretKeySet;
  if (provider === "asaas") return creds.asaas.apiKeySet;
  return false;
}

export function buildPaymentHubStatus(): PaymentHubStatus {
  const provider = resolveProvider();
  const credentials = {
    mercadopago: {
      accessTokenSet: envSet("MERCADOPAGO_ACCESS_TOKEN"),
      webhookSecretSet: envSet("MERCADOPAGO_WEBHOOK_SECRET"),
    },
    stripe: {
      secretKeySet: envSet("STRIPE_SECRET_KEY"),
      webhookSecretSet: envSet("STRIPE_WEBHOOK_SECRET"),
    },
    asaas: {
      apiKeySet: envSet("ASAAS_API_KEY"),
      webhookTokenSet: envSet("ASAAS_WEBHOOK_TOKEN"),
      sandbox: process.env.ASAAS_SANDBOX === "true",
    },
  };

  const ready = isProviderReady(provider, credentials);
  const setupSteps = buildSetupSteps(provider, credentials);

  return {
    provider,
    providerLabel: PROVIDER_LABELS[provider],
    nodeEnv: process.env.NODE_ENV ?? "development",
    webhookUrl: webhookUrl(WEBHOOK_ENDPOINTS.payments.webhook.path),
    publicAppUrl: (
      process.env.PUBLIC_APP_URL ??
      process.env.VITE_APP_URL ??
      "http://localhost:3000"
    ).replace(/\/$/, ""),
    ready,
    credentials,
    setupSteps,
    supportedProviders: [
      {
        id: "mock",
        label: "Mock",
        pix: true,
        card: true,
        envHint: "PAYMENT_PROVIDER=mock",
      },
      {
        id: "mercadopago",
        label: "Mercado Pago",
        pix: true,
        card: true,
        envHint: "PAYMENT_PROVIDER=mercadopago",
      },
      {
        id: "stripe",
        label: "Stripe",
        pix: true,
        card: true,
        envHint: "PAYMENT_PROVIDER=stripe",
      },
      {
        id: "asaas",
        label: "Asaas",
        pix: true,
        card: true,
        envHint: "PAYMENT_PROVIDER=asaas",
      },
    ],
  };
}
