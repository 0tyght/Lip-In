import { offsetDate, toISODate } from "../utils/date.js";

export function createSeedState() {
  const today = toISODate(new Date());

  return {
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
    recurringRules: [
      { id: "rec_rent", title: "ค่าเช่าบ้าน", amount: 8500, frequency: "monthly", nextDate: offsetDate(7), status: "active" },
      { id: "rec_salary", title: "เงินเดือน", amount: 45000, frequency: "monthly", nextDate: offsetDate(12), status: "active" }
    ],
    lastSyncedAt: null,
    profile: {
      name: "น้องพอดี",
      caption: "วันนี้ใช้เงินแบบน่ารัก"
    },
    wallets: [
      { id: "daily", name: "เงินซื้อของใช้", icon: "🛍️", balance: 49745, color: "#d5f3ff" },
      { id: "cash", name: "เงินสด", icon: "📺", balance: 800, color: "#d9f6e9" },
      { id: "saving", name: "เงินออม", icon: "🪣", balance: 81000.88, color: "#ffe1d3" },
      { id: "test", name: "ทดสอบบัญชีจ้า", icon: "👛", balance: 15694, color: "#ffe4e6" },
      { id: "wallet", name: "เงินสดล", icon: "📼", balance: 5445.573, color: "#def4e9" },
      { id: "credit", name: "บัตรเครดิต", icon: "💳", balance: -26500, color: "#ece8ff", liability: true }
    ],
    transactions: [
      { id: "tx_1", type: "expense", title: "ข้าวหน้าไก่ทอดซอส", categoryId: "food", walletId: "daily", amount: 119, date: today, note: "มื้อกลางวัน", source: "manual" },
      { id: "tx_2", type: "expense", title: "กาแฟฟาฟา", categoryId: "coffee", walletId: "daily", amount: 85, date: today, note: "แก้วเช้า", source: "manual" },
      { id: "tx_3", type: "expense", title: "เติมเงินรถไฟฟ้า", categoryId: "travel", walletId: "daily", amount: 250, date: today, note: "", source: "bank" },
      { id: "tx_4", type: "expense", title: "ของใช้ในบ้าน", categoryId: "daily", walletId: "daily", amount: 161, date: today, note: "", source: "manual" },
      { id: "tx_5", type: "transfer", title: "โอนเข้าเงินออม", categoryId: "transfer", walletId: "saving", amount: 500, date: today, note: "", source: "manual" },
      { id: "tx_6", type: "income", title: "รายได้เสริม", categoryId: "salary", walletId: "cash", amount: 1200, date: offsetDate(-2), note: "", source: "manual" },
      { id: "tx_7", type: "expense", title: "สังสรรค์กับเพื่อน", categoryId: "fun", walletId: "credit", amount: 1863.667, date: offsetDate(-5), note: "", source: "bank" },
      { id: "tx_8", type: "expense", title: "เสื้อผ้า", categoryId: "clothes", walletId: "daily", amount: 740, date: offsetDate(-7), note: "", source: "manual" },
      { id: "tx_9", type: "expense", title: "ค่าไฟฟ้า", categoryId: "electric", walletId: "daily", amount: 920, date: offsetDate(-10), note: "", source: "bank" }
    ],
    budgets: [
      { id: "b_food", categoryId: "food", amount: 6500 },
      { id: "b_travel", categoryId: "travel", amount: 2200 },
      { id: "b_fun", categoryId: "fun", amount: 3500 },
      { id: "b_daily", categoryId: "daily", amount: 2800 },
      { id: "b_coffee", categoryId: "coffee", amount: 1200 }
    ],
    goals: [
      { id: "g_1", name: "เงินสำรอง 6 เดือน", icon: "🛟", target: 180000, saved: 81000.88, due: "ธ.ค. 2569" },
      { id: "g_2", name: "ทริปญี่ปุ่น", icon: "✈️", target: 65000, saved: 18750, due: "เม.ย. 2570" },
      { id: "g_3", name: "คอมใหม่", icon: "💻", target: 42000, saved: 14300, due: "ก.ย. 2569" }
    ],
    loans: [
      {
        id: "loan_1",
        name: "ผ่อนบ้านสาริน",
        group: "บ้าน",
        asset: "ยานพาหนะ",
        icon: "🏠",
        principal: 50000,
        paidPrincipal: 8291.667,
        interestPaid: 4807.292,
        totalInterest: 6125,
        rate: 6,
        nextPayment: 1250.208,
        totalTerms: 48,
        paidTerms: 26
      },
      {
        id: "loan_2",
        name: "ผ่อนชำระธุรกิจ",
        group: "ธุรกิจ",
        asset: "อุปกรณ์",
        icon: "💸",
        principal: 12000,
        paidPrincipal: 5058,
        interestPaid: 430,
        totalInterest: 900,
        rate: 4.5,
        nextPayment: 890,
        totalTerms: 18,
        paidTerms: 7
      }
    ],
    customCategories: [],
    allocations: [
      { id: "a_need", name: "ใช้จำเป็น", percent: 50, color: "#bfd17f" },
      { id: "a_want", name: "อยากได้", percent: 30, color: "#ffc022" },
      { id: "a_save", name: "ออม/ลงทุน", percent: 20, color: "#ff7ca8" }
    ],
    expectedIncome: 45000,
    dailyLimit: 700
  };
}
