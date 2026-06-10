/**
 * Gera ícones PNG do PWA entregador a partir do SVG.
 * Uso: npm run icons:generate
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { DRIVER_ICON_SVG } from "../src/lib/pwa/driverIconSvg";

const OUT_DIR = path.resolve(process.cwd(), "public/icons");

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const svgPath = path.join(OUT_DIR, "driver-icon.svg");
  fs.writeFileSync(svgPath, DRIVER_ICON_SVG.trim());

  const svgBuffer = Buffer.from(DRIVER_ICON_SVG);

  for (const size of [192, 512] as const) {
    const outPath = path.join(OUT_DIR, `driver-${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size, { fit: "contain", background: "#6366f1" })
      .png({ compressionLevel: 9 })
      .toFile(outPath);
    console.log("✓", path.relative(process.cwd(), outPath));
  }

  console.log("Ícones PWA gerados em public/icons/");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
