import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/design/AppCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ManualOrderDialog } from "@/components/ops/ManualOrderDialog";

type Props = {
  /** Se false, esconde o card (sem permissão de operação). */
  enabled?: boolean;
};

export function WhatsappQuickOrderCard({ enabled = true }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  if (!enabled) return null;

  return (
    <>
      <AppCard>
        <AppCardHeader>
          <AppCardTitle className="flex items-center gap-2 text-base">
            <MessageSquarePlus className="size-4 text-primary" />
            Pedido pelo WhatsApp
          </AppCardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Cliente pediu no zap? Preencha o telefone e abra o pedido já no canal WhatsApp.
          </p>
        </AppCardHeader>
        <AppCardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="erp-section-label">Nome (opcional)</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Maria Silva"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="erp-section-label">Telefone</Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="h-9 text-sm"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="erp-btn-primary w-full sm:w-auto text-sm"
          >
            Abrir pedido WhatsApp
          </button>
        </AppCardContent>
      </AppCard>

      <ManualOrderDialog
        open={open}
        onOpenChange={setOpen}
        defaults={{
          channel: "WhatsApp",
          customerName: name.trim() || undefined,
          customerPhone: phone.trim() || undefined,
        }}
      />
    </>
  );
}
