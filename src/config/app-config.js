export const APP_VERSION = "6";
export const STORAGE_KEY = "lip-in-money-state";
export const LEGACY_STORAGE_KEYS = [
  "lip-in-money-state-v5",
  "lip-in-money-state-v1"
];

export const topViews = [
  { id: "overview", label: "ภาพรวม" },
  { id: "reports", label: "รายงาน" },
  { id: "budget", label: "งบประมาณ" },
  { id: "loans", label: "ผ่อนชำระ" },
  { id: "goals", label: "เป้าหมาย" }
];

export const bottomViews = [
  { id: "overview", label: "ภาพรวม", icon: "📊" },
  { id: "transactions", label: "รายการ", icon: "🧾" },
  { id: "add", label: "", icon: "" },
  { id: "wallets", label: "กระเป๋า", icon: "👛" },
  { id: "menu", label: "เมนู", icon: "▦" }
];

export const reportTabs = [
  { id: "category", label: "หมวดหมู่" },
  { id: "networth", label: "ทรัพย์สินสุทธิ" },
  { id: "time", label: "ช่วงเวลา" },
  { id: "source", label: "ช่องทางบันทึก" }
];

export const reportRanges = [
  { id: "month", label: "เดือนนี้" },
  { id: "weeks12", label: "12 สัปดาห์" },
  { id: "year", label: "ปีนี้" },
  { id: "all", label: "ทุกกระเป๋า" }
];

export const transactionFilters = [
  { id: "all", label: "ทั้งหมด" },
  { id: "expense", label: "รายจ่าย" },
  { id: "income", label: "รายรับ" },
  { id: "transfer", label: "โอนเงิน" },
  { id: "payment", label: "ชำระ" }
];
