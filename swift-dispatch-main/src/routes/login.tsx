import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Bike, ChefHat, Loader2, Shield, Zap } from "lucide-react";
import { toast } from "sonner";
import { authRepository, USE_POSTGRES } from "@/lib/repositories";
import { defaultRouteForRole, pickPrimaryRole } from "@/lib/roles";
import { getSessionFn } from "@/functions/auth";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: (s.redirect as string) || "/central",
  }),
  beforeLoad: async ({ search }) => {
    const user = await authRepository.getUser();
    if (user) throw redirect({ to: search.redirect || "/central" });
  },
  component: LoginPage,
});

const DEV_PROFILES = [
  {
    id: "admin",
    label: "Administrador",
    description: "Central, financeiro, configurações",
    email: "operador@deliveryos.com.br",
    password: "demo1234",
    icon: Shield,
  },
  {
    id: "kitchen",
    label: "Cozinha",
    description: "KDS e fila de produção",
    email: "cozinha@deliveryos.com.br",
    password: "demo1234",
    icon: ChefHat,
  },
  {
    id: "driver",
    label: "Entregador",
    description: "App do entregador e rotas",
    email: "entregador@deliveryos.com.br",
    password: "demo1234",
    icon: Bike,
  },
] as const;

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        await authRepository.signUp(email, name, password);
        toast.success("Conta criada com sucesso!");
      } else {
        await authRepository.signIn(email, password);
      }

      const session = USE_POSTGRES ? await getSessionFn() : null;
      const target =
        search.redirect && search.redirect !== "/central"
          ? search.redirect
          : resolvePostLoginRoute(session);
      navigate({ to: target });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-1 relative overflow-hidden border-r border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20" />
        <div className="absolute inset-0 aurora opacity-60" />
        <div className="relative z-10 flex flex-col justify-center p-12 max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="size-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary to-accent">
              <Zap className="size-6 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-2xl font-display font-bold">Delivery OS</div>
              <div className="text-sm text-muted-foreground">Gestão para todos</div>
            </div>
          </div>
          <h1 className="text-3xl font-display font-bold leading-tight">
            Donos, equipe, entregadores e clientes — cada um no seu lugar.
          </h1>
          <p className="mt-4 text-muted-foreground">
            PostgreSQL local · GPS · dispatch inteligente · multi-papel
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4 content-enter">
        <div className="glass rounded-2xl p-8 border border-border/80 shadow-[var(--shadow-lift)] space-y-6">
          <div className="lg:hidden flex items-center gap-2 justify-center mb-4">
            <Zap className="size-5 text-primary" />
            <span className="font-display font-semibold">Delivery OS</span>
          </div>

          <div>
            <h2 className="text-xl font-semibold">{mode === "login" ? "Entrar" : "Criar conta"}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "login" ? "Acesse com seu e-mail e senha" : "Cadastre sua operação"}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-xs text-muted-foreground">Nome</label>
                <input
                  className="erp-input mt-1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground">Email</label>
              <input
                type="email"
                className="erp-input mt-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operador@deliveryos.com.br"
                required
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Senha</label>
              <input
                type="password"
                className="erp-input mt-1"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="demo1234"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="erp-btn-primary w-full justify-center py-2.5 disabled:opacity-50"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {mode === "login" ? "Entrar" : "Cadastrar"}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {mode === "login" ? "Não tem conta?" : "Já tem conta?"}{" "}
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? "Cadastre-se" : "Entrar"}
            </button>
          </p>
        </div>

        {import.meta.env.DEV && mode === "login" && (
          <div className="glass rounded-2xl p-5 border border-border/80 shadow-[var(--shadow-lift)] space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Acesso rápido (dev)</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Preenche e-mail e senha do perfil. Depois clique em Entrar.
              </p>
            </div>
            <div className="space-y-2">
              {DEV_PROFILES.map((profile) => {
                const Icon = profile.icon;
                const active = email === profile.email;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => {
                      setEmail(profile.email);
                      setPassword(profile.password);
                    }}
                    className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                      active
                        ? "border-primary/50 bg-primary/10"
                        : "border-border bg-background/50 hover:border-primary/30 hover:bg-muted/40"
                    }`}
                  >
                    <span
                      className={`size-9 shrink-0 rounded-lg flex items-center justify-center ${
                        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">{profile.label}</span>
                      <span className="block text-[11px] text-muted-foreground truncate">
                        {profile.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

function resolvePostLoginRoute(
  session: { roles: Array<{ tenant_id: string; role: string }> } | null,
): string {
  if (!USE_POSTGRES || !session?.roles.length) return "/central";
  const tenantId = session.roles[0]?.tenant_id;
  if (!tenantId) return "/central";
  const tenantRoles = session.roles
    .filter((r) => r.tenant_id === tenantId)
    .map((r) => r.role);
  return defaultRouteForRole(pickPrimaryRole(tenantRoles));
}
