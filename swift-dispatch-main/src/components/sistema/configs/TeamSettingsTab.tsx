import { useStoreConfigs } from "@/hooks/useStoreConfigs";
import { roleLabel, type AppRole } from "@/lib/roles";
import { Users } from "lucide-react";

const ASSIGNABLE_ROLES: AppRole[] = ["manager", "kitchen", "driver", "cashier", "dispatcher", "viewer"];

export function TeamSettingsTab() {
  const {
    team,
    email,
    setEmail,
    role,
    setRole,
    busy,
    handleAssign,
    handleRemove,
  } = useStoreConfigs();

  return (
    <div className="space-y-8">
      <section className="erp-card p-5 space-y-4">
        <div className="flex items-center gap-2 font-medium">
          <Users className="size-4 text-primary" />
          Quem trabalha na loja
        </div>
        <p className="text-sm text-muted-foreground">
          Convide pelo e-mail e escolha a função. Cada pessoa só vê o que precisa.
        </p>
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
            aria-label="Função"
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
          <button type="submit" disabled={busy} className="erp-btn-primary disabled:opacity-50">
            Adicionar
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
                    {roleLabel(r)}
                    {r !== "owner" ? (
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-danger"
                        onClick={() => void handleRemove(m.user_id, r)}
                        aria-label={`Remover ${roleLabel(r)}`}
                      >
                        ×
                      </button>
                    ) : null}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
