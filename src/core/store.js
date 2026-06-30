import { LEGACY_STORAGE_KEYS, STORAGE_KEY } from "../config/app-config.js";
import { createSeedState } from "../data/seed.js";
import { defaultQuickAdd, defaultTransactionAdvancedFilters, normalizeTransaction } from "./transactions.js";

const LEGACY_PLACEHOLDER_IDS = {
  transactions: new Set(["tx_1", "tx_2", "tx_3", "tx_4", "tx_5", "tx_6", "tx_7", "tx_8", "tx_9"]),
  budgets: new Set(["b_food", "b_travel", "b_fun", "b_daily", "b_coffee"]),
  goals: new Set(["g_1", "g_2", "g_3"]),
  loans: new Set(["loan_1", "loan_2"])
};

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
    const migratedFromLegacy = parsed.dataMode !== "production";
    const state = {
      ...seed,
      ...parsed,
      dataMode: parsed.dataMode || seed.dataMode,
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

    removeLegacyPlaceholderData(state, seed, parsed);
    normalizeState(state, seed);
    if (saved.key !== STORAGE_KEY || migratedFromLegacy) saveState(state);
    return state;
  } catch (error) {
    console.warn("Cannot load saved state", error);
    return normalizeState(seed, seed);
  }
}

function removeLegacyPlaceholderData(state, seed, parsed = {}) {
  if (parsed.dataMode === "production") return;

  const transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];
  const hasRealTransactions = transactions.some((transaction) => !LEGACY_PLACEHOLDER_IDS.transactions.has(String(transaction.id || "")));

  state.transactions = transactions.filter((transaction) => !LEGACY_PLACEHOLDER_IDS.transactions.has(String(transaction.id || "")));
  state.budgets = (parsed.budgets || []).filter((budget) => !LEGACY_PLACEHOLDER_IDS.budgets.has(String(budget.id || "")));
  state.goals = (parsed.goals || []).filter((goal) => !LEGACY_PLACEHOLDER_IDS.goals.has(String(goal.id || "")));
  state.loans = (parsed.loans || []).filter((loan) => !LEGACY_PLACEHOLDER_IDS.loans.has(String(loan.id || "")));
  state.recurringRules = [];

  if (!hasRealTransactions) {
    state.wallets = seed.wallets;
    state.budgets = [];
    state.goals = [];
    state.loans = [];
  }

  state.dataMode = "production";
}

function normalizeState(state, seed) {
  state.dataMode = "production";
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
