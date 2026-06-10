import { Link } from "@tanstack/react-router";
import {
  ChefHat,
  Bike,
  BarChart3,
  MessageCircle,
  UtensilsCrossed,
  ArrowRight,
  Zap,
  Kanban,
  Check,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";

const FEATURES = [
  {
    icon: UtensilsCrossed,
    title: "Cardápio digital",
    desc: "Checkout com PIX, cupons, order bump e rastreio ao vivo.",
  },
  {
    icon: Kanban,
    title: "Central + Kanban",
    desc: "Dispatch, mapa tático e fluxo visual de pedidos.",
  },
  {
    icon: ChefHat,
    title: "Cozinha KDS",
    desc: "Timer MM:SS, prioridades e alertas de atraso.",
  },
  {
    icon: Bike,
    title: "App entregador",
    desc: "GPS, rotas e gestão de entregas no celular.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp",
    desc: "Notificações automáticas em cada etapa.",
  },
  {
    icon: Zap,
    title: "iFood + pagamentos",
    desc: "Webhooks, OAuth e Mercado Pago integrados.",
  },
] as const;

const HIGHLIGHTS = [
  "Tempo real com SSE",
  "Multi-perfil (ADM, cozinha, entregador)",
  "Rastreio público com mapa",
] as const;

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <BrandLogo size="sm" tagline="Plataforma de delivery" />
          <div className="flex items-center gap-2">
            <Link
              to="/minha-operacao"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground sm:inline-flex"
            >
              Cardápio demo
            </Link>
            <Link to="/login" className="erp-btn-primary py-2 px-4 text-sm">
              Entrar
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="aurora border-b border-border/50">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-semibold text-primary">
                ERP para delivery
              </p>
              <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3rem]">
                Do pedido à entrega,{" "}
                <span className="text-primary">sem planilha</span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
                Cardápio, central operacional, cozinha, entregadores e integrações — uma plataforma
                completa para quem leva delivery a sério.
              </p>

              <ul className="mt-6 space-y-2">
                {HIGHLIGHTS.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="size-4 text-primary shrink-0" strokeWidth={2.5} />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/login" className="erp-btn-primary gap-2 px-5 py-3 text-sm sm:text-base">
                  Começar agora
                  <ArrowRight className="size-4" />
                </Link>
                <Link to="/minha-operacao" className="erp-btn-secondary px-5 py-3 text-sm sm:text-base">
                  Ver cardápio demo
                </Link>
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shadow-lift)]">
                <div className="mb-4 flex items-center gap-2">
                  <div className="size-2.5 rounded-full bg-danger/70" />
                  <div className="size-2.5 rounded-full bg-warning/70" />
                  <div className="size-2.5 rounded-full bg-success/70" />
                  <span className="ml-2 text-[10px] font-medium text-muted-foreground">
                    central · ao vivo
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {["Vendas", "Pedidos", "SLA"].map((label, i) => (
                    <div key={label} className="rounded-xl border border-border/50 bg-muted/40 p-3">
                      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
                      <p className="mt-1 font-display text-xl font-bold text-foreground tabular-nums">
                        {i === 0 ? "R$ 4,2k" : i === 1 ? "38" : "94%"}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 h-28 rounded-xl border border-border/50 bg-gradient-to-t from-primary/8 to-transparent" />
                <div className="mt-3 flex gap-3">
                  <div className="h-14 flex-1 rounded-lg bg-primary/10 border border-primary/20" />
                  <div className="h-14 flex-1 rounded-lg bg-muted/50 border border-border/50" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Tudo que sua operação precisa
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Módulos integrados para restaurante, dark kitchen e operação multi-unidade.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <article
                  key={f.title}
                  className="group rounded-2xl border border-border/50 bg-card p-5 shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-lift)]"
                >
                  <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" strokeWidth={2} />
                  </div>
                  <h3 className="font-display font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="border-t border-border/50 bg-muted/30 py-14">
          <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
            <h2 className="font-display text-2xl font-bold tracking-tight">Pronto para testar?</h2>
            <p className="mx-auto mt-2 text-sm text-muted-foreground">
              Demo: operador@deliveryos.com.br / demo1234
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/login" className="erp-btn-primary gap-2 px-5 py-3">
                Acessar painel
                <ArrowRight className="size-4" />
              </Link>
              <Link to="/minha-operacao" className="erp-btn-secondary px-5 py-3">
                Burger House · cardápio
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 py-6 text-center text-xs text-muted-foreground">
        Delivery OS · Operações de delivery
      </footer>
    </div>
  );
}
