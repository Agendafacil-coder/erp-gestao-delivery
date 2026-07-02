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
      {current ? <ProductionReadinessPanel tenantId={current.id} /> : null}

      <section className="erp-card p-5 space-y-4">
        <div className="flex items-center gap-2 font-medium">
          <Printer className="size-4 text-primary" />
          Impressão térmica (80mm)
        </div>
        <p className="text-sm text-muted-foreground">
          Comanda de cozinha ou etiqueta de entrega. Configure impressora 80mm no Windows ou use
          &quot;Salvar como PDF&quot; na janela de impressão.
          {!thermalEnabled ? (
            <span className="block mt-1 text-warning">
              Modo térmico desativado — ative &quot;Impressora térmica na cozinha&quot; em Funcionalidades extras abaixo.
            </span>
          ) : null}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Formato padrão</label>
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
            <label className="text-xs font-medium text-muted-foreground">Cópias padrão</label>
            <select
              value={printCopies}
              onChange={(e) => setPrintCopies(Number(e.target.value))}
              className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
            >
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {n}× por pedido
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Modo de impressão</label>
          <select
            value={printMode}
            onChange={(e) => setPrintMode(e.target.value as PrintMode)}
            className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="browser">Navegador (padrão)</option>
            <option value="thermal" disabled={!thermalAvailable}>
              Impressora térmica direta
              {!thermalEnabled
                ? " (desativado)"
                : !isThermalPrintSupported()
                  ? " (Chrome ou Edge)"
                  : ""}
            </option>
          </select>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/15 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Imprimir comanda automaticamente na cozinha</p>
            <p className="text-xs text-muted-foreground">
              Ao chegar pedido novo, imprime comanda sem abrir o diálogo.
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
    </div>
  );
}
