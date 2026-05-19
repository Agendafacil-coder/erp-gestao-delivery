import { getSessionUser } from "@/functions/session";
import { fetchOpsSnapshot } from "@/functions/ops";

export async function handleOpsStreamRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/api/ops/stream") return null;

  const tenantId = url.searchParams.get("tenantId");
  if (!tenantId) {
    return new Response("tenantId obrigatório", { status: 400 });
  }

  const user = await getSessionUser();
  if (!user) {
    return new Response("Não autenticado", { status: 401 });
  }

  const hasAccess = user.roles.some((r) => r.tenant_id === tenantId);
  if (!hasAccess) {
    return new Response("Sem permissão", { status: 403 });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        if (closed) return;
        try {
          const snapshot = await fetchOpsSnapshot(tenantId);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(snapshot)}\n\n`));
        } catch (e) {
          console.error("SSE ops error:", e);
        }
      };

      await send();
      const interval = setInterval(send, 3000);

      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        controller.close();
      });
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
