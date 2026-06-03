import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ResponsiveColumn<T> = {
  key: string;
  header: string;
  headerClassName?: string;
  cellClassName?: string;
  /** Rótulo no card mobile (padrão: header) */
  label?: string;
  render: (row: T, index: number) => ReactNode;
  /** Ocultar no card mobile (ex.: coluna #) */
  hideOnMobile?: boolean;
  /** Destaque no topo do card mobile */
  mobilePrimary?: boolean;
};

type Props<T> = {
  rows: T[];
  columns: ResponsiveColumn<T>[];
  rowKey: (row: T, index: number) => string;
  emptyMessage?: string;
  tableClassName?: string;
};

/** Tabela em md+; cards empilhados no mobile (sem scroll horizontal). */
export function ResponsiveTable<T>({
  rows,
  columns,
  rowKey,
  emptyMessage = "Sem dados no período.",
  tableClassName,
}: Props<T>) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">{emptyMessage}</p>;
  }

  const mobileCols = columns.filter((c) => !c.hideOnMobile);
  const primaryCol = columns.find((c) => c.mobilePrimary) ?? columns.find((c) => !c.hideOnMobile);

  return (
    <>
      <div className="md:hidden space-y-2">
        {rows.map((row, i) => (
          <div
            key={rowKey(row, i)}
            className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2"
          >
            {primaryCol && (
              <div className="font-medium text-sm break-words">
                {primaryCol.render(row, i)}
              </div>
            )}
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
              {mobileCols
                .filter((c) => c !== primaryCol)
                .map((col) => (
                  <div key={col.key} className="contents">
                    <dt className="text-muted-foreground font-medium">
                      {col.label ?? col.header}
                    </dt>
                    <dd className={cn("text-right font-mono tabular-nums break-words", col.cellClassName)}>
                      {col.render(row, i)}
                    </dd>
                  </div>
                ))}
            </dl>
          </div>
        ))}
      </div>

      <div className="erp-table-wrap hidden md:block">
        <table className={cn("erp-table", tableClassName)}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={col.headerClassName}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={rowKey(row, i)}>
                {columns.map((col) => (
                  <td key={col.key} className={col.cellClassName}>
                    {col.render(row, i)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
