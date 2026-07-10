import { FeatureFlagsPanel } from "@/components/configs/FeatureFlagsPanel";
import { ProductionReadinessPanel } from "@/components/configs/ProductionReadinessPanel";
import { useStoreConfigs } from "@/hooks/useStoreConfigs";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { isThermalPrintSupported } from "@/lib/print/escpos";
import { PRINT_FORMAT_LABEL, type PrintFormat, type PrintMode } from "@/lib/ops/printSettings";
import { Printer } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export function OperationSettingsTab() {
  const {
    current,
    printFormat,
    setPrintFormat,
    printCopies,
    setPrintCopies,
    printMode,
    setPrintMode,
    autoPrintKds,
    setAutoPrintKds,
    handleSavePrintSettings,
  } = useStoreConfigs();

  const { enabled: featureEnabled } = useFeatureFlags(current?.id);
  const thermalEnabled = featureEnabled("thermal_print");
  const thermalAvailable = thermalEnabled && isThermalPrintSupported();

  return (
    <div className="space-y-8">
      <section className="erp-card p-5 space-y-4">
        <div className="flex items-center gap-2 font-medium">
          <Printer className="size-4 text-primary" />
          Impressão na cozinha
        </div>
        <p className="text-sm text-muted-foreground">
          Comanda ou etiqueta de entrega. Use impressora 80mm ou &quot;Salvar como PDF&quot; na janela
          de impressão. Vale só neste computador.
        </p>
        {!thermalEnabled ? (
          <p className="text-sm text-warning rounded-lg border border-warning/30 bg-warning/5 px-3 py-2">
            Para imprimir direto na térmica, ligue &quot;Impressora térmica na cozinha&quot; em Mais
            recursos (abaixo).
          </p>
        ) : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">O que imprimir</label>
            <select
              value={printFormat}
              onChange={(e) => setPrintFormat(e.target.value as PrintFormat)}
              className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="kitchen">{PRINT_FORMAT_LABEL.kitchen}</option>
              <option value="delivery">{PRINT_FORMAT_LABEL.delivery}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Cópias por pedido</label>
            <select
              value={printCopies}
              onChange={(e) => setPrintCopies(Number(e.target.value))}
              className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
            >
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {n}×
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Como imprimir</label>
          <select
            value={printMode}
            onChange={(e) => setPrintMode(e.target.value as PrintMode)}
            className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="browser">Pela janela do navegador</option>
            <option value="thermal" disabled={!thermalAvailable}>
              Direto na impressora térmica
              {!thermalEnabled
                ? " (desligado)"
                : !isThermalPrintSupported()
                  ? " (use Chrome ou Edge)"
                  : ""}
            </option>
          </select>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/15 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Imprimir pedidos novos sozinho</p>
            <p className="text-xs text-muted-foreground">
              Ligado: imprime na cozinha sem clicar. Desligado: só pelo botão de imprimir.
            </p>
          </div>
          <Switch
            checked={autoPrintKds}
            onCheckedChange={setAutoPrintKds}
            className="shrink-0 data-[state=unchecked]:bg-border/80"
          />
        </div>
        <button type="button" onClick={handleSavePrintSettings} className="erp-btn-primary">
          Salvar impressão
        </button>
      </section>

      {current ? <FeatureFlagsPanel tenantId={current.id} /> : null}

      {current ? <ProductionReadinessPanel tenantId={current.id} /> : null}
    </div>
  );
}
