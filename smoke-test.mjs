import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "index.html",
  "styles.css",
  "sw.js",
  "manifest.webmanifest",
  "docs/REAL_USE_GUIDE.md",
  "src/main.js",
  "src/config/app-config.js",
  "src/core/store.js",
  "src/core/selectors.js",
  "src/core/transactions.js",
  "src/data/categories.js",
  "src/data/seed.js",
  "src/features/actions.js",
  "src/integrations/bank-import.js",
  "src/integrations/thai-slip.js",
  "src/ui/charts.js",
  "src/ui/components.js",
  "src/ui/sheets.js",
  "src/ui/views.js",
  "src/utils/date.js",
  "src/utils/download.js",
  "src/utils/format.js",
  "src/utils/html.js"
];

await Promise.all(requiredFiles.map((file) => access(file)));

const index = await readFile("index.html", "utf8");
const sw = await readFile("sw.js", "utf8");
const main = await readFile("src/main.js", "utf8");
const config = await readFile("src/config/app-config.js", "utf8");
const format = await readFile("src/utils/format.js", "utf8");
const actions = await readFile("src/features/actions.js", "utf8");
const thaiSlip = await readFile("src/integrations/thai-slip.js", "utf8");

const checks = [
  [index.includes('type="module" src="src/main.js?v=12"'), "index.html must load src/main.js?v=12 as a module"],
  [index.includes("styles.css?v=12"), "index.html must load styles.css?v=12"],
  [sw.includes("lip-in-money-v12"), "service worker cache must be v12"],
  [sw.includes("networkFirst"), "service worker must prefer network updates"],
  [sw.includes("client.navigate"), "service worker must refresh old controlled pages after activation"],
  [config.includes('STORAGE_KEY = "lip-in-money-state"'), "storage key must be stable across app versions"],
  [sw.includes("./src/core/transactions.js"), "service worker must cache transaction helpers"],
  [sw.includes("./src/ui/charts.js"), "service worker must cache chart views"],
  [sw.includes("./src/features/actions.js"), "service worker must cache feature actions"],
  [sw.includes("./src/integrations/bank-import.js"), "service worker must cache bank import parser"],
  [sw.includes("./src/integrations/thai-slip.js"), "service worker must cache Thai slip reader"],
  [main.includes("window.lipInTapFromElement"), "main must expose tap fallback for mobile browsers"],
  [main.includes("controllerchange"), "main must reload when a new service worker activates"],
  [(format.match(/export function formatMoney\(/g) || []).length === 1, "formatMoney must have a single export"],
  [thaiSlip.includes("BarcodeDetector"), "Thai slip reader must try local QR detection"],
  [actions.includes("handleThaiSlipFiles"), "actions must expose Thai slip import handler"],
  [!actions.includes("connectPlaidBank"), "actions must not use Plaid bank sync"],
  [main.includes("serviceWorker"), "main must register the service worker"]
];

const failed = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failed.length) {
  console.error(`Smoke test failed:\n- ${failed.join("\n- ")}`);
  process.exit(1);
}

console.log("Smoke test passed");
