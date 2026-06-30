import { readFile } from "node:fs/promises";
import vm from "node:vm";

class FakeElement {
  constructor(selector = "") {
    this.selector = selector;
    this.dataset = {};
    this.innerHTML = "";
  }

  addEventListener() {}

  querySelectorAll() {
    return [];
  }

  querySelector() {
    return null;
  }
}

const elements = new Map([
  ["#app", new FakeElement("#app")],
  ["#sheet-root", new FakeElement("#sheet-root")],
  ["#toast-root", new FakeElement("#toast-root")]
]);

const localStorageData = new Map();

const context = {
  console,
  setTimeout,
  clearTimeout,
  Blob: class Blob {},
  URL: {
    createObjectURL: () => "blob:smoke",
    revokeObjectURL: () => {}
  },
  Intl,
  Date,
  Math,
  Number,
  String,
  Array,
  Map,
  JSON,
  document: {
    querySelector: (selector) => elements.get(selector) || null,
    createElement: () => ({
      click: () => {},
      remove: () => {}
    }),
    body: {
      appendChild: () => {}
    }
  },
  window: {
    addEventListener: () => {}
  },
  navigator: {},
  localStorage: {
    getItem: (key) => localStorageData.get(key) || null,
    setItem: (key, value) => localStorageData.set(key, value),
    removeItem: (key) => localStorageData.delete(key)
  }
};

context.globalThis = context;

const code = await readFile("app.js", "utf8");
vm.runInNewContext(code, context, { filename: "app.js" });

const html = elements.get("#app").innerHTML;
const required = ["ภาพรวม", "ยอดคงเหลือ", "กระเป๋าเงิน", "เพิ่มรายการ"];
const missing = required.filter((text) => !html.includes(text));

if (missing.length) {
  console.error(`Smoke test failed. Missing: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("Smoke test passed");
