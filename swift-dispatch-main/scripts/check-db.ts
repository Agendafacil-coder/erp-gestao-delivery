import postgres from "postgres";
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

const url = process.env.DATABASE_URL!;
const sql = postgres(url, { max: 1 });
const cols = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'menu_items'
  ORDER BY ordinal_position
`;
console.log("menu_items:", cols.map((c) => c.column_name).join(", "));
const tables = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
  AND (table_name LIKE 'menu%' OR table_name = 'tenant_menu_settings')
`;
console.log("tables:", tables.map((t) => t.table_name).join(", "));
await sql.end();
