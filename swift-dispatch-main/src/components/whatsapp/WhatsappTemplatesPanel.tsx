import { useMemo, useState } from "react";
import { Bike, RotateCcw, Save, ShieldAlert, User } from "lucide-react";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/design/AppCard";
import { LoadingState } from "@/components/ops/StateViews";
import { cn } from "@/lib/utils";
import {
  WHATSAPP_TEMPLATE_KEYS,
  WHATSAPP_TEMPLATE_META,
  type WhatsappTemplateKey,
} from "@/lib/whatsapp/templates";
import type { WhatsappHubState } from "./types";
import { previewTemplateText, TEMPLATE_PREVIEW_VARS } from "./types";

type Props = Pick<
  WhatsappHubState,
  "templates" | "setTemplates" | "templatesLoading" | "templatesSaving" | "saveTemplates" | "resetTemplates"
>;

const AUDIENCE_ORDER = ["cliente", "entregador", "gerente"] as const;

const AUDIENCE_META = {
  cliente: { label: "Cliente", icon: User, tone: "text-primary bg-primary/10 border-primary/25" },
  entregador: { label: "Entregador", icon: Bike, tone: "text-accent bg-accent/10 border-accent/25" },
  gerente: { label: "Gerente", icon: ShieldAlert, tone: "text-danger bg-danger/10 border-danger/25" },
} as const;

const VARIABLES = Object.keys(TEMPLATE_PREVIEW_VARS);

export function WhatsappTemplatesPanel({
  templates,
  setTemplates,
  templatesLoading,
  templatesSaving,
  saveTemplates,
  resetTemplates,
}: Props) {
  const [selectedKey, setSelectedKey] = useState<WhatsappTemplateKey>("order_received");

  const grouped = useMemo(() => {
    const map: Record<string, WhatsappTemplateKey[]> = { cliente: [], entregador: [], gerente: [] };
    for (const key of WHATSAPP_TEMPLATE_KEYS) {
      const audience = WHATSAPP_TEMPLATE_META[key].audience;
      if (audience === "gerente") map.gerente.push(key);
      else map[audience].push(key);
    }
    return map;
  }, []);

  const selectedMeta = WHATSAPP_TEMPLATE_META[selectedKey];
  const preview = previewTemplateText(templates[selectedKey]);

  const insertVariable = (variable: string) => {
    const token = `{{${variable}}}`;
    setTemplates((prev) => ({
      ...prev,
      [selectedKey]: `${prev[selectedKey]}${prev[selectedKey].endsWith(" ") || !prev[selectedKey] ? "" : " "}${token}`,
    }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[min(100%,22rem)_1fr] gap-4 lg:gap-5">
      <AppCard className="overflow-hidden">
        <AppCardHeader>
          <AppCardTitle className="text-sm">Mensagens por evento</AppCardTitle>
          <p className="text-xs text-muted-foreground">Selecione um gatilho para editar o texto.</p>
        </AppCardHeader>
        <AppCardContent className="space-y-5 max-h-[min(70vh,640px)] overflow-y-auto">
          {templatesLoading ? (
            <LoadingState label="Carregando templates…" size="sm" className="border-0 bg-transparent" />
          ) : (
            AUDIENCE_ORDER.map((audience) => {
              const keys = grouped[audience];
              if (!keys.length) return null;
              const meta = AUDIENCE_META[audience];
              const Icon = meta.icon;
              return (
                <section key={audience} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full border",
                        meta.tone,
                      )}
                    >
                      <Icon className="size-3" />
                      {meta.label}
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {keys.map((key) => (
                      <li key={key}>
                        <button
                          type="button"
                          onClick={() => setSelectedKey(key)}
                          className={cn(
                            "w-full text-left rounded-xl border px-3.5 py-2.5 transition text-sm",
                            selectedKey === key
                              ? "border-primary/40 bg-primary/8 ring-1 ring-primary/20"
                              : "border-border/50 hover:bg-muted/30",
                          )}
                        >
                          <span className="font-medium text-foreground">
                            {WHATSAPP_TEMPLATE_META[key].label}
                          </span>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                            {templates[key]}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })
          )}
        </AppCardContent>
      </AppCard>

      <div className="space-y-4">
        <AppCard>
          <AppCardHeader className="gap-3">
            <div className="min-w-0">
              <AppCardTitle className="text-base">{selectedMeta.label}</AppCardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Destinatário: {selectedMeta.audience === "gerente" ? "gerente" : selectedMeta.audience}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void resetTemplates()}
                disabled={templatesSaving || templatesLoading}
                className="erp-btn-secondary text-xs"
              >
                <RotateCcw className="size-3.5" />
                Restaurar
              </button>
              <button
                type="button"
                onClick={() => void saveTemplates()}
                disabled={templatesSaving || templatesLoading}
                className="erp-btn-primary text-xs"
              >
                <Save className="size-3.5" />
                {templatesSaving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </AppCardHeader>

          <AppCardContent className="space-y-4">
            <textarea
              value={templates[selectedKey]}
              onChange={(e) => setTemplates((prev) => ({ ...prev, [selectedKey]: e.target.value }))}
              disabled={templatesLoading}
              rows={6}
              className="w-full rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-foreground leading-relaxed resize-y min-h-[140px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-primary/40 disabled:opacity-60"
              placeholder="Texto da mensagem automática…"
            />

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Variáveis disponíveis
              </p>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="text-[11px] font-mono px-2 py-1 rounded-lg border border-border/60 bg-card hover:bg-muted/40 transition"
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </div>
          </AppCardContent>
        </AppCard>

        <AppCard className="overflow-hidden">
          <AppCardHeader>
            <AppCardTitle className="text-sm">Prévia no WhatsApp</AppCardTitle>
            <p className="text-xs text-muted-foreground">Como o destinatário verá a mensagem.</p>
          </AppCardHeader>
          <AppCardContent>
            <div className="rounded-2xl border border-border/50 bg-[#0b141a] p-4 min-h-[220px] relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-12 bg-[#1f2c34] border-b border-white/5 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                    DO
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white/90">Delivery OS</p>
                    <p className="text-[10px] text-emerald-400">online</p>
                  </div>
                </div>
              </div>

              <div className="pt-14 space-y-2">
                <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-[#1f2c34] px-3.5 py-2.5 text-sm text-white/90 leading-relaxed whitespace-pre-wrap shadow-md">
                  {preview}
                </div>
                <p className="text-[10px] text-white/40 pl-1 tabular-nums">
                  {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          </AppCardContent>
        </AppCard>
      </div>
    </div>
  );
}
