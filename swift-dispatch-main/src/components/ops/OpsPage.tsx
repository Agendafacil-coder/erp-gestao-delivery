import { Onboarding } from "@/components/ops/Onboarding";
import { OpsMain } from "@/components/ops/OpsShell";
import { LoadingState } from "@/components/ops/StateViews";
import { useTenant } from "@/hooks/useTenant";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";

type OpsPageProps = {
  children: React.ReactNode;
  /** Classes extras no OpsMain */
  className?: string;
  flush?: boolean;
  loading?: boolean;
};

/** Envolve conteúdo com loading, onboarding e área principal padronizada */
export function OpsPage({ children, className, flush, loading: loadingProp }: OpsPageProps) {
  const { current, loading: tenantLoading } = useTenant();
  const { t } = useI18n();
  const loading = loadingProp ?? tenantLoading;

  if (loading) {
    return <LoadingState label={t("common", "loading")} className="flex-1 min-h-[50vh]" />;
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
