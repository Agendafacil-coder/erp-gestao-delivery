/**
 * Valida variáveis de ambiente antes do deploy.
 * Uso: npm run production:check
 *      NODE_ENV=production npm run production:check -- --strict
 */
import fs from "fs";
import path from "path";
import { buildProductionReadinessReport } from "../src/lib/server/productionReadiness";

try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, "utf-8")
      .split("\n")
      .forEach((line) => {
        const i = line.indexOf("=");
        if (i > 0 && !line.trimStart().startsWith("#")) {
          const key = line.slice(0, i).trim();
          const value = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, "");
          if (key && process.env[key] == null) process.env[key] = value;
        }
      });
  }
} catch {
  /* ignore */
}

const strict =
  process.argv.includes("--strict") || process.env.NODE_ENV === "production";

const report = buildProductionReadinessReport();

console.log("\n=== Delivery OS — Checklist de produção ===\n");
console.log(`Ambiente: ${report.nodeEnv}${report.isProduction ? " (produção)" : ""}`);
console.log(
  `Progresso: ${report.progress.done}/${report.progress.total} · Obrigatórios: ${report.progress.requiredDone}/${report.progress.requiredTotal}`,
);
console.log(`Pronto para produção: ${report.ready ? "SIM" : "NÃO"}\n`);

for (const category of report.categories) {
  console.log(`## ${category.label}`);
  for (const item of category.items) {
    const mark = item.done ? "[x]" : "[ ]";
    const tag =
      item.severity === "required" ? "obrigatório" : item.severity === "recommended" ? "recomendado" : "opcional";
    console.log(`  ${mark} ${item.label} (${tag})`);
    if (!item.done && item.hint) console.log(`      → ${item.hint}`);
  }
  console.log("");
}

console.log("Webhooks públicos:");
console.log(`  Pagamentos: ${report.webhookUrls.payments}`);
console.log(`  iFood:      ${report.webhookUrls.ifood}\n`);

if (report.warnings.length > 0) {
  console.log("Avisos:");
  report.warnings.forEach((w) => console.log(`  ! ${w}`));
  console.log("");
}

if (strict && !report.ready) {
  console.error("Falha: itens obrigatórios pendentes.\n");
  process.exit(1);
}

console.log("OK.\n");
