import { pollAllRappiTenants } from "@/lib/integrations/rappi/pollAllTenants";

const CRON_PATH = "/api/cron/rappi-poll";

function isAuthorized(request: Request): boolean {
  const secret = process.env.RAPPI_CRON_SECRET?.trim() || process.env.IFOOD_CRON_SECRET?.trim();
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const header = request.headers.get("x-cron-secret");
  if (header === secret) return true;

  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

export async function handleRappiCronRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== CRON_PATH) return null;

  if (request.method !== "POST" && request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const summary = await pollAllRappiTenants();
    return Response.json(summary);
  } catch (err) {
    console.error("[rappi-cron]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Erro no cron Rappi" },
      { status: 500 },
    );
  }
}
