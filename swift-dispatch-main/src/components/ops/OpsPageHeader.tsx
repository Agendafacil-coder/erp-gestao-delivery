import { PageHeader } from "@/components/design/PageHeader";

type OpsPageHeaderProps = {
  subtitle?: string;
  title: React.ReactNode;
  highlight?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

/** Cabeçalho de página operacional — delega ao design system */
export function OpsPageHeader({
  subtitle,
  title,
  highlight,
  actions,
  className,
}: OpsPageHeaderProps) {
  return (
    <PageHeader
      eyebrow={subtitle}
      title={title}
      highlight={highlight}
      actions={actions}
      className={className}
    />
  );
}
