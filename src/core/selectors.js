import { categories } from "../data/categories.js";
import { inCurrentMonth, toISODate } from "../utils/date.js";

export function allCategories(state) {
  return [...categories, ...(state.customCategories || [])];
}

export function getCategory(state, id) {
  return allCategories(state).find((category) => category.id === id) || categories[0];
}

function isPosted(transaction) {
  return !transaction.status || transaction.status === "posted";
}

export function assetTotal(state) {
  return state.wallets.filter((wallet) => !wallet.liability).reduce((sum, wallet) => sum + wallet.balance, 0);
}

export function totalByType(state, type, period = "all") {
  return state.transactions
    .filter(isPosted)
    .filter((tx) => tx.type === type)
    .filter((tx) => (period === "today" ? tx.date === toISODate(new Date()) : true))
    .reduce((sum, tx) => sum + tx.amount, 0);
}

export function expenseByCategory(state) {
  const map = new Map();

  state.transactions
    .filter(isPosted)
    .filter((tx) => tx.type === "expense" && inCurrentMonth(tx.date))
    .forEach((tx) => {
      const splits = Array.isArray(tx.splits) && tx.splits.length ? tx.splits : [{ categoryId: tx.categoryId, amount: tx.amount }];
      splits.forEach((split) => {
        const category = getCategory(state, split.categoryId);
        const row = map.get(category.id) || { ...category, amount: 0 };
        row.amount += Number(split.amount) || 0;
        map.set(category.id, row);
      });
    });

  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

export function donutStops(rows, total) {
  if (!total || !rows.length) return "#ece7df 0% 100%";

  let cursor = 0;
  return rows.map((row) => {
    const start = cursor;
    cursor += (row.amount / total) * 100;
    return `${row.color} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
  }).join(", ");
}
