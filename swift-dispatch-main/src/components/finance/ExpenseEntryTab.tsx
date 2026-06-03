import { useState } from "react";
import type { FinancialCostSetting, FinancialExpense } from "@/lib/finance/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL } from "@/lib/finance/calculations";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { todayIsoDate } from "./FinancialDateFilter";

type Props = {
  expenses: FinancialExpense[];
  costSettings: FinancialCostSetting[];
  onAddExpense: (input: {
    description: string;
    amount: number;
    category?: "manual" | "fixed" | "variable";
    expense_date?: string;
    notes?: string;
  }) => Promise<void>;
  onRemoveExpense: (id: string) => Promise<void>;
  onSaveCost: (input: {
    id?: string;
    name: string;
    amount: number;
    cost_type: "fixed" | "variable";
  }) => Promise<void>;
  onRemoveCost: (id: string) => Promise<void>;
};

export function ExpenseEntryTab({
  expenses,
  costSettings,
  onAddExpense,
  onRemoveExpense,
  onSaveCost,
  onRemoveCost,
}: Props) {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIsoDate());
  const [notes, setNotes] = useState("");
  const [costName, setCostName] = useState("");
  const [costAmount, setCostAmount] = useState("");
  const [costType, setCostType] = useState<"fixed" | "variable">("fixed");

  const handleAddExpense = async () => {
    const n = Number(amount.replace(",", "."));
    if (!desc.trim() || !n || n <= 0) {
      toast.error("Informe descrição e valor válidos.");
      return;
    }
    await onAddExpense({
      description: desc.trim(),
      amount: n,
      category: "manual",
      expense_date: new Date(date).toISOString(),
      notes: notes.trim() || undefined,
    });
    setDesc("");
    setAmount("");
    setNotes("");
    toast.success("Despesa registrada.");
  };

  const handleAddCost = async () => {
    const n = Number(costAmount.replace(",", "."));
    if (!costName.trim() || !n || n <= 0) {
      toast.error("Informe nome e valor do custo.");
      return;
    }
    await onSaveCost({ name: costName.trim(), amount: n, cost_type: costType });
    setCostName("");
    setCostAmount("");
    toast.success("Custo cadastrado.");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold">Lançamento de despesas manuais</h3>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Descrição</Label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex: Gás, embalagens..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Valor (R$)</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <Button onClick={handleAddExpense} className="w-full gap-2">
            <Plus className="size-4" /> Registrar despesa
          </Button>
        </div>

        <div className="border-t border-border pt-4 space-y-2 max-h-[280px] overflow-y-auto">
          {expenses.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhuma despesa lançada.</p>
          )}
          {expenses.map((e) => (
            <div
              key={e.id}
              className="flex justify-between items-start gap-2 p-2.5 rounded-xl bg-surface/40 border border-border/50 text-xs"
            >
              <div>
                <div className="font-semibold">{e.description}</div>
                <div className="text-muted-foreground font-mono">
                  {new Date(e.expense_date).toLocaleDateString("pt-BR")} · {e.category}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-danger">{formatBRL(e.amount)}</span>
                <button
                  type="button"
                  onClick={() => onRemoveExpense(e.id)}
                  className="text-muted-foreground hover:text-danger cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold">Custos fixos e variáveis</h3>
        <p className="text-[11px] text-muted-foreground">
          Valores mensais rateados no relatório por período (aluguel, folha, energia, etc.).
        </p>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Nome</Label>
            <Input value={costName} onChange={(e) => setCostName(e.target.value)} placeholder="Ex: Aluguel" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Valor mensal (R$)</Label>
              <Input value={costAmount} onChange={(e) => setCostAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={costType} onValueChange={(v) => setCostType(v as "fixed" | "variable")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixo</SelectItem>
                  <SelectItem value="variable">Variável</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button variant="outline" onClick={handleAddCost} className="w-full gap-2">
            <Plus className="size-4" /> Adicionar custo
          </Button>
        </div>

        <div className="border-t border-border pt-4 space-y-2">
          {costSettings.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum custo cadastrado.</p>
          )}
          {costSettings.map((c) => (
            <div
              key={c.id}
              className="flex justify-between items-center p-2.5 rounded-xl bg-surface/40 border border-border/50 text-xs"
            >
              <div>
                <span className="font-semibold">{c.name}</span>
                <span className="ml-2 text-[10px] uppercase text-muted-foreground">{c.cost_type}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono">{formatBRL(c.amount)}/mês</span>
                <button
                  type="button"
                  onClick={() => onRemoveCost(c.id)}
                  className="text-muted-foreground hover:text-danger cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
