/** Classes compartilhadas do shell operacional (respeitam tema claro/escuro). */
export const opsShell = "min-h-screen flex bg-background";
export const opsMain =
  "flex-1 p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 overflow-y-auto overflow-x-hidden bg-background min-w-0";
export const opsPanel = "bg-card border border-border rounded-2xl shadow-sm min-w-0";
export const opsPanelPad = `${opsPanel} p-3 sm:p-4 md:p-5`;
export const opsMutedBox = "bg-muted/60 border border-border rounded-xl min-w-0";
/** Páginas com painel lateral (mapa, automações, auditoria): empilha no mobile. */
export const opsSplitPage =
  "ops-split-page !space-y-0 gap-4 lg:gap-6";
