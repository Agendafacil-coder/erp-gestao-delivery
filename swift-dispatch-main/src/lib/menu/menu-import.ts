import { parsePriceInput } from "@/lib/menu/admin-state";

export type MenuImportRow = {
  categoryName: string;
  name: string;
  price: number;
  description?: string;
  stockQuantity?: number | null;
  stockMin?: number;
  isFeatured?: boolean;
  isCombo?: boolean;
  isDrink?: boolean;
  available?: boolean;
};

export type MenuImportParseResult = {
  rows: MenuImportRow[];
  errors: string[];
};

const HEADER_ALIASES: Record<string, keyof MenuImportRow | "ignore"> = {
  categoria: "categoryName",
  category: "categoryName",
  nome: "name",
  name: "name",
  produto: "name",
  preco: "price",
  price: "price",
  valor: "price",
  descricao: "description",
  description: "description",
  estoque: "stockQuantity",
  stock: "stockQuantity",
  estoque_minimo: "stockMin",
  estoque_min: "stockMin",
  stock_min: "stockMin",
  minimo: "stockMin",
  destaque: "isFeatured",
  featured: "isFeatured",
  combo: "isCombo",
  bebida: "isDrink",
  drink: "isDrink",
  disponivel: "available",
  available: "available",
  ativo: "available",
};

function normalizeHeader(cell: string): string {
  return cell
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, "_");
}

function parseBoolCell(raw: string): boolean | undefined {
  const v = raw.trim().toLowerCase();
  if (!v) return undefined;
  if (["1", "true", "sim", "s", "yes", "y"].includes(v)) return true;
  if (["0", "false", "nao", "não", "n", "no"].includes(v)) return false;
  return undefined;
}

function parseStockCell(raw: string): number | null | undefined {
  const v = raw.trim();
  if (!v || v === "-" || v.toLowerCase() === "null") return undefined;
  if (!/^\d+$/.test(v)) return null;
  const n = Number(v);
  if (!Number.isSafeInteger(n)) return null;
  return n;
}

function detectDelimiter(headerLine: string): "," | ";" {
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

export function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === delimiter) {
      result.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }

  result.push(current.trim());
  return result;
}

export function parseMenuImportCsv(text: string): MenuImportParseResult {
  const errors: string[] = [];
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return { rows: [], errors: ["Informe o cabeçalho e ao menos uma linha de produto."] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headerCells = parseCsvLine(lines[0], delimiter);
  const columnKeys = headerCells.map((cell) => {
    const key = HEADER_ALIASES[normalizeHeader(cell)];
    if (!key) errors.push(`Coluna desconhecida: "${cell}"`);
    return key ?? "ignore";
  });

  const hasCategory = columnKeys.includes("categoryName");
  const hasName = columnKeys.includes("name");
  const hasPrice = columnKeys.includes("price");
  if (!hasCategory || !hasName || !hasPrice) {
    errors.push("CSV deve ter colunas: categoria, nome e preço.");
    return { rows: [], errors };
  }

  const rows: MenuImportRow[] = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    const cells = parseCsvLine(lines[lineIndex], delimiter);
    const rowNum = lineIndex + 1;
    const draft: Partial<MenuImportRow> = {};

    columnKeys.forEach((key, colIndex) => {
      if (key === "ignore") return;
      const raw = cells[colIndex] ?? "";
      if (key === "categoryName" || key === "name" || key === "description") {
        draft[key] = raw.trim();
        return;
      }
      if (key === "price") {
        const price = parsePriceInput(raw.replace(/\s/g, ""));
        if (price === null) {
          errors.push(`Linha ${rowNum}: preço inválido "${raw}"`);
        } else {
          draft.price = price;
        }
        return;
      }
      if (key === "stockQuantity") {
        const stock = parseStockCell(raw);
        if (stock === null) errors.push(`Linha ${rowNum}: estoque inválido "${raw}"`);
        else if (stock !== undefined) draft.stockQuantity = stock;
        return;
      }
      if (key === "stockMin") {
        const min = parseStockCell(raw);
        if (min === null) errors.push(`Linha ${rowNum}: estoque mínimo inválido "${raw}"`);
        else if (min !== undefined) draft.stockMin = min;
        return;
      }
      if (key === "isFeatured" || key === "isCombo" || key === "isDrink" || key === "available") {
        const bool = parseBoolCell(raw);
        if (raw.trim() && bool === undefined) {
          errors.push(`Linha ${rowNum}: valor booleano inválido em ${key} ("${raw}")`);
        } else if (bool !== undefined) {
          draft[key] = bool;
        }
      }
    });

    if (!draft.categoryName?.trim()) {
      errors.push(`Linha ${rowNum}: categoria obrigatória`);
      continue;
    }
    if (!draft.name?.trim()) {
      errors.push(`Linha ${rowNum}: nome obrigatório`);
      continue;
    }
    if (draft.price == null) continue;

    rows.push({
      categoryName: draft.categoryName.trim(),
      name: draft.name.trim(),
      price: draft.price,
      description: draft.description?.trim() || undefined,
      stockQuantity: draft.stockQuantity,
      stockMin: draft.stockMin,
      isFeatured: draft.isFeatured,
      isCombo: draft.isCombo,
      isDrink: draft.isDrink,
      available: draft.available,
    });
  }

  return { rows, errors };
}
