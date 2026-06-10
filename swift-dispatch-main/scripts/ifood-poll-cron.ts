/**
 * Polling iFood server-side — rode via agendador (cron, Task Scheduler, etc.).
 *
 *   npm run ifood:poll
 *
 * Requer DATABASE_URL e credenciais OAuth iFood já salvas por tenant.
 */
import fs from "fs";
import path from "path";

try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, "utf-8")
      .split("\n")
      .forEach((line) => {
        const i = line.indexOf("=");
        if (i > 0) process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
      });
  }
} catch {
  /* ignore */
}

const { pollAllIfoodTenants } = await import("../src/lib/integrations/ifood/pollAllTenants");

const summary = await pollAllIfoodTenants();
console.log(JSON.stringify(summary, null, 2));

if (summary.errors.length > 0) {
  process.exitCode = 1;
}
