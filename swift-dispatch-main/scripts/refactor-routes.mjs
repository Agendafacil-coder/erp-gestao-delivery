import fs from "fs";
import path from "path";

const dir = path.join(process.cwd(), "src/routes");
const skip = new Set([
  "_authenticated.tsx",
  "_authenticated.central.tsx",
  "_authenticated.kanban.tsx",
  "_authenticated.kds.tsx",
  "_authenticated.cardapio.tsx",
]);

const shellRe =
  /<div className="min-h-screen flex(?: bg-background)?">\s*<OpsSidebar \/>\s*<div className="flex-1 flex flex-col min-w-0">\s*<OpsHeader tick=\{tick\} \/>\s*([\s\S]*?)<\/div>\s*<\/div>\s*\);/g;

function transform(content, filename) {
  let c = content;
  if (!c.includes("OpsSidebar") && !c.includes("<OpsPage")) return c;

  c = c.replace(/import \{ OpsSidebar \} from "@\/components\/ops\/Sidebar";\r?\n/g, "");
  c = c.replace(/import \{ OpsHeader \} from "@\/components\/ops\/Header";\r?\n/g, "");
  c = c.replace(/import \{ Onboarding \} from "@\/components\/ops\/Onboarding";\r?\n/g, "");
  if (!c.includes("OpsPage")) {
    c = c.replace(/import \{ createFileRoute/, 'import { OpsPage } from "@/components/ops/OpsPage";\nimport { createFileRoute');
  }
  c = c.replace(/const \{ current, loading \} = useTenant\(\)/g, "const { current } = useTenant()");
  c = c.replace(
    /\s*if \(loading\) \{\s*return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">\{t\("common", "loading"\)\}<\/div>;\s*\}\s*/g,
    "\n",
  );

  c = c.replace(shellRe, (_, inner) => {
    const loadingBlock =
      /^\s*\{loading \? \(\s*<div[^>]*>\{t\("common", "loading"\)\}<\/div>\s*\) : !current \? \(\s*<Onboarding \/>\s*\) : \(\s*/;
    const loadingBlock2 =
      /^\s*\{!current \? \(\s*(?:<div[^>]*>\s*)?<Onboarding \/>\s*(?:<\/div>\s*)?>?\s*\) : \(\s*/;

    let body = inner.trim();
    if (loadingBlock.test(body)) {
      body = body.replace(loadingBlock, "");
      body = body.replace(/\)\s*$/, "");
    } else if (loadingBlock2.test(body)) {
      body = body.replace(loadingBlock2, "");
      body = body.replace(/\)\s*$/, "");
    }

    // mapa special: TacticalMapView without main
    if (body.includes("<TacticalMapView") && !body.includes("<main")) {
      return `<OpsPage flush className="!p-0 overflow-hidden">\n        ${body}\n    </OpsPage>\n  );`;
    }

    const mainMatch = body.match(/<main className="([^"]*)">([\s\S]*)<\/main>/);
    if (mainMatch) {
      const cls = mainMatch[1].replace(/flex-1\s*/, "").replace(/overflow-y-auto\s*/, "").trim();
      return `<OpsPage className="${cls}">\n        ${mainMatch[2].trim()}\n    </OpsPage>\n  );`;
    }

    return `<OpsPage>\n        ${body}\n    </OpsPage>\n  );`;
  });

  return c;
}

for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".tsx"))) {
  if (skip.has(f)) continue;
  const fp = path.join(dir, f);
  const orig = fs.readFileSync(fp, "utf8");
  const next = transform(orig, f);
  if (next !== orig) {
    fs.writeFileSync(fp, next);
    console.log("fixed", f);
  }
}
