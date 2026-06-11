import { Plus, Trash2 } from "lucide-react";
import type { AddonFormRow, VariationFormRow } from "@/lib/menu/product-options";

export type { AddonFormRow, VariationFormRow } from "@/lib/menu/product-options";
export { parseAddonForms, parseVariationForms } from "@/lib/menu/product-options";

const emptyVariation = (): VariationFormRow => ({ name: "", price: "" });
const emptyAddon = (): AddonFormRow => ({
  name: "",
  price: "",
  groupName: "Adicionais",
  required: false,
  maxQuantity: "1",
  isSuggested: false,
});

type Props = {
  variations: VariationFormRow[];
  addons: AddonFormRow[];
  onVariationsChange: (rows: VariationFormRow[]) => void;
  onAddonsChange: (rows: AddonFormRow[]) => void;
};

export function MenuProductOptionsEditor({
  variations,
  addons,
  onVariationsChange,
  onAddonsChange,
}: Props) {
  return (
    <div className="space-y-5 sm:col-span-2">
      <section className="space-y-3 rounded-xl border border-border/50 bg-muted/15 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-foreground">Tamanhos / variações</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Opcional. O cliente escolhe uma opção (ex.: Simples, Duplo).
            </p>
          </div>
          <button
            type="button"
            onClick={() => onVariationsChange([...variations, emptyVariation()])}
            className="erp-btn-secondary text-xs py-1.5 px-2.5"
          >
            <Plus className="size-3.5" />
            Variação
          </button>
        </div>
        {variations.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma variação — usa só o preço base.</p>
        ) : (
          <ul className="space-y-2">
            {variations.map((row, index) => (
              <li key={index} className="grid grid-cols-[1fr_6rem_auto] gap-2 items-center">
                <input
                  value={row.name}
                  onChange={(e) => {
                    const next = [...variations];
                    next[index] = { ...row, name: e.target.value };
                    onVariationsChange(next);
                  }}
                  placeholder="Nome (ex.: Duplo)"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <input
                  value={row.price}
                  onChange={(e) => {
                    const next = [...variations];
                    next[index] = { ...row, price: e.target.value };
                    onVariationsChange(next);
                  }}
                  placeholder="Preço"
                  inputMode="decimal"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm tabular-nums"
                />
                <button
                  type="button"
                  onClick={() => onVariationsChange(variations.filter((_, i) => i !== index))}
                  className="size-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-danger/10 hover:text-danger"
                  aria-label="Remover variação"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-border/50 bg-muted/15 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-foreground">Adicionais</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Extras com preço (bacon, queijo, molho…).
            </p>
          </div>
          <button
            type="button"
            onClick={() => onAddonsChange([...addons, emptyAddon()])}
            className="erp-btn-secondary text-xs py-1.5 px-2.5"
          >
            <Plus className="size-3.5" />
            Adicional
          </button>
        </div>
        {addons.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum adicional configurado.</p>
        ) : (
          <ul className="space-y-3">
            {addons.map((row, index) => (
              <li
                key={index}
                className="rounded-lg border border-border/40 bg-background/60 p-3 space-y-2"
              >
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_6rem_auto] gap-2 items-center">
                  <input
                    value={row.name}
                    onChange={(e) => {
                      const next = [...addons];
                      next[index] = { ...row, name: e.target.value };
                      onAddonsChange(next);
                    }}
                    placeholder="Nome do adicional"
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <input
                    value={row.price}
                    onChange={(e) => {
                      const next = [...addons];
                      next[index] = { ...row, price: e.target.value };
                      onAddonsChange(next);
                    }}
                    placeholder="Preço"
                    inputMode="decimal"
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => onAddonsChange(addons.filter((_, i) => i !== index))}
                    className="size-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-danger/10 hover:text-danger"
                    aria-label="Remover adicional"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5 text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={row.isSuggested}
                      onChange={(e) => {
                        const next = [...addons];
                        next[index] = { ...row, isSuggested: e.target.checked };
                        onAddonsChange(next);
                      }}
                      className="size-3.5 rounded accent-primary"
                    />
                    Sugerir no pedido
                  </label>
                  <label className="flex items-center gap-1.5 text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={row.required}
                      onChange={(e) => {
                        const next = [...addons];
                        next[index] = { ...row, required: e.target.checked };
                        onAddonsChange(next);
                      }}
                      className="size-3.5 rounded accent-primary"
                    />
                    Obrigatório
                  </label>
                  <label className="flex items-center gap-1.5 text-muted-foreground">
                    Máx.
                    <input
                      type="text"
                      inputMode="numeric"
                      value={row.maxQuantity}
                      onChange={(e) => {
                        const next = [...addons];
                        next[index] = { ...row, maxQuantity: e.target.value };
                        onAddonsChange(next);
                      }}
                      className="w-12 rounded border border-border bg-background px-2 py-0.5 text-center tabular-nums"
                    />
                  </label>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
