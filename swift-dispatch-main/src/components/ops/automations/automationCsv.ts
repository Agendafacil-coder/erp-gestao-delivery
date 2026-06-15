import type { AutomationEvent } from "@/lib/ops/detectAutomationEvents";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function downloadAutomationCsv(
  logs: Array<AutomationEvent & { atIso?: string }>,
  filenameSuffix = "sessao",
): void {
  const header = "timestamp,rule_id,level,message";
  const rows = logs.map((l) =>
    [l.atIso ?? l.at, l.ruleId, l.level, l.message].map(csvEscape).join(","),
  );
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `automacoes-${filenameSuffix}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 100);
}
