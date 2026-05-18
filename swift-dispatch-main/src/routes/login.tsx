import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: (s.redirect as string) || "/central",
  }),
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: search.redirect || "/central" });
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  // If session arrives via OAuth, redirect.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s?.user) navigate({ to: search.redirect || "/central" });
    });
    return () => subscription.unsubscribe();
  }, [navigate, search.redirect]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/central",
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Conta criada. Verifique seu email para confirmar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      const res = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/central",
      });
      if ("error" in res && res.error) throw res.error;
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden border-r border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20" />
        <div className="absolute inset-0 aurora opacity-60" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Zap className="size-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-display font-semibold tracking-tight">Delivery OS</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Ops · realtime</div>
            </div>
          </div>
          <div className="max-w-md space-y-4">
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Torre de controle</div>
            <h1 className="text-4xl font-display font-semibold leading-tight">
              O <span className="text-gradient">cérebro operacional</span> da sua operação de delivery.
            </h1>
            <p className="text-sm text-muted-foreground">
              Despacho automático, mapa realtime, SLA por pedido, IA logística e visão 360° da sua rede de lojas.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-4">
              <span className="size-1.5 rounded-full bg-success pulse-dot" />
              Sistema online · 99.99% uptime
            </div>
          </div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
            v0.1 · enterprise edition
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden flex items-center gap-2 justify-center mb-2">
            <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Zap className="size-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold">Delivery OS</span>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {mode === "login" ? "Entrar" : "Criar conta"}
            </div>
            <h2 className="text-2xl font-display font-semibold mt-1">
              {mode === "login" ? "Bem-vindo de volta" : "Comece em segundos"}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {mode === "login" ? "Acesse sua central operacional." : "Crie sua conta e configure sua operação."}
            </p>
          </div>

          <button
            onClick={google}
            disabled={busy}
            className="w-full h-11 rounded-lg border border-border hover:border-border-strong bg-surface/60 flex items-center justify-center gap-3 text-sm font-medium transition disabled:opacity-50"
          >
            <svg className="size-4" viewBox="0 0 24 24"><path fill="#fff" d="M21.35 11.1H12v3.2h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.66-5.85-5.95s2.63-5.95 5.85-5.95c1.83 0 3.06.78 3.76 1.45l2.56-2.46C16.78 3.99 14.6 3 12 3 6.99 3 3 6.99 3 12s3.99 9 9 9c5.2 0 8.64-3.65 8.64-8.78 0-.59-.07-1.04-.15-1.12z"/></svg>
            Continuar com Google
          </button>

          <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            <div className="flex-1 h-px bg-border" /> ou <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome completo"
                className="w-full h-11 rounded-lg bg-surface/60 border border-border px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition"
              />
            )}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@empresa.com"
              className="w-full h-11 rounded-lg bg-surface/60 border border-border px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
              className="w-full h-11 rounded-lg bg-surface/60 border border-border px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full h-11 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium text-sm hover:opacity-95 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <div className="text-center text-xs text-muted-foreground">
            {mode === "login" ? (
              <>
                Não tem conta?{" "}
                <button onClick={() => setMode("signup")} className="text-primary-glow hover:underline">
                  Criar agora
                </button>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <button onClick={() => setMode("login")} className="text-primary-glow hover:underline">
                  Entrar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}