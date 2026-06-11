import { getSessionUserFromRequest } from "@/functions/session";
import { fetchOpsSnapshotCore } from "@/lib/server/ops-snapshot";
import { getBufferedAutomationEvents } from "@/lib/ops/automationEventBus";
import { assertCanAccessOpsSnapshot } from "@/lib/rbac";

function sseIntervalMs(): number {
  const raw = Number(process.env.OPS_SSE_INTERVAL_MS ?? "5000");
  return Number.isFinite(raw) && raw >= 2000 ? raw : 5000;
}

export async function handleOpsStreamRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/api/ops/stream") return null;

  const tenantId = url.searchParams.get("tenantId");
  if (!tenantId) {
    return new Response("tenantId obrigatório", { status: 400 });
  }

  const user = await getSessionUserFromRequest(request);
  if (!user) {
    return new Response("Não autenticado", { status: 401 });
  }

  const hasAccess = user.roles.some((r) => r.tenant_id === tenantId);
  if (!hasAccess) {
    return new Response("Sem permissão", { status: 403 });
  }

  try {
    assertCanAccessOpsSnapshot(user, tenantId);
  } catch {
    return new Response("Sem permissão para visualizar operações", { status: 403 });
  }

  const intervalMs = sseIntervalMs();
  const encoder = new TextEncoder();
  let closed = false;
  let closeStream: (() => void) | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      let interval: ReturnType<typeof setInterval> | null = null;

      closeStream = () => {
        if (closed) return;
        closed = true;
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
        // Não chamar controller.close() — abort/cancel/HMR já invalidam o stream;
        // fechar de novo dispara ERR_INVALID_STATE e derruba o processo Node.
      };

      const send = async () => {
        if (closed) return;
        try {
          const core = await fetchOpsSnapshotCore(tenantId);
          const snapshot = {
            ...core,
            automationEvents: getBufferedAutomationEvents(tenantId),
          };
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(snapshot)}\n\n`));
          } catch {
            closeStream();
          }
        } catch (e) {
          if (!closed) console.error("SSE ops error:", e);
        }
      };

      await send();
      interval = setInterval(send, intervalMs);

      request.signal.addEventListener("abort", closeStream, { once: true });
    },
    cancel() {
      closeStream?.();
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
