const CATEGORY_RULES = [
  { categoryId: "coffee", terms: ["coffee", "cafe", "กาแฟ", "คาเฟ่"] },
  { categoryId: "food", terms: ["food", "restaurant", "7-eleven", "7 eleven", "lotus", "big c", "อาหาร", "ร้าน", "ข้าว"] },
  { categoryId: "travel", terms: ["bts", "mrt", "grab", "taxi", "travel", "เดินทาง", "รถไฟ", "แท็กซี่"] },
  { categoryId: "electric", terms: ["electric", "mea", "pea", "ไฟฟ้า", "ค่าไฟ"] },
  { categoryId: "salary", terms: ["salary", "payroll", "เงินเดือน"] },
  { categoryId: "transfer", terms: ["transfer", "promptpay", "พร้อมเพย์", "โอน"] }
];

const HEADER_ALIASES = {
  date: ["date", "posted date", "transaction date", "วันที่", "วันทำรายการ"],
  time: ["time", "เวลา"],
  description: ["description", "details", "narration", "memo", "name", "รายการ", "รายละเอียด", "คำอธิบาย"],
  debit: ["debit", "withdrawal", "paid out", "money out", "เงินออก", "ถอน", "จ่าย"],
  credit: ["credit", "deposit", "paid in", "money in", "เงินเข้า", "ฝาก", "รับ"],
  amount: ["amount", "transaction amount", "จำนวนเงิน", "ยอดเงิน"],
  balance: ["balance", "คงเหลือ", "ยอดคงเหลือ"],
  account: ["account", "account id", "account number", "บัญชี", "เลขบัญชี"],
  reference: ["transaction id", "reference", "ref", "เลขที่รายการ", "อ้างอิง"]
};

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => String(value).trim())) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => String(value).trim())) rows.push(row);
  return rows;
}

function buildHeaderMap(headers) {
  const normalized = headers.map(normalizeHeader);
  return Object.fromEntries(Object.entries(HEADER_ALIASES).map(([key, aliases]) => {
    const index = normalized.findIndex((header) => aliases.some((alias) => header === normalizeHeader(alias) || header.includes(normalizeHeader(alias))));
    return [key, index];
  }));
}

function valueAt(row, headerMap, key) {
  const index = headerMap[key];
  return index >= 0 ? String(row[index] || "").trim() : "";
}

function parseMoney(value) {
  const normalized = String(value || "")
    .replace(/[,\s฿บาท]/g, "")
    .replace(/[()]/g, (match) => match === "(" ? "-" : "")
    .replace(/[^\d.-]/g, "");
  return Number(normalized) || 0;
}

function parseStatementDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return new Date().toISOString().slice(0, 10);

  const iso = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;

  const local = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (local) {
    let year = Number(local[3]);
    if (year < 100) year += 2000;
    if (year > 2400) year -= 543;
    return `${year}-${local[2].padStart(2, "0")}-${local[1].padStart(2, "0")}`;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
}

function stableId(parts) {
  const input = parts.join("|");
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(index)) | 0;
  }
  return `stmt_${Math.abs(hash).toString(36)}`;
}

export function guessCategoryId(text, type = "expense") {
  const haystack = String(text || "").toLowerCase();
  const match = CATEGORY_RULES.find((rule) => rule.terms.some((term) => haystack.includes(term.toLowerCase())));
  if (match) return match.categoryId;
  if (type === "income") return "salary";
  if (type === "transfer") return "transfer";
  return "daily";
}

export function parseBankStatementCsv(text, defaults = {}) {
  const rows = parseCsvRows(String(text || "").replace(/^\uFEFF/, ""));
  if (rows.length < 2) return { transactions: [], errors: ["ไฟล์ไม่มีข้อมูลรายการ"] };

  const [headers, ...dataRows] = rows;
  const headerMap = buildHeaderMap(headers);
  const errors = [];

  if (headerMap.date < 0) errors.push("ไม่พบคอลัมน์วันที่");
  if (headerMap.description < 0 && headerMap.reference < 0) errors.push("ไม่พบคอลัมน์รายละเอียด/อ้างอิง");
  if (headerMap.amount < 0 && headerMap.debit < 0 && headerMap.credit < 0) errors.push("ไม่พบคอลัมน์จำนวนเงิน");
  if (errors.length) return { transactions: [], errors };

  const transactions = dataRows.map((row) => {
    const description = valueAt(row, headerMap, "description") || valueAt(row, headerMap, "reference") || "Bank transaction";
    const reference = valueAt(row, headerMap, "reference");
    const date = parseStatementDate(valueAt(row, headerMap, "date"));
    const time = valueAt(row, headerMap, "time");
    const account = valueAt(row, headerMap, "account");
    const debit = parseMoney(valueAt(row, headerMap, "debit"));
    const credit = parseMoney(valueAt(row, headerMap, "credit"));
    const signedAmount = headerMap.amount >= 0 ? parseMoney(valueAt(row, headerMap, "amount")) : credit - debit;
    const isTransfer = /transfer|promptpay|พร้อมเพย์|โอน/i.test(description);
    const type = isTransfer ? "transfer" : signedAmount < 0 || debit > 0 ? "expense" : "income";
    const amount = Math.abs(signedAmount || debit || credit);
    const externalId = reference || stableId([date, time, description, amount, account]);

    return {
      externalId,
      provider: defaults.provider || "statement",
      source: "bank-import",
      status: "posted",
      type,
      title: description,
      merchant: description,
      categoryId: guessCategoryId(description, type),
      walletId: defaults.walletId || "daily",
      amount,
      date,
      time,
      note: account ? `Statement account: ${account}` : "Imported bank statement",
      tags: ["bank", "statement"]
    };
  }).filter((transaction) => transaction.amount > 0);

  return { transactions, errors: [] };
}
