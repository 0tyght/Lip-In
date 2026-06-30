export function createSeedState() {
  return {
    dataMode: "production",
    theme: "sunny",
    view: "overview",
    reportTab: "category",
    reportRange: "month",
    transactionFilter: "all",
    transactionSearch: "",
    transactionAdvancedFilters: {
      walletId: "all",
      categoryId: "all",
      status: "all",
      minAmount: "",
      maxAmount: "",
      dateFrom: "",
      dateTo: "",
      tag: ""
    },
    quickAmounts: [59, 99, 129, 250],
    quickAdd: {
      walletId: "daily",
      categoryId: "food"
    },
    undoStack: [],
    recurringRules: [],
    bankSettings: {
      apiBaseUrl: "",
      apiToken: "",
      userId: "lipin-personal",
      provider: "plaid"
    },
    bankSync: {
      status: "not_configured",
      lastSyncedAt: null,
      lastImportedAt: null,
      lastError: "",
      importedCount: 0
    },
    bankConnections: [],
    lastSyncedAt: null,
    profile: {
      name: "ผู้ใช้",
      caption: "จัดการเงินจริงของคุณ"
    },
    wallets: [
      { id: "daily", name: "บัญชีหลัก", icon: "🏦", balance: 0, color: "#d5f3ff" },
      { id: "cash", name: "เงินสด", icon: "💵", balance: 0, color: "#d9f6e9" }
    ],
    transactions: [],
    budgets: [],
    goals: [],
    loans: [],
    customCategories: [],
    allocations: [
      { id: "a_need", name: "ใช้จำเป็น", percent: 50, color: "#bfd17f" },
      { id: "a_want", name: "อยากได้", percent: 30, color: "#ffc022" },
      { id: "a_save", name: "ออม/ลงทุน", percent: 20, color: "#ff7ca8" }
    ],
    expectedIncome: 0,
    dailyLimit: 0
  };
}
