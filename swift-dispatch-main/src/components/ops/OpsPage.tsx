import { useEffect, useState } from "react";
import { Onboarding } from "@/components/ops/Onboarding";
import { OpsMain } from "@/components/ops/OpsShell";
import { ErrorState, LoadingState } from "@/components/ops/StateViews";
import { useTenant } from "@/hooks/useTenant";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";

const LOADING_TIMEOUT_MS = 15_000;

type OpsPageProps = {
  children: React.ReactNode;
  /** Classes extras no OpsMain */
  className?: string;
  flush?: boolean;
  loading?: boolean;
};

/** Envolve conteúdo com loading, onboarding e área principal padronizada */
export function OpsPage({ children, className, flush, loading: loadingProp }: OpsPageProps) {
  const { current, loading: tenantLoading, refresh } = useTenant();
  const { t } = useI18n();
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  const waiting = loadingProp ?? tenantLoading;

  useEffect(() => {
    if (!waiting) {
      setLoadingTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setLoadingTimedOut(true), LOADING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [waiting]);

  if (waiting && !loadingTimedOut) {
    return <LoadingState label={t("common", "loading")} className="flex-1 min-h-[50vh]" />;
  }

  if (waiting && loadingTimedOut && !current) {
    return (
      <ErrorState
        className="flex-1 min-h-[50vh]"
        title="Não foi possível carregar a operação"
        description="Verifique se o Postgres está rodando e se DATABASE_URL está correto no .env."
        onRetry={() => void refresh({ blocking: true })}
      />
    );
  }

  if (!current) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 md:p-6">
        <Onboarding />
      </div>
    );
  }

  return (
    <OpsMain className={cn(className)} flush={flush}>
      {children}
    </OpsMain>
  );
}
