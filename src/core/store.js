import { LEGACY_STORAGE_KEYS, STORAGE_KEY } from "../config/app-config.js";
import { createSeedState } from "../data/seed.js";

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
    if (!saved) return seed;

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
      customCategories: parsed.customCategories || []
    };

    if (saved.key !== STORAGE_KEY) saveState(state);
    return state;
  } catch (error) {
    console.warn("Cannot load saved state", error);
    return seed;
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  return createSeedState();
}
