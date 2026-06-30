import { getCategory } from "./selectors.js";
import { toISODate } from "../utils/date.js";

export const defaultTransactionAdvancedFilters = {
  walletId: "all",
  categoryId: "all",
  status: "all",
  minAmount: "",
  maxAmount: "",
  dateFrom: "",
  dateTo: "",
  tag: ""
};

export const defaultQuickAdd = {
  walletId: "daily",
  categoryId: "food"
};

export function parseTags(value) {
  if (Array.isArray(value)) return [...new Set(value.map((tag) => String(tag).trim()).filter(Boolean))];
  return [...new Set(String(value || "")
    .split(/[,\s#]+/)
    .map((tag) => tag.trim())
    .filter(Boolean))];
}

function normalizeSplits(splits) {
  if (!Array.isArray(splits)) return [];
  return splits
    .map((split) => ({
      categoryId: String(split.categoryId || "food"),
      amount: Number(split.amount) || 0
    }))
    .filter((split) => split.categoryId && split.amount > 0);
}

function normalizeAttachments(attachments) {
  if (!Array.isArray(attachments)) return [];
  return attachments
    .map((attachment) => ({
      id: String(attachment.id || ""),
      name: String(attachment.name || ""),
      type: String(attachment.type || "note")
    }))
    .filter((attachment) => attachment.name);
}

export function normalizeTransaction(transaction = {}) {
  const type = String(transaction.type || "expense");
  const status = String(transaction.status || "posted");
  const date = String(transaction.date || toISODate(new Date()));

  return {
    id: String(transaction.id || ""),
    type,
    title: String(transaction.title || ""),
    categoryId: String(transaction.categoryId || (type === "income" ? "salary" : type === "transfer" ? "transfer" : "food")),
    walletId: String(transaction.walletId || "daily"),
    toWalletId: String(transaction.toWalletId || transaction.transferToWalletId || ""),
    amount: Number(transaction.amount) || 0,
    fee: Number(transaction.fee) || 0,
    date,
    time: String(transaction.time || ""),
    note: String(transaction.note || ""),
    merchant: String(transaction.merchant || ""),
    location: String(transaction.location || ""),
    status: ["posted", "pending", "scheduled"].includes(status) ? status : "posted",
    source: String(transaction.source || "manual"),
    provider: String(transaction.provider || ""),
    externalId: String(transaction.externalId || transaction.bankTransactionId || ""),
    currency: String(transaction.currency || "THB"),
    tags: parseTags(transaction.tags || []),
    attachments: normalizeAttachments(transaction.attachments),
    splits: normalizeSplits(transaction.splits)
  };
}

export function transactionAffectsBalance(transaction) {
  return !transaction.status || transaction.status === "posted";
}

function findWallet(state, id) {
  return state.wallets.find((wallet) => wallet.id === id);
}

function addToWallet(state, id, amount) {
  const wallet = findWallet(state, id);
  if (!wallet || Number.isNaN(amount)) return;
  wallet.balance += amount;
}

export function applyTransactionWalletImpact(state, transaction, direction = 1) {
  const tx = normalizeTransaction(transaction);
  if (!transactionAffectsBalance(tx) || tx.amount <= 0) return;

  if (tx.type === "income") {
    addToWallet(state, tx.walletId, tx.amount * direction);
    return;
  }

  if (tx.type === "expense" || tx.type === "payment") {
    addToWallet(state, tx.walletId, -tx.amount * direction);
    return;
  }

  if (tx.type === "transfer") {
    if (tx.toWalletId && tx.toWalletId !== tx.walletId) {
      addToWallet(state, tx.walletId, -(tx.amount + tx.fee) * direction);
      addToWallet(state, tx.toWalletId, tx.amount * direction);
    } else {
      addToWallet(state, tx.walletId, tx.amount * direction);
    }
  }
}

export function splitAmountTotal(transaction) {
  return (transaction.splits || []).reduce((sum, split) => sum + (Number(split.amount) || 0), 0);
}

function includesTerm(value, term) {
  return String(value || "").toLowerCase().includes(term);
}

function transactionSearchText(state, transaction) {
  const tx = normalizeTransaction(transaction);
  const category = getCategory(state, tx.categoryId);
  const wallet = state.wallets.find((item) => item.id === tx.walletId);
  return [
    tx.title,
    tx.note,
    tx.merchant,
    tx.location,
    tx.source,
    tx.status,
    tx.provider,
    tx.externalId,
    category?.name,
    wallet?.name,
    tx.tags.join(" ")
  ].join(" ");
}

export function matchesTransactionFilters(state, transaction) {
  const tx = normalizeTransaction(transaction);
  const filters = { ...defaultTransactionAdvancedFilters, ...(state.transactionAdvancedFilters || {}) };
  const term = String(state.transactionSearch || "").trim().toLowerCase();

  if (state.transactionFilter && state.transactionFilter !== "all" && tx.type !== state.transactionFilter) return false;
  if (term && !includesTerm(transactionSearchText(state, tx), term)) return false;
  if (filters.walletId !== "all" && tx.walletId !== filters.walletId && tx.toWalletId !== filters.walletId) return false;
  if (filters.categoryId !== "all" && tx.categoryId !== filters.categoryId && !(tx.splits || []).some((split) => split.categoryId === filters.categoryId)) return false;
  if (filters.status !== "all" && tx.status !== filters.status) return false;
  if (filters.minAmount && tx.amount < Number(filters.minAmount)) return false;
  if (filters.maxAmount && tx.amount > Number(filters.maxAmount)) return false;
  if (filters.dateFrom && tx.date < filters.dateFrom) return false;
  if (filters.dateTo && tx.date > filters.dateTo) return false;
  if (filters.tag && !tx.tags.some((tag) => tag.toLowerCase().includes(String(filters.tag).toLowerCase()))) return false;

  return true;
}

export function filteredTransactions(state) {
  return (state.transactions || []).filter((transaction) => matchesTransactionFilters(state, transaction));
}
