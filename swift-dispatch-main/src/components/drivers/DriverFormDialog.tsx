import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { createDriverFn } from "@/functions/drivers";
import { useTenant } from "@/hooks/useTenant";
import { useOps } from "@/hooks/useOps";
import type { LocalDriver } from "@/lib/db/localDb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const VEHICLES: { value: LocalDriver["vehicle"]; label: string }[] = [
  { value: "moto", label: "Moto" },
  { value: "bike", label: "Bicicleta" },
  { value: "carro", label: "Carro" },
  { value: "a_pe", label: "A pé" },
];

type DriverFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DriverFormDialog({ open, onOpenChange }: DriverFormDialogProps) {
  const { current } = useTenant();
  const { fetchData } = useOps();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [vehicle, setVehicle] = useState<LocalDriver["vehicle"]>("moto");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setName("");
    setPhone("");
    setEmail("");
    setVehicle("moto");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) return;

    setBusy(true);
    try {
      await createDriverFn({
        data: {
          tenantId: current.id,
          name,
          phone: phone || undefined,
          vehicle,
          email: email || undefined,
        },
      });
      toast.success(
        email.trim()
          ? "Entregador cadastrado e vinculado à conta."
          : "Entregador cadastrado. Informe o e-mail depois para liberar o app.",
      );
      await fetchData();
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5 text-primary" />
            Cadastrar entregador
          </DialogTitle>
          <DialogDescription>
            Cria o perfil na frota. Com e-mail, vincula a conta para o entregador usar o app em
            /entregador.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="driver-name" className="text-sm font-medium">
              Nome *
            </label>
            <input
              id="driver-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="João Silva"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="driver-phone" className="text-sm font-medium">
              Telefone
            </label>
            <input
              id="driver-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-0000"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="driver-vehicle" className="text-sm font-medium">
              Veículo
            </label>
            <select
              id="driver-vehicle"
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value as LocalDriver["vehicle"])}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              {VEHICLES.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="driver-email" className="text-sm font-medium">
              E-mail da conta (opcional)
            </label>
            <input
              id="driver-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="entregador@email.com"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              A pessoa precisa já ter criado conta com este e-mail em /login.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="erp-btn-secondary"
              disabled={busy}
            >
              Cancelar
            </button>
            <button type="submit" disabled={busy} className="erp-btn-primary inline-flex gap-2">
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Cadastrar
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
