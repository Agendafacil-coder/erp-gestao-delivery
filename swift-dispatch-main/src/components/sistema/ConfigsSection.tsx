import { StoreSettingsTab } from "@/components/sistema/configs/StoreSettingsTab";
import { OperationSettingsTab } from "@/components/sistema/configs/OperationSettingsTab";
import { TeamSettingsTab } from "@/components/sistema/configs/TeamSettingsTab";
import { StoreConfigsProvider } from "@/hooks/useStoreConfigs";
import type { ConfigsAba } from "@/lib/sistema/search";

type Props = {
  aba: ConfigsAba;
  onAbaChange: (aba: ConfigsAba) => void;
};

export function ConfigsSection(props: Props) {
  return (
    <StoreConfigsProvider>
      <ConfigsSectionInner {...props} />
    </StoreConfigsProvider>
  );
}

function ConfigsSectionInner({ aba, onAbaChange }: Props) {
  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground max-w-xl">
          Dados da loja, entrega, impressão e permissões da equipe — organizados por área.
        </p>
        <div className="segmented-control w-full sm:w-auto shrink-0">
          <button
            type="button"
            data-active={aba === "loja"}
            onClick={() => onAbaChange("loja")}
            className="segmented-item text-xs"
          >
            Loja e cardápio
          </button>
          <button
            type="button"
            data-active={aba === "operacao"}
            onClick={() => onAbaChange("operacao")}
            className="segmented-item text-xs"
          >
            Operação
          </button>
          <button
            type="button"
            data-active={aba === "equipe"}
            onClick={() => onAbaChange("equipe")}
            className="segmented-item text-xs"
          >
            Equipe
          </button>
        </div>
      </div>

      {aba === "loja" ? <StoreSettingsTab /> : null}
      {aba === "operacao" ? <OperationSettingsTab /> : null}
      {aba === "equipe" ? <TeamSettingsTab /> : null}
    </div>
  );
}
