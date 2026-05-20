import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { OpsSidebar } from "@/components/ops/Sidebar";
import { OpsHeader } from "@/components/ops/Header";
import { Onboarding } from "@/components/ops/Onboarding";
import { useTenant } from "@/hooks/useTenant";
import { useOps } from "@/hooks/useOps";
import { useI18n } from "@/hooks/useI18n";
import { assignTeamRoleFn, listTeamFn, removeTeamRoleFn, type TeamMember } from "@/functions/team";
import type { AppRole } from "@/lib/roles";
import { toast } from "sonner";
import { Users, Link2, Copy, Settings } from "lucide-react";

const ASSIGNABLE_ROLES: AppRole[] = ["manager", "kitchen", "driver", "cashier", "dispatcher", "viewer"];

export const Route = createFileRoute("/_authenticated/configs")({
  component: ConfigsPage,
});

function ConfigsPage() {
  const { current, loading } = useTenant();
  const { tick } = useOps();
  const { t } = useI18n();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("kitchen");
  const [busy, setBusy] = useState(false);

  const menuUrl =
    typeof window !== "undefined" && current
      ? `${window.location.origin}/${current.slug}`
      : "";

  const loadTeam = async () => {
    if (!current) return;
    try {
      const members = await listTeamFn({ data: { tenantId: current.id } });
      setTeam(members);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  useEffect(() => {
    void loadTeam();
  }, [current?.id]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) return;
    setBusy(true);
    try {
      await assignTeamRoleFn({ data: { tenantId: current.id, email, role } });
      toast.success("Papel atribuído");
      setEmail("");
      await loadTeam();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (userId: string, r: AppRole) => {
    if (!current) return;
    try {
      await removeTeamRoleFn({ data: { tenantId: current.id, userId, role: r } });
      toast.success("Papel removido");
      await loadTeam();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const copyMenuLink = () => {
    if (!menuUrl) return;
    void navigator.clipboard.writeText(menuUrl);
    toast.success("Link do cardápio copiado");
  };

  return (
    <div className="min-h-screen flex">
      <OpsSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <OpsHeader tick={tick} />
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            {t("common", "loading")}
          </div>
        ) : !current ? (
          <Onboarding />
        ) : (
          <main className="flex-1 p-6 space-y-8 overflow-y-auto max-w-3xl">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <Settings className="size-5" />
                <h1 className="text-2xl font-display font-semibold">Configurações</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Equipe, cardápio digital e links públicos
              </p>
            </div>

            <section className="glass rounded-2xl border border-border p-5 space-y-3">
              <div className="flex items-center gap-2 font-medium">
                <Link2 className="size-4 text-primary" />
                Cardápio digital (link público)
              </div>
              <p className="text-sm text-muted-foreground">
                Compartilhe com clientes para pedir e acompanhar o pedido.
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={menuUrl}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={copyMenuLink}
                  className="rounded-lg border border-border px-3 py-2 hover:bg-surface-elevated/50"
                >
                  <Copy className="size-4" />
                </button>
              </div>
            </section>

            <section className="glass rounded-2xl border border-border p-5 space-y-4">
              <div className="flex items-center gap-2 font-medium">
                <Users className="size-4 text-primary" />
                Equipe
              </div>
              <form onSubmit={handleAssign} className="flex flex-wrap gap-2">
                <input
                  type="email"
                  placeholder="email@restaurante.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 min-w-[200px] rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  required
                />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as AppRole)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
                >
                  Atribuir papel
                </button>
              </form>
              <ul className="space-y-2">
                {team.map((m) => (
                  <li
                    key={m.user_id}
                    className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
                  >
                    <div>
                      <div className="font-medium">{m.full_name}</div>
                      <div className="text-xs text-muted-foreground">{m.email}</div>
                    </div>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {m.roles.map((r) => (
                        <span
                          key={r}
                          className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs"
                        >
                          {r}
                          {r !== "owner" && (
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-danger"
                              onClick={() => void handleRemove(m.user_id, r)}
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </main>
        )}
      </div>
    </div>
  );
}
