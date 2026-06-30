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
  app.innerHTML = renderApp(state);
  bindControls(app);

  if (options.scrollTop) {
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }
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

function tapKey(element) {
  if (element.dataset?.close !== undefined) return "close:sheet";
  if (element.dataset?.segment) return `segment:${element.dataset.segment}`;
  if (element.dataset?.theme) return `theme:${element.dataset.theme}`;
  if (element.dataset?.view) return `view:${element.dataset.view}`;
  if (element.dataset?.reportTab) return `report:${element.dataset.reportTab}`;
  if (element.dataset?.reportRange) return `report-range:${element.dataset.reportRange}`;
  if (element.dataset?.transactionFilter) return `transaction-filter:${element.dataset.transactionFilter}`;
  if (element.dataset?.action) return `action:${element.dataset.action}:${element.dataset.id || ""}`;
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
  event?.preventDefault?.();
  event?.stopPropagation?.();
  if (!element || shouldSkipDuplicate(tapKey(element))) return false;

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
    element.onpointerup = (event) => handleElementTap(element, event);
  });
}

window.lipInTapFromElement = handleElementTap;

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
  if (!event.target.matches("#receipt-file")) return;
  actions.handleReceiptImage(event.target.files?.[0]);
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

window.addEventListener("load", registerServiceWorker);
