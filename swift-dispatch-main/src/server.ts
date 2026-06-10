import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const { handleOpsStreamRequest } = await import("./lib/server/ops-sse");
      const sse = await handleOpsStreamRequest(request);
      if (sse) return sse;

      const { handlePaymentWebhookRequest } = await import("./lib/server/payment-webhook");
      const webhook = await handlePaymentWebhookRequest(request);
      if (webhook) return webhook;

      const { handleIntegrationWebhookRequest } = await import("./lib/server/integration-webhooks");
      const integrationWebhook = await handleIntegrationWebhookRequest(request);
      if (integrationWebhook) return integrationWebhook;

      const { handleIfoodCronRequest } = await import("./lib/server/ifood-cron");
      const ifoodCron = await handleIfoodCronRequest(request);
      if (ifoodCron) return ifoodCron;

      const { handlePushApiRequest } = await import("./lib/server/push-api");
      const pushApi = await handlePushApiRequest(request);
      if (pushApi) return pushApi;

      const { handleOrderLineItemsRequest } = await import("./lib/server/order-line-items");
      const lineItems = await handleOrderLineItemsRequest(request);
      if (lineItems) return lineItems;

      const { handlePublicApiRequest } = await import("./lib/server/public-api");
      const publicApi = await handlePublicApiRequest(request);
      if (publicApi) return publicApi;

      const { handleMenuAdminApiRequest } = await import("./lib/server/menu-admin-api");
      const menuAdmin = await handleMenuAdminApiRequest(request);
      if (menuAdmin) return menuAdmin;

      const { handleMenuUploadRequest } = await import("./lib/server/menu-upload");
      const menuUpload = await handleMenuUploadRequest(request);
      if (menuUpload) return menuUpload;

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
