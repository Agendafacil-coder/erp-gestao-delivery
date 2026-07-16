import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Bike, ChefHat, Loader2, Shield, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { authRepository } from "@/lib/repositories";
import { resolveAuthenticatedHome } from "@/lib/auth/redirect";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ptBrInputProps } from "@/lib/forms/ptBrValidation";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: (s.redirect as string) || undefined,
  }),
  beforeLoad: async ({ search }) => {
    const user = await authRepository.getUser();
    if (user) {
      const target = await resolveAuthenticatedHome(search.redirect);
      throw redirect({ to: target });
    }
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
    description: "KDS e fila de preparo",
    email: "cozinha@deliveryos.com.br",
    password: "demo1234",
    icon: ChefHat,
  },
  {
    id: "driver",
    label: "Entregador",
    description: "Rotas e entregas",
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
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const clearFieldValidity = () => {
    emailRef.current?.setCustomValidity("");
    passwordRef.current?.setCustomValidity("");
    nameRef.current?.setCustomValidity("");
  };

  const fillDevProfile = (profile: (typeof DEV_PROFILES)[number]) => {
    setEmail(profile.email);
    setPassword(profile.password);
    // setState não dispara onInput — limpa mensagem nativa presa de tentativas anteriores
    clearFieldValidity();
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearFieldValidity();
    if (!e.currentTarget.reportValidity()) return;

    setBusy(true);
    try {
      if (mode === "signup") {
        await authRepository.signUp(email, name, password);
        toast.success("Conta criada com sucesso!");
      } else {
        await authRepository.signIn(email, password);
      }
      const target = await resolveAuthenticatedHome(search.redirect);
      navigate({ to: target });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell grid min-h-dvh lg:grid-cols-2">
      <aside className="auth-panel content-enter">
        <BrandLogo size="md" tagline="Operações de delivery em tempo real" />
        <div className="max-w-sm space-y-6">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground leading-tight">
              Gerencie pedidos, cozinha e entregas em um só lugar.
            </h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Central operacional, KDS, app do entregador, cardápio digital e integrações — tudo
              sincronizado em tempo real.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {["Kanban e mapa ao vivo", "WhatsApp e iFood", "PIX e rastreio público"].map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <span className="size-1.5 rounded-full bg-primary shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">© Delivery OS</p>
      </aside>

      <div className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="mb-8 lg:hidden content-enter">
          <BrandLogo size="md" tagline="Operações de delivery" />
        </div>

        <div className="auth-card content-enter w-full max-w-md p-7 sm:p-9">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              {mode === "login" ? "Entrar" : "Criar conta"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "login"
                ? "Use seu e-mail e senha para acessar o painel"
                : "Cadastre sua loja e comece a operar"}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4" noValidate>
            {mode === "signup" && (
              <label className="block">
                <span className="auth-label">Nome</span>
                <input
                  ref={nameRef}
                  className="auth-input mt-1.5"
                  value={name}
                  onChange={(e) => {
                    e.currentTarget.setCustomValidity("");
                    setName(e.target.value);
                  }}
                  required
                  {...ptBrInputProps()}
                />
              </label>
            )}
            <label className="block">
              <span className="auth-label">E-mail</span>
              <input
                ref={emailRef}
                type="email"
                className="auth-input mt-1.5"
                value={email}
                onChange={(e) => {
                  e.currentTarget.setCustomValidity("");
                  setEmail(e.target.value);
                }}
                placeholder="operador@deliveryos.com.br"
                required
                autoComplete="email"
                {...ptBrInputProps()}
              />
            </label>
            <label className="block">
              <span className="auth-label">Senha</span>
              <input
                ref={passwordRef}
                type="password"
                className="auth-input mt-1.5"
                value={password}
                onChange={(e) => {
                  e.currentTarget.setCustomValidity("");
                  setPassword(e.target.value);
                }}
                placeholder="demo1234"
                required
                minLength={6}
                autoComplete="current-password"
                {...ptBrInputProps()}
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="erp-btn-primary mt-2 w-full justify-center py-2.5 disabled:opacity-50"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {mode === "login" ? "Acessar painel" : "Criar conta"}
              {!busy && <ArrowRight className="size-4 opacity-80" />}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "login" ? "Não tem conta?" : "Já tem conta?"}{" "}
            <button
              type="button"
              className="font-semibold text-primary hover:underline"
              onClick={() => {
                clearFieldValidity();
                setMode(mode === "login" ? "signup" : "login");
              }}
            >
              {mode === "login" ? "Cadastre-se" : "Entrar"}
            </button>
          </p>
        </div>

        {import.meta.env.DEV && mode === "login" && (
          <div className="auth-card content-enter mt-4 w-full max-w-md p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Dev · acesso rápido
            </p>
            <div className="mt-3 space-y-2">
              {DEV_PROFILES.map((profile) => {
                const Icon = profile.icon;
                const active = email === profile.email;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => fillDevProfile(profile)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                      active
                        ? "border-primary/40 bg-primary/5"
                        : "border-border/60 bg-muted/30 hover:bg-muted/60"
                    }`}
                  >
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                        active ? "brand-mark" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">
                        {profile.label}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {profile.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <Link
          to="/"
          className="mt-8 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          ← Voltar ao site
        </Link>
      </div>
    </div>
  );
}
