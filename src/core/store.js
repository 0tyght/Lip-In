import { LEGACY_STORAGE_KEYS, STORAGE_KEY } from "../config/app-config.js";
import { createSeedState } from "../data/seed.js";
import { defaultQuickAdd, defaultTransactionAdvancedFilters, normalizeTransaction } from "./transactions.js";

function readSavedState() {
  const keys = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];

  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value) return { key, value };
  }

  return null;
}

export function loadState() {
  const seed = createSeedState();

  try {
    const saved = readSavedState();
    if (!saved) return normalizeState(seed, seed);

    const parsed = JSON.parse(saved.value);
    const state = {
      ...seed,
      ...parsed,
      reportTab: parsed.reportTab === "tag" ? "source" : parsed.reportTab || seed.reportTab,
      profile: { ...seed.profile, ...(parsed.profile || {}) },
      wallets: parsed.wallets || seed.wallets,
      transactions: parsed.transactions || seed.transactions,
      budgets: parsed.budgets || seed.budgets,
      goals: parsed.goals || seed.goals,
      loans: parsed.loans || seed.loans,
      allocations: parsed.allocations || seed.allocations,
      customCategories: parsed.customCategories || [],
      bankSettings: { ...seed.bankSettings, ...(parsed.bankSettings || {}) },
      bankSync: { ...seed.bankSync, ...(parsed.bankSync || {}) },
      bankConnections: Array.isArray(parsed.bankConnections) ? parsed.bankConnections : seed.bankConnections || []
    };

    normalizeState(state, seed);
    if (saved.key !== STORAGE_KEY) saveState(state);
    return state;
  } catch (error) {
    console.warn("Cannot load saved state", error);
    return normalizeState(seed, seed);
  }
}

function normalizeState(state, seed) {
  state.transactionSearch = String(state.transactionSearch || "");
  state.transactionAdvancedFilters = {
    ...defaultTransactionAdvancedFilters,
    ...(state.transactionAdvancedFilters || {})
  };
  state.quickAmounts = Array.isArray(state.quickAmounts) && state.quickAmounts.length ? state.quickAmounts : seed.quickAmounts;
  state.quickAdd = {
    ...defaultQuickAdd,
    ...(state.quickAdd || {})
  };
  state.undoStack = Array.isArray(state.undoStack) ? state.undoStack : [];
  state.recurringRules = Array.isArray(state.recurringRules) ? state.recurringRules : seed.recurringRules || [];
  state.bankSettings = {
    apiBaseUrl: "",
    apiToken: "",
    userId: "lipin-personal",
    provider: "plaid",
    ...(seed.bankSettings || {}),
    ...(state.bankSettings || {})
  };
  state.bankSync = {
    status: "not_configured",
    lastSyncedAt: null,
    lastImportedAt: null,
    lastError: "",
    importedCount: 0,
    ...(seed.bankSync || {}),
    ...(state.bankSync || {})
  };
  state.bankConnections = Array.isArray(state.bankConnections) ? state.bankConnections : [];
  state.transactions = (state.transactions || []).map((transaction) => normalizeTransaction(transaction));
  return state;
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  const seed = createSeedState();
  return normalizeState(seed, seed);
}
