import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";
import { seedDemoOrdersFn } from "@/functions/seed-demo";
import { USE_POSTGRES } from "@/lib/repositories";

export function Onboarding() {
  const { createTenant, refresh } = useTenant();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (withSampleData: boolean) => {
    if (!name.trim()) return toast.error("Dê um nome à operação");
    setBusy(true);
    try {
      const id = await createTenant(name.trim());
      if (withSampleData && USE_POSTGRES) {
        const count = await seedDemoOrdersFn({ data: { tenantId: id } });
        toast.success(`Operação criada com ${count} pedidos de exemplo`);
      } else {
        toast.success("Operação criada");
      }
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full glass-strong rounded-2xl p-8 space-y-5 border border-border">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          <Sparkles className="size-3 text-primary-glow" /> Primeira vez
        </div>
        <div>
          <h2 className="text-2xl font-display font-semibold">Crie sua operação</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Você será o owner. Cadastre lojas, entregadores e pedidos pela Central ou integrações.
          </p>
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Pizzaria do Marco · Rede 7 unidades"
          className="w-full h-11 rounded-lg bg-surface/60 border border-border px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition"
        />
        <button
          type="button"
          onClick={() => submit(false)}
          disabled={busy}
          className="w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {busy && <Loader2 className="size-4 animate-spin" />} Criar operação
        </button>
        {USE_POSTGRES ? (
          <button
            type="button"
            onClick={() => submit(true)}
            disabled={busy}
            className="w-full text-xs text-muted-foreground hover:text-primary transition disabled:opacity-50"
          >
            Ou carregar pedidos de exemplo para testar o painel
          </button>
        ) : null}
      </div>
    </div>
  );
}
