import { STORAGE_KEY } from "../config/app-config.js";
import { createSeedState } from "../data/seed.js";

export function loadState() {
  const seed = createSeedState();

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return seed;

    const parsed = JSON.parse(saved);
    return {
      ...seed,
      ...parsed,
      profile: { ...seed.profile, ...(parsed.profile || {}) },
      wallets: parsed.wallets || seed.wallets,
      transactions: parsed.transactions || seed.transactions,
      budgets: parsed.budgets || seed.budgets,
      goals: parsed.goals || seed.goals,
      loans: parsed.loans || seed.loans,
      allocations: parsed.allocations || seed.allocations,
      customCategories: parsed.customCategories || []
    };
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
  return createSeedState();
}
