export const APP_VERSION = "5";
export const STORAGE_KEY = "lip-in-money-state-v5";

export const topViews = [
  { id: "overview", label: "ภาพรวม" },
  { id: "reports", label: "สรุปรายงาน" },
  { id: "budget", label: "งบประมาณ" },
  { id: "loans", label: "ผ่อนชำระ" },
  { id: "goals", label: "เป้าหมาย" },
  { id: "menu", label: "เมนู" }
];

export const bottomViews = [
  { id: "overview", label: "ภาพรวม", icon: "📊" },
  { id: "transactions", label: "ธุรกรรม", icon: "🧾" },
  { id: "add", label: "", icon: "" },
  { id: "wallets", label: "กระเป๋า", icon: "👛" },
  { id: "menu", label: "เมนู", icon: "▦" }
];

export const reportTabs = [
  { id: "category", label: "ตามหมวดหมู่" },
  { id: "networth", label: "ทรัพย์สินสุทธิ" },
  { id: "time", label: "ตามช่วงเวลา" },
  { id: "tag", label: "ตามแท็ก" }
];

export const reportRanges = [
  { id: "month", label: "เดือนนี้" },
  { id: "weeks12", label: "12 สัปดาห์ที่ผ่านมา" },
  { id: "year", label: "ปีนี้" },
  { id: "all", label: "ทุกกระเป๋า" }
];

export const transactionFilters = [
  { id: "all", label: "ทุกประเภท" },
  { id: "expense", label: "รายจ่าย" },
  { id: "income", label: "รายรับ" },
  { id: "transfer", label: "โอนเงิน" }
];
