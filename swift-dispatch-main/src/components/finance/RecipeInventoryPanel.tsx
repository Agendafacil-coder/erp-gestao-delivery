import { useCallback, useEffect, useState } from "react";
import { ChefHat, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteIngredientFn,
  listIngredientsFn,
  listRecipesOverviewFn,
  upsertIngredientFn,
  type IngredientDto,
} from "@/functions/recipes";
import { MenuItemRecipeEditor } from "@/components/menu/admin/MenuItemRecipeEditor";
import { AppCard, AppCardHeader, AppCardTitle } from "@/components/design/AppCard";
import { fmtBRL } from "@/lib/format/currency";

type Props = {
  tenantId: string | undefined;
};

type RecipeOverview = Awaited<ReturnType<typeof listRecipesOverviewFn>>[number];

const EMPTY_INGREDIENT = {
  name: "",
  unit: "un",
  unitCost: "",
  stockQuantity: "",
  stockMin: "0",
};

export function RecipeInventoryPanel({ tenantId }: Props) {
  const [ingredients, setIngredients] = useState<IngredientDto[]>([]);
  const [overview, setOverview] = useState<RecipeOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_INGREDIENT);
  const [busy, setBusy] = useState(false);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [ings, items] = await Promise.all([
        listIngredientsFn({ data: { tenantId } }),
        listRecipesOverviewFn({ data: { tenantId } }),
      ]);
      setIngredients(ings);
      setOverview(items);
      setSelectedMenuItemId((current) =>
        current && !items.some((i) => i.menu_item_id === current) ? null : current,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar ficha técnica");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addIngredient = async () => {
    if (!tenantId || !form.name.trim()) return;
    setBusy(true);
    try {
      await upsertIngredientFn({
        data: {
          tenantId,
          name: form.name.trim(),
          unit: form.unit.trim() || "un",
          unitCost: form.unitCost ? Number(form.unitCost) : null,
          stockQuantity: form.stockQuantity ? Number(form.stockQuantity) : null,
          stockMin: Number(form.stockMin || 0),
        },
      });
      setForm(EMPTY_INGREDIENT);
      await load();
      toast.success("Insumo salvo");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar insumo");
    } finally {
      setBusy(false);
    }
  };

  const removeIngredient = async (id: string) => {
    if (!tenantId) return;
    try {
      await deleteIngredientFn({ data: { tenantId, ingredientId: id } });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover");
    }
  };

  if (!tenantId) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
        <Loader2 className="size-4 animate-spin" />
        Carregando ficha técnica…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AppCard>
        <AppCardHeader className="border-b border-border/40">
          <AppCardTitle className="flex items-center gap-2">
            <ChefHat className="size-4" />
            Insumos
          </AppCardTitle>
        </AppCardHeader>
        <div className="p-4 space-y-4">
          <div className="grid sm:grid-cols-5 gap-2">
            <input
              placeholder="Nome do insumo"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="sm:col-span-2 h-9 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              placeholder="Unidade"
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              placeholder="Custo por unidade (R$)"
              value={form.unitCost}
              onChange={(e) => setForm((f) => ({ ...f, unitCost: e.target.value }))}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <button
              type="button"
              onClick={() => void addIngredient()}
              disabled={busy}
              className="erp-btn-primary text-sm h-9"
            >
              <Plus className="size-4" />
              Adicionar
            </button>
          </div>

          {ingredients.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum insumo cadastrado.</p>
          ) : (
            <ul className="divide-y divide-border/40 text-sm">
              {ingredients.map((ing) => (
                <li key={ing.id} className="flex items-center justify-between gap-2 py-2">
                  <div>
                    <span className="font-medium">{ing.name}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {ing.unit}
                      {ing.unit_cost != null ? ` · ${fmtBRL(ing.unit_cost)}` : ""}
                      {ing.stock_quantity != null ? ` · em estoque: ${ing.stock_quantity}` : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void removeIngredient(ing.id)}
                    className="ops-icon-btn size-8 text-danger"
                    aria-label="Remover"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </AppCard>

      <AppCard>
        <AppCardHeader className="border-b border-border/40">
          <AppCardTitle>Receitas do cardápio</AppCardTitle>
        </AppCardHeader>
        <div className="p-4 space-y-4">
          {overview.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum produto no cardápio.</p>
          ) : (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Produto</label>
                <select
                  value={selectedMenuItemId ?? ""}
                  onChange={(e) => setSelectedMenuItemId(e.target.value || null)}
                  className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
                >
                  <option value="">Selecione para editar a ficha técnica</option>
                  {overview.map((item) => (
                    <option key={item.menu_item_id} value={item.menu_item_id}>
                      {item.menu_item_name}
                      {item.has_recipe ? " · com receita" : ""}
                      {item.unit_cost != null ? ` · ${fmtBRL(item.unit_cost)}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {selectedMenuItemId ? (
                <MenuItemRecipeEditor
                  tenantId={tenantId}
                  menuItemId={selectedMenuItemId}
                  menuItemName={
                    overview.find((i) => i.menu_item_id === selectedMenuItemId)?.menu_item_name
                  }
                  onSaved={() => void load()}
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Selecione um produto para cadastrar ingredientes e calcular o custo real do prato.
                </p>
              )}
            </>
          )}
        </div>
      </AppCard>
    </div>
  );
}
