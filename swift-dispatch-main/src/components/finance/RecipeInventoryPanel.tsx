import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChefHat, Circle, Loader2, Plus, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

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

function marginPct(price: number, cost: number | null): number | null {
  if (cost == null || cost <= 0 || price <= 0) return null;
  return Number((((price - cost) / price) * 100).toFixed(1));
}

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

  const withRecipe = useMemo(() => overview.filter((i) => i.has_recipe).length, [overview]);
  const coveragePct =
    overview.length > 0 ? Math.round((withRecipe / overview.length) * 100) : 0;

  const steps = useMemo(
    () => [
      {
        done: ingredients.length > 0,
        label: "Cadastrar o 1º insumo",
        hint: "Ex.: farinha, queijo, óleo",
      },
      {
        done: withRecipe > 0,
        label: "Montar a 1ª ficha técnica",
        hint: "Escolha um produto abaixo e salve a receita",
      },
      {
        done: withRecipe >= Math.min(5, overview.length || 5) && withRecipe > 0,
        label: "Cobrir os itens mais vendidos",
        hint: `${withRecipe} de ${overview.length} produtos com ficha`,
      },
    ],
    [ingredients.length, withRecipe, overview.length],
  );

  const addIngredient = async () => {
    if (!tenantId || !form.name.trim()) return;
    setBusy(true);
    try {
      await upsertIngredientFn({
        data: {
          tenantId,
          name: form.name.trim(),
          unit: form.unit.trim() || "un",
          unitCost: form.unitCost ? Number(form.unitCost.replace(",", ".")) : null,
          stockQuantity: form.stockQuantity
            ? Number(form.stockQuantity.replace(",", "."))
            : null,
          stockMin: Number(form.stockMin.replace(",", ".") || 0),
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

  const selected = overview.find((i) => i.menu_item_id === selectedMenuItemId);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-primary/20 bg-primary/[0.05] px-4 py-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground">Comece pelo CMV real</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Três passos: insumos → ficha do prato → margem no Resumo financeiro.
            </p>
          </div>
          <span className="text-xs font-medium tabular-nums text-primary">
            {coveragePct}% do cardápio com ficha
          </span>
        </div>
        <ul className="space-y-2">
          {steps.map((step) => (
            <li key={step.label} className="flex items-start gap-2 text-sm">
              {step.done ? (
                <CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" />
              ) : (
                <Circle className="size-4 text-muted-foreground/50 shrink-0 mt-0.5" />
              )}
              <div>
                <p className={cn("font-medium", step.done && "text-muted-foreground")}>
                  {step.label}
                </p>
                <p className="text-[11px] text-muted-foreground">{step.hint}</p>
              </div>
            </li>
          ))}
        </ul>
        {withRecipe > 0 ? (
          <p className="text-[11px] text-muted-foreground">
            Ao marcar pedidos como entregues, o CMV entra no{" "}
            <Link
              to="/financeiro"
              search={{ secao: "financeiro", aba: "resumo" }}
              className="text-primary font-medium hover:underline"
            >
              Resumo
            </Link>{" "}
            e no DRE automaticamente.
          </p>
        ) : null}
      </div>

      <AppCard>
        <AppCardHeader className="border-b border-border/40">
          <AppCardTitle className="flex items-center gap-2">
            <ChefHat className="size-4" />
            Insumos
          </AppCardTitle>
        </AppCardHeader>
        <div className="p-4 space-y-4">
          <div className="grid sm:grid-cols-6 gap-2">
            <input
              placeholder="Nome (ex.: Farinha)"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="sm:col-span-2 h-9 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              placeholder="Unidade (kg, L, un)"
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              placeholder="Custo R$"
              value={form.unitCost}
              onChange={(e) => setForm((f) => ({ ...f, unitCost: e.target.value }))}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              placeholder="Estoque"
              value={form.stockQuantity}
              onChange={(e) => setForm((f) => ({ ...f, stockQuantity: e.target.value }))}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
              title="Deixe vazio para não controlar estoque deste insumo"
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
          <div className="flex flex-wrap gap-2 items-center">
            <label className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              Mínimo de estoque
              <input
                placeholder="0"
                value={form.stockMin}
                onChange={(e) => setForm((f) => ({ ...f, stockMin: e.target.value }))}
                className="h-8 w-16 rounded-lg border border-border bg-background px-2 text-sm"
              />
            </label>
            <p className="text-[11px] text-muted-foreground">
              Estoque vazio = não baixa automaticamente na venda.
            </p>
          </div>

          {ingredients.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-6 text-center space-y-1">
              <p className="text-sm font-medium text-foreground">Nenhum insumo ainda</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Comece pelos básicos da cozinha: farinha, queijo, óleo, emballage. Depois monte a
                ficha de cada prato.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/40 text-sm">
              {ingredients.map((ing) => {
                const low =
                  ing.stock_quantity != null &&
                  ing.stock_quantity <= (ing.stock_min ?? 0);
                return (
                  <li key={ing.id} className="flex items-center justify-between gap-2 py-2">
                    <div>
                      <span className="font-medium">{ing.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {ing.unit}
                        {ing.unit_cost != null ? ` · ${fmtBRL(ing.unit_cost)}` : ""}
                        {ing.stock_quantity != null
                          ? ` · estoque: ${ing.stock_quantity}`
                          : ""}
                        {low ? " · baixo" : ""}
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
                );
              })}
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
            <p className="text-sm text-muted-foreground">
              Nenhum produto no cardápio.{" "}
              <Link to="/cardapio" className="text-primary font-medium hover:underline">
                Cadastre itens
              </Link>{" "}
              para montar fichas técnicas.
            </p>
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
                  {overview.map((item) => {
                    const m = marginPct(item.price, item.unit_cost);
                    return (
                      <option key={item.menu_item_id} value={item.menu_item_id}>
                        {item.menu_item_name}
                        {item.has_recipe ? " · com receita" : " · sem ficha"}
                        {item.unit_cost != null ? ` · CMV ${fmtBRL(item.unit_cost)}` : ""}
                        {m != null ? ` · margem ${m}%` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedMenuItemId && selected ? (
                <MenuItemRecipeEditor
                  tenantId={tenantId}
                  menuItemId={selectedMenuItemId}
                  menuItemName={selected.menu_item_name}
                  sellPrice={selected.price}
                  onSaved={() => void load()}
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Selecione um produto para cadastrar ingredientes e ver o custo e a margem do
                  prato.
                </p>
              )}
            </>
          )}
        </div>
      </AppCard>
    </div>
  );
}
