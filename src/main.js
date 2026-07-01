import { APP_VERSION } from "./config/app-config.js";
import { loadState, saveState } from "./core/store.js";
import { createActions } from "./features/actions.js";
import { renderApp } from "./ui/views.js";
import { escapeHtml } from "./utils/html.js";

const app = document.querySelector("#app");
const sheetRoot = document.querySelector("#sheet-root");
const toastRoot = document.querySelector("#toast-root");

let state = loadState();
let deferredInstallPrompt = null;
let serviceWorkerRegistration = null;
let reloadingForUpdate = false;
let lastTap = { key: "", time: 0 };
let pointerStart = { x: 0, y: 0, time: 0 };
let suppressTapUntil = 0;
const TAP_MOVE_THRESHOLD = 10;
const TAP_SUPPRESS_MS = 450;

const actions = createActions({
  getState: () => state,
  setState: replaceState,
  save: () => saveState(state),
  render,
  openSheet,
  closeSheet,
  toast,
  checkForAppUpdate,
  getDeferredInstallPrompt: () => deferredInstallPrompt,
  setDeferredInstallPrompt: (prompt) => {
    deferredInstallPrompt = prompt;
  }
});

function replaceState(nextState) {
  state = nextState;
  saveState(state);
  render();
}

function render(options = {}) {
  app.dataset.theme = state.theme;
  app.dataset.view = state.view;
  app.dataset.version = APP_VERSION;
  updateScrollState();
  app.innerHTML = renderApp(state);
  bindControls(app);

  if (options.scrollTop) {
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }
}

function updateScrollState() {
  app.dataset.scrolled = window.scrollY > 18 ? "true" : "false";
}

function openSheet(html) {
  sheetRoot.innerHTML = `
    <div class="sheet-backdrop" data-close>
      <section class="sheet" role="dialog" aria-modal="true" onclick="event.stopPropagation()">
        ${html}
      </section>
    </div>
  `;
  bindControls(sheetRoot);
}

function closeSheet() {
  sheetRoot.innerHTML = "";
}

function toast(message) {
  toastRoot.innerHTML = `<div class="toast">${escapeHtml(message)}</div>`;
  window.setTimeout(() => {
    toastRoot.innerHTML = "";
  }, 2300);
}

function shouldSkipDuplicate(key) {
  const now = Date.now();
  if (lastTap.key === key && now - lastTap.time < 350) return true;
  lastTap = { key, time: now };
  return false;
}

function pointerCoordinates(event) {
  const point = event?.changedTouches?.[0] || event?.touches?.[0] || event;
  const x = Number(point?.clientX);
  const y = Number(point?.clientY);
  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0
  };
}

function rememberPointerStart(event) {
  const point = pointerCoordinates(event);
  pointerStart = { ...point, time: Date.now() };
}

function isScrollingGesture(event) {
  const now = Date.now();
  if (now < suppressTapUntil) return true;
  if (!event || !pointerStart.time || now - pointerStart.time > 1200) return false;

  const point = pointerCoordinates(event);
  const moved = Math.abs(point.x - pointerStart.x) > TAP_MOVE_THRESHOLD ||
    Math.abs(point.y - pointerStart.y) > TAP_MOVE_THRESHOLD;

  if (moved) suppressTapUntil = now + TAP_SUPPRESS_MS;
  return moved;
}

function tapKey(element) {
  if (element.dataset?.close !== undefined) return "close:sheet";
  if (element.dataset?.segment) return `segment:${element.dataset.segment}`;
  if (element.dataset?.theme) return `theme:${element.dataset.theme}`;
  if (element.dataset?.view) return `view:${element.dataset.view}`;
  if (element.dataset?.reportTab) return `report:${element.dataset.reportTab}`;
  if (element.dataset?.reportRange) return `report-range:${element.dataset.reportRange}`;
  if (element.dataset?.transactionFilter) return `transaction-filter:${element.dataset.transactionFilter}`;
  if (element.dataset?.action) return `action:${element.dataset.action}:${element.dataset.id || element.dataset.title || ""}`;
  return "unknown";
}

function selectSegment(element) {
  const group = element.closest("[data-segment-group]");
  const input = group?.parentElement?.querySelector(`input[name="${group.dataset.segmentGroup}"]`);
  if (input) input.value = element.dataset.segment;
  group?.querySelectorAll(".seg-btn").forEach((button) => button.classList.remove("is-active"));
  element.classList.add("is-active");
}

function handleElementTap(element, event = null) {
  if (!element || isScrollingGesture(event) || shouldSkipDuplicate(tapKey(element))) return false;
  event?.preventDefault?.();
  event?.stopPropagation?.();

  if (element.matches?.("[data-close]")) {
    closeSheet();
    return false;
  }

  if (element.dataset?.segment) {
    selectSegment(element);
    return false;
  }

  if (element.dataset?.theme) {
    state.theme = element.dataset.theme;
    saveState(state);
    render();
    return false;
  }

  if (element.dataset?.view) {
    const changed = state.view !== element.dataset.view;
    state.view = element.dataset.view;
    saveState(state);
    render({ scrollTop: changed });
    return false;
  }

  if (element.dataset?.reportTab) {
    state.reportTab = element.dataset.reportTab;
    saveState(state);
    render();
    return false;
  }

  if (element.dataset?.reportRange) {
    state.reportRange = element.dataset.reportRange;
    saveState(state);
    render();
    return false;
  }

  if (element.dataset?.transactionFilter) {
    state.transactionFilter = element.dataset.transactionFilter;
    saveState(state);
    render();
    return false;
  }

  if (element.dataset?.action) {
    actions.handleAction(element.dataset.action, element);
    return false;
  }

  return false;
}

function closestFromEvent(event, selector) {
  let target = event.target;
  if (!target) return null;
  if (target.nodeType === 3) target = target.parentElement;
  if (!target?.closest) return null;
  return target.closest(selector);
}

function handleDelegatedTap(event, root) {
  const selector = "[data-close], [data-segment], [data-theme], [data-view], [data-report-tab], [data-report-range], [data-transaction-filter], [data-action]";
  const element = closestFromEvent(event, selector);
  if (!element || !root.contains(element)) return;
  handleElementTap(element, event);
}

function bindControls(root) {
  const selector = "[data-close], [data-segment], [data-theme], [data-view], [data-report-tab], [data-report-range], [data-transaction-filter], [data-action]";
  root.querySelectorAll(selector).forEach((element) => {
    element.setAttribute("onclick", "window.lipInTapFromElement(this,event);return false;");
    element.onpointerdown = rememberPointerStart;
    element.onpointerup = (event) => handleElementTap(element, event);
  });
}

window.lipInTapFromElement = handleElementTap;

document.addEventListener("pointerdown", rememberPointerStart, true);
document.addEventListener("touchstart", rememberPointerStart, { capture: true, passive: true });

app.addEventListener("pointerup", (event) => handleDelegatedTap(event, app));
app.addEventListener("click", (event) => handleDelegatedTap(event, app));
sheetRoot.addEventListener("pointerup", (event) => handleDelegatedTap(event, sheetRoot));
sheetRoot.addEventListener("click", (event) => handleDelegatedTap(event, sheetRoot));

document.addEventListener("click", (event) => {
  if (sheetRoot.contains(event.target)) return;
  handleDelegatedTap(event, app);
}, true);

document.addEventListener("touchend", (event) => {
  if (sheetRoot.contains(event.target)) return;
  handleDelegatedTap(event, app);
}, true);

app.addEventListener("submit", (event) => {
  event.preventDefault();
  actions.handleAppSubmit(event.target);
});

sheetRoot.addEventListener("submit", (event) => {
  event.preventDefault();
  actions.handleSubmit(event.target);
});

sheetRoot.addEventListener("change", (event) => {
  if (event.target.matches("#receipt-file")) {
    actions.handleReceiptImage(event.target.files?.[0]);
    return;
  }

  if (event.target.matches("#thai-slip-files")) {
    actions.handleThaiSlipFiles(event.target.files);
    event.target.value = "";
    return;
  }

  if (event.target.matches("#bank-statement-file")) {
    actions.handleBankStatementFile(event.target.files?.[0]);
    event.target.value = "";
  }
});

function showUpdatedToast() {
  const updatedVersion = sessionStorage.getItem("lip-in-updated-version");
  if (updatedVersion !== APP_VERSION) return;
  sessionStorage.removeItem("lip-in-updated-version");
  toast("อัปเดตเป็นเวอร์ชันล่าสุดแล้ว");
}

function activateWaitingServiceWorker(registration) {
  if (!registration.waiting) return;
  sessionStorage.setItem("lip-in-updated-version", APP_VERSION);
  registration.waiting.postMessage({ type: "SKIP_WAITING" });
}

function watchServiceWorker(registration) {
  if (registration.waiting && navigator.serviceWorker.controller) {
    activateWaitingServiceWorker(registration);
  }

  registration.addEventListener("updatefound", () => {
    const worker = registration.installing;
    if (!worker) return;

    worker.addEventListener("statechange", () => {
      if (worker.state === "installed" && navigator.serviceWorker.controller) {
        activateWaitingServiceWorker(registration);
      }
    });
  });
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadingForUpdate) return;
    reloadingForUpdate = true;
    window.location.reload();
  });

  try {
    serviceWorkerRegistration = await navigator.serviceWorker.register("./sw.js");
    watchServiceWorker(serviceWorkerRegistration);
    serviceWorkerRegistration.update();
    window.setInterval(() => serviceWorkerRegistration?.update(), 60 * 60 * 1000);
  } catch (error) {
    console.warn("Service worker failed", error);
  }
}

async function checkForAppUpdate() {
  if (!serviceWorkerRegistration) {
    toast("กำลังเตรียมระบบอัปเดต");
    return;
  }

  toast("กำลังตรวจเวอร์ชันล่าสุด");
  const registration = await serviceWorkerRegistration.update();
  if (registration.waiting) {
    activateWaitingServiceWorker(registration);
  } else {
    toast("เป็นเวอร์ชันล่าสุดแล้ว");
  }
}

render();
showUpdatedToast();

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
});

window.addEventListener("scroll", updateScrollState, { passive: true });
window.addEventListener("load", registerServiceWorker);
