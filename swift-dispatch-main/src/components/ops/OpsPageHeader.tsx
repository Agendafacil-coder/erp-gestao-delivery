import { PageHeader } from "@/components/design/PageHeader";

type OpsPageHeaderProps = {
  subtitle?: string;
  description?: string;
  title: React.ReactNode;
  highlight?: React.ReactNode;
  icon?: React.ComponentProps<typeof PageHeader>["icon"];
  iconClassName?: string;
  actions?: React.ReactNode;
  className?: string;
};

/** Cabeçalho de página operacional — delega ao design system */
export function OpsPageHeader({
  subtitle,
  description,
  title,
  highlight,
  icon,
  iconClassName,
  actions,
  className,
}: OpsPageHeaderProps) {
  return (
    <PageHeader
      eyebrow={subtitle}
      description={description}
      title={title}
      highlight={highlight}
      icon={icon}
      iconClassName={iconClassName}
      actions={actions}
      className={className}
    />
  );
}
