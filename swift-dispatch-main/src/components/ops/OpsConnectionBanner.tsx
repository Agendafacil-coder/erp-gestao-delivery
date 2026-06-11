import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { USE_POSTGRES } from "@/lib/repositories";

type HealthStatus = "unknown" | "ok" | "down";

/** Banner só para falha real do Postgres — SSE/polling rodam em silêncio. */
export function OpsConnectionBanner() {
  const [health, setHealth] = useState<HealthStatus>("unknown");

  useEffect(() => {
    if (!USE_POSTGRES) return;

    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch("/api/health");
        const data = (await res.json()) as { ok?: boolean };
        if (cancelled) return;
        setHealth(res.ok && data.ok !== false ? "ok" : "down");
      } catch {
        if (!cancelled) setHealth("down");
      }
    };

    void check();
    const timer = setInterval(check, 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (!USE_POSTGRES || health !== "down") return null;

  return (
    <div
      className="shrink-0 px-3 py-2 text-xs flex items-center gap-2 border-b bg-danger/10 border-danger/30 text-danger"
      role="alert"
    >
      <AlertTriangle className="size-3.5 shrink-0" />
      <span>
        Banco indisponível — verifique Postgres e rode{" "}
        <code className="font-mono text-[10px]">npm run db:migrate</code>
      </span>
    </div>
  );
}
