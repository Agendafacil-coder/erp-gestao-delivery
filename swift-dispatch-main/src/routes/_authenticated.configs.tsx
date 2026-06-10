import { OpsPage } from "@/components/ops/OpsPage";
import { OpsPageHeader } from "@/components/ops/OpsPageHeader";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTenant } from "@/hooks/useTenant";
import { useOps } from "@/hooks/useOps";
import { useI18n } from "@/hooks/useI18n";
import { assignTeamRoleFn, listTeamFn, removeTeamRoleFn, type TeamMember } from "@/functions/team";
import type { AppRole } from "@/lib/roles";
import { toast } from "sonner";
import { Users, Link2, Copy, MapPin, Loader2 } from "lucide-react";
import { getStoreSettingsFn, updateStoreRegionFn } from "@/functions/storeSettings";

const ASSIGNABLE_ROLES: AppRole[] = ["manager", "kitchen", "driver", "cashier", "dispatcher", "viewer"];

export const Route = createFileRoute("/_authenticated/configs")({
  component: ConfigsPage,
});

function ConfigsPage() {
  const { current } = useTenant();
  const { tick } = useOps();
  const { t } = useI18n();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("kitchen");
  const [busy, setBusy] = useState(false);
  const [storeBusy, setStoreBusy] = useState(false);
  const [storeAddress, setStoreAddress] = useState("");
  const [storeCity, setStoreCity] = useState("");
  const [storeState, setStoreState] = useState("");
  const [storePostalCode, setStorePostalCode] = useState("");

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

  const loadStoreSettings = async () => {
    if (!current) return;
    try {
      const settings = await getStoreSettingsFn({ data: { tenantId: current.id } });
      setStoreAddress(settings.store_address ?? "");
      setStoreCity(settings.store_city ?? "");
      setStoreState(settings.store_state ?? "");
      setStorePostalCode(settings.store_postal_code ?? "");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  useEffect(() => {
    void loadTeam();
    void loadStoreSettings();
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

  const handleSaveStoreRegion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) return;
    setStoreBusy(true);
    try {
      const saved = await updateStoreRegionFn({
        data: {
          tenantId: current.id,
          store_address: storeAddress || null,
          store_city: storeCity,
          store_state: storeState,
          store_postal_code: storePostalCode || null,
        },
      });
      setStoreCity(saved.store_city ?? "");
      setStoreState(saved.store_state ?? "");
      setStorePostalCode(saved.store_postal_code ?? "");
      toast.success("Região da loja salva — entregas usarão esta cidade no GPS");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setStoreBusy(false);
    }
  };

  const copyMenuLink = () => {
    if (!menuUrl) return;
    void navigator.clipboard.writeText(menuUrl);
    toast.success("Link do cardápio copiado");
  };

  return (
    <OpsPage className="max-w-3xl space-y-8">
      <OpsPageHeader
        subtitle="Administração"
        title="Configurações"
        description="Equipe, cardápio digital e links públicos"
        className="pb-0"
      />

            <section className="erp-card p-5 space-y-4">
              <div className="flex items-center gap-2 font-medium">
                <MapPin className="size-4 text-primary" />
                Região da loja (entregas e GPS)
              </div>
              <p className="text-sm text-muted-foreground">
                Cidade e UF usadas para montar o endereço completo nas entregas e no Google Maps.
                Sem isso, o sistema não sabe em qual cidade geocodificar os pedidos.
              </p>
              <form onSubmit={handleSaveStoreRegion} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Endereço da loja</label>
                  <input
                    value={storeAddress}
                    onChange={(e) => setStoreAddress(e.target.value)}
                    placeholder="Rua, número — bairro"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">Cidade *</label>
                    <input
                      value={storeCity}
                      onChange={(e) => setStoreCity(e.target.value)}
                      placeholder="Ex.: Aguaí"
                      required
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">UF *</label>
                    <input
                      value={storeState}
                      onChange={(e) => setStoreState(e.target.value.toUpperCase().slice(0, 2))}
                      placeholder="SP"
                      required
                      maxLength={2}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm uppercase"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">CEP (opcional)</label>
                  <input
                    value={storePostalCode}
                    onChange={(e) => setStorePostalCode(e.target.value)}
                    placeholder="00000-000"
                    className="mt-1 w-full max-w-xs rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={storeBusy}
                  className="erp-btn-primary disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {storeBusy ? <Loader2 className="size-4 animate-spin" /> : null}
                  Salvar região
                </button>
              </form>
            </section>

            <section className="erp-card p-5 space-y-3">
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
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
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

            <section className="erp-card p-5 space-y-4">
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
                  className="erp-btn-primary disabled:opacity-50"
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
    </OpsPage>
  );
}
