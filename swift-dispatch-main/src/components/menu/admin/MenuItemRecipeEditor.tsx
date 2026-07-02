import { useCallback, useEffect, useMemo, useState } from "react";
import { ChefHat, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  getRecipeForMenuItemFn,
  listIngredientsFn,
  saveRecipeFn,
  type IngredientDto,
} from "@/functions/recipes";
import { fmtBRL } from "@/lib/format/currency";

type RecipeLine = {
  ingredientId: string;
  quantity: string;
};

type Props = {
  tenantId: string;
  menuItemId: string;
  menuItemName?: string;
  compact?: boolean;
  onSaved?: () => void;
};

const EMPTY_LINE: RecipeLine = { ingredientId: "", quantity: "" };

export function MenuItemRecipeEditor({
  tenantId,
  menuItemId,
  menuItemName,
  compact,
  onSaved,
}: Props) {
  const [ingredients, setIngredients] = useState<IngredientDto[]>([]);
  const [lines, setLines] = useState<RecipeLine[]>([EMPTY_LINE]);
  const [yieldQty, setYieldQty] = useState("1");
  const [unitCost, setUnitCost] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ings, recipe] = await Promise.all([
        listIngredientsFn({ data: { tenantId } }),
        getRecipeForMenuItemFn({ data: { tenantId, menuItemId } }),
      ]);
      setIngredients(ings);
      if (recipe) {
        setYieldQty(String(recipe.yield));
        setUnitCost(recipe.unit_cost);
        setLines(
          recipe.items.length > 0
            ? recipe.items.map((item) => ({
                ingredientId: item.ingredient_id,
                quantity: String(item.quantity),
              }))
            : [EMPTY_LINE],
        );
      } else {
        setYieldQty("1");
        setUnitCost(null);
        setLines([EMPTY_LINE]);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar ficha técnica");
    } finally {
      setLoading(false);
    }
  }, [tenantId, menuItemId]);

  useEffect(() => {
    void load();
  }, [load]);

  const ingredientMap = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);

  const previewCost = useMemo(() => {
    const yieldNum = Math.max(1, Number(yieldQty) || 1);
    let total = 0;
    for (const line of lines) {
      const qty = Number(line.quantity.replace(",", "."));
      if (!line.ingredientId || Number.isNaN(qty) || qty <= 0) continue;
      const ing = ingredientMap.get(line.ingredientId);
      if (ing?.unit_cost != null) total += ing.unit_cost * qty;
    }
    return total > 0 ? Number((total / yieldNum).toFixed(2)) : null;
  }, [lines, ingredientMap, yieldQty]);

  const addLine = () => setLines((prev) => [...prev, { ...EMPTY_LINE }]);

  const updateLine = (index: number, patch: Partial<RecipeLine>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const removeLine = (index: number) => {
    setLines((prev) =>
      prev.length <= 1 ? [{ ...EMPTY_LINE }] : prev.filter((_, i) => i !== index),
    );
  };

  const save = async () => {
    const parsed = lines
      .map((line) => ({
        ingredientId: line.ingredientId,
        quantity: Number(line.quantity.replace(",", ".")),
      }))
      .filter((line) => line.ingredientId && !Number.isNaN(line.quantity) && line.quantity > 0);

    const seen = new Set<string>();
    for (const line of parsed) {
      if (seen.has(line.ingredientId)) {
        toast.error("Remova insumos duplicados na receita");
        return;
      }
      seen.add(line.ingredientId);
    }

    setSaving(true);
    try {
      const saved = await saveRecipeFn({
        data: {
          tenantId,
          menuItemId,
          yield: Math.max(1, Number(yieldQty) || 1),
          items: parsed,
        },
      });
      setUnitCost(saved.unit_cost);
      toast.success("Ficha técnica salva");
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar ficha técnica");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
        <Loader2 className="size-4 animate-spin" />
        Carregando ficha técnica…
      </div>
    );
  }

  if (ingredients.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Cadastre insumos em Financeiro → CMV antes de montar a ficha técnica.
      </p>
    );
  }

  const displayCost = previewCost ?? unitCost;

  return (
    <div
      className={
        compact ? "space-y-3" : "space-y-4 rounded-xl border border-border bg-surface/20 p-4"
      }
    >
      {!compact ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <ChefHat className="size-4 text-primary" />
            Ficha técnica
            {menuItemName ? (
              <span className="text-muted-foreground font-normal">· {menuItemName}</span>
            ) : null}
          </p>
          {displayCost != null ? (
            <span className="text-xs font-medium tabular-nums text-primary">
              CMV: {fmtBRL(displayCost)}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[5rem]">
          <label className="text-[10px] font-medium text-muted-foreground">Rendimento</label>
          <input
            type="text"
            inputMode="numeric"
            value={yieldQty}
            onChange={(e) => setYieldQty(e.target.value)}
            className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
          />
        </div>
        <p className="text-[10px] text-muted-foreground pb-2">
          porções por receita (divide o custo total)
        </p>
      </div>

      <div className="space-y-2">
        {lines.map((line, index) => (
          <div key={index} className="flex items-center gap-2">
            <select
              value={line.ingredientId}
              onChange={(e) => updateLine(index, { ingredientId: e.target.value })}
              className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm min-w-0"
            >
              <option value="">Selecione o insumo</option>
              {ingredients.map((ing) => (
                <option key={ing.id} value={ing.id}>
                  {ing.name} ({ing.unit}
                  {ing.unit_cost != null ? ` · ${fmtBRL(ing.unit_cost)}` : ""})
                </option>
              ))}
            </select>
            <input
              type="text"
              inputMode="decimal"
              value={line.quantity}
              onChange={(e) => updateLine(index, { quantity: e.target.value })}
              placeholder="Qtd"
              className="w-20 h-9 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <button
              type="button"
              onClick={() => removeLine(index)}
              className="ops-icon-btn size-8 text-muted-foreground hover:text-danger shrink-0"
              aria-label="Remover linha"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={addLine}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <Plus className="size-3.5" />
          Adicionar insumo
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="ml-auto erp-btn-primary text-xs h-8 px-3"
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : "Salvar ficha"}
        </button>
      </div>

      {compact && displayCost != null ? (
        <p className="text-[10px] text-muted-foreground">
          CMV calculado: <span className="font-medium text-foreground">{fmtBRL(displayCost)}</span>
        </p>
      ) : null}
    </div>
  );
}
