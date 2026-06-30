export function formatMoney(value) {
  return `${new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  }).format(Number(value) || 0)} บาท`;
}

export function formatMoneyNumber(value) {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  }).format(Number(value) || 0);
}

export function formatMoneyHtml(value) {
  return `<span class="money-inline"><span class="money-number">${formatMoneyNumber(value)}</span><span class="money-unit">บาท</span></span>`;
}

export function formatPercent(value) {
  return `${new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 1
  }).format((Number(value) || 0) * 100)}%`;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}
