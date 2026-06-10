import { pollAllIfoodTenants } from "@/lib/integrations/ifood/pollAllTenants";

const CRON_PATH = "/api/cron/ifood-poll";

function isAuthorized(request: Request): boolean {
  const secret = process.env.IFOOD_CRON_SECRET?.trim();
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const header = request.headers.get("x-cron-secret");
  if (header === secret) return true;

  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

export async function handleIfoodCronRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== CRON_PATH) return null;

  if (request.method !== "POST" && request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const summary = await pollAllIfoodTenants();
    return Response.json(summary);
  } catch (err) {
    console.error("[ifood-cron]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Erro no cron iFood" },
      { status: 500 },
    );
  }
}
