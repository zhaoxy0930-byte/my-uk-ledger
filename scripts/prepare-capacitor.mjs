import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, "www");

const entries = [
  "index.html",
  "styles.css",
  "app.js",
  "manifest.webmanifest",
  "service-worker.js",
  "icons",
  "vendor-pdf.mjs",
  "vendor-pdf.worker.mjs",
  "vendor-tesseract.min.js",
  "vendor-tesseract.worker.min.js",
  "vendor-tesseract-core.wasm.js",
  "eng.traineddata.gz"
];

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

for (const entry of entries) {
  await cp(join(root, entry), join(outDir, entry), { recursive: true });
}

console.log(`Prepared Capacitor web assets in ${outDir}`);
