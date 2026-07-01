import { getCategory } from "../core/selectors.js";
import { resetState } from "../core/store.js";
import { applyTransactionWalletImpact, defaultTransactionAdvancedFilters, defaultQuickAdd, normalizeTransaction, parseTags, splitAmountTotal } from "../core/transactions.js";
import { parseBankStatementCsv } from "../integrations/bank-import.js";
import { readThaiSlipFiles } from "../integrations/thai-slip.js";
import { toISODate } from "../utils/date.js";
import { downloadFile } from "../utils/download.js";
import { csvCell, formatMoney, makeId } from "../utils/format.js";
import { typeLabel } from "../ui/components.js";
import {
  renderAllocationSheet,
  renderBankSheet,
  renderBudgetSheet,
  renderCategorySheet,
  renderGoalDepositSheet,
  renderGoalSheet,
  renderInstallGuideSheet,
  renderLoanSheet,
  renderTransactionSheet,
  renderWalletSheet
} from "../ui/sheets.js";

export function createActions({
  getState,
  setState,
  save,
  render,
  openSheet,
  closeSheet,
  toast,
  checkForAppUpdate,
  getDeferredInstallPrompt,
  setDeferredInstallPrompt
}) {
  function commit(message, nextView = null, shouldCloseSheet = true) {
    const state = getState();
    if (nextView) state.view = nextView;
    save();
    if (shouldCloseSheet) closeSheet();
    render();
    if (message) toast(message);
  }

  function openTransaction(defaultType = "expense", transaction = null) {
    openSheet(renderTransactionSheet(getState(), defaultType, transaction));
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function rememberUndo(entry) {
    const state = getState();
    state.undoStack = [entry, ...(state.undoStack || [])].slice(0, 8);
  }

  function applyWalletChange(walletId, type, amount) {
    applyTransactionWalletImpact(getState(), { walletId, type, amount, status: "posted" });
  }

  function revertWalletChange(walletId, type, amount) {
    applyTransactionWalletImpact(getState(), { walletId, type, amount, status: "posted" }, -1);
  }

  function upsertExternalTransaction(transaction) {
    const state = getState();
    const tx = normalizeTransaction(transaction);
    if (!tx.externalId || !tx.amount) return "skipped";

    const existingIndex = state.transactions.findIndex((item) => {
      const existing = normalizeTransaction(item);
      return existing.externalId === tx.externalId && existing.provider === tx.provider;
    });

    if (existingIndex >= 0) {
      const oldTx = normalizeTransaction(state.transactions[existingIndex]);
      applyTransactionWalletImpact(state, oldTx, -1);
      state.transactions.splice(existingIndex, 1, tx);
      applyTransactionWalletImpact(state, tx);
      return "updated";
    }

    state.transactions.unshift(tx);
    applyTransactionWalletImpact(state, tx);
    return "inserted";
  }

  function importStatementTransactions(transactions = []) {
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    transactions.forEach((transaction) => {
      const result = upsertExternalTransaction(normalizeTransaction({
        ...transaction,
        walletId: transaction.walletId || defaultQuickAdd.walletId,
        provider: "thai-statement",
        source: "bank-import"
      }));
      if (result === "inserted") inserted += 1;
      else if (result === "updated") updated += 1;
      else skipped += 1;
    });

    return { inserted, updated, skipped };
  }

  function parseSplits(data) {
    const categories = data.getAll("splitCategoryId");
    const amounts = data.getAll("splitAmount");
    return categories
      .map((categoryId, index) => ({
        categoryId: String(categoryId || "food"),
        amount: Number(amounts[index]) || 0
      }))
      .filter((split) => split.categoryId && split.amount > 0);
  }

  function parseAttachments(data, previous = []) {
    const attachmentName = String(data.get("attachmentName") || "").trim();
    if (!attachmentName) return previous || [];
    return [
      ...(previous || []),
      { id: makeId("att"), name: attachmentName, type: "note" }
    ];
  }

  function slipTodoById(id) {
    return (getState().slipTodos || []).find((todo) => todo.id === id);
  }

  function completeSlipTodo(id, transactionId) {
    if (!id) return;
    const todo = slipTodoById(id);
    if (!todo) return;
    todo.status = "done";
    todo.transactionId = transactionId;
    todo.completedAt = new Date().toISOString();
  }

  function openSlipTodo(id) {
    const todo = slipTodoById(id);
    if (!todo) return toast("ไม่พบสลิปใน To do");

    const attachmentName = [todo.fileName, todo.reference].filter(Boolean).join(" · ");
    openSheet(renderTransactionSheet(getState(), "expense", {
      id: "",
      slipTodoId: todo.id,
      type: "expense",
      title: todo.recipient ? `โอนเงินให้ ${todo.recipient}` : "สลิปโอนเงิน",
      amount: todo.amount || "",
      date: todo.date || toISODate(new Date()),
      categoryId: "transfer",
      walletId: defaultQuickAdd.walletId,
      status: "pending",
      merchant: todo.recipient || "",
      tags: ["slip", "thai-bank"],
      attachments: attachmentName ? [{ id: todo.id, name: attachmentName, type: "slip" }] : [],
      note: [
        "นำเข้าจากสลิปธนาคารไทย",
        todo.reference ? `เลขอ้างอิง: ${todo.reference}` : "",
        todo.qrStatus && todo.qrStatus !== "read" ? `QR: ${todo.qrStatus}` : ""
      ].filter(Boolean).join("\n")
    }));
  }

  function deleteSlipTodo(id) {
    const state = getState();
    const index = (state.slipTodos || []).findIndex((todo) => todo.id === id);
    if (index < 0) return toast("ไม่พบสลิปนี้");
    state.slipTodos.splice(index, 1);
    state.slipInbox.needsReviewCount = state.slipTodos.filter((todo) => todo.status !== "done").length;
    commit("ลบสลิปออกจาก To do แล้ว", null, false);
  }

  function handleTransactionSubmit(form) {
    const state = getState();
    const data = new FormData(form);
    const id = String(data.get("id") || "");
    const type = String(data.get("type") || "expense");
    const amount = Number(data.get("amount"));
    const walletId = String(data.get("walletId") || "daily");

    if (!amount || amount <= 0) {
      toast("ใส่จำนวนเงินก่อนนะ");
      return;
    }

    const tx = {
      id: id || makeId("tx"),
      type,
      title: String(data.get("title") || typeLabel(type)).trim(),
      categoryId: String(data.get("categoryId") || "food"),
      walletId,
      amount,
      date: String(data.get("date") || toISODate(new Date())),
      note: String(data.get("note") || ""),
      source: "manual"
    };

    const existingIndex = state.transactions.findIndex((item) => item.id === id);
    if (existingIndex >= 0) {
      const oldTx = state.transactions[existingIndex];
      revertWalletChange(oldTx.walletId, oldTx.type, oldTx.amount);
      state.transactions.splice(existingIndex, 1);
    }

    state.transactions.unshift(tx);
    applyWalletChange(walletId, type, amount);
    commit(id ? "แก้ไขรายการแล้ว" : "บันทึกรายการแล้ว");
  }

  function buildTransactionFromForm(data, existing = null) {
    const id = String(data.get("id") || "");
    const slipTodoId = String(data.get("slipTodoId") || "");
    const type = String(data.get("type") || "expense");
    const amount = Number(data.get("amount"));
    const walletId = String(data.get("walletId") || defaultQuickAdd.walletId);
    const splits = parseSplits(data);
    const attachmentName = String(data.get("attachmentName") || "").trim();
    const existingAttachmentName = (existing?.attachments || []).map((item) => item.name).join(", ");

    return normalizeTransaction({
      id: id || makeId("tx"),
      type,
      title: String(data.get("title") || typeLabel(type)).trim(),
      categoryId: String(data.get("categoryId") || (type === "income" ? "salary" : type === "transfer" ? "transfer" : defaultQuickAdd.categoryId)),
      walletId,
      toWalletId: type === "transfer" ? String(data.get("toWalletId") || "") : "",
      amount,
      fee: type === "transfer" ? Number(data.get("fee")) || 0 : 0,
      date: String(data.get("date") || toISODate(new Date())),
      time: String(data.get("time") || ""),
      note: String(data.get("note") || ""),
      merchant: String(data.get("merchant") || ""),
      location: String(data.get("location") || ""),
      status: String(data.get("status") || "posted"),
      source: existing?.source || (slipTodoId ? "slip" : "manual"),
      tags: parseTags(data.get("tags")),
      attachments: attachmentName && attachmentName !== existingAttachmentName ? parseAttachments(data, existing?.attachments || []) : existing?.attachments || [],
      splits
    });
  }

  function handleTransactionSubmitV2(form) {
    const state = getState();
    const data = new FormData(form);
    const id = String(data.get("id") || "");
    const amount = Number(data.get("amount"));

    if (!amount || amount <= 0) {
      toast("ใส่จำนวนเงินก่อนนะ");
      return;
    }

    const existingIndex = state.transactions.findIndex((item) => item.id === id);
    const oldTx = existingIndex >= 0 ? state.transactions[existingIndex] : null;
    const tx = buildTransactionFromForm(data, oldTx);
    const splitTotal = splitAmountTotal(tx);

    if (tx.splits.length && Math.abs(splitTotal - tx.amount) > 0.01) {
      toast("ยอดแยกหมวดต้องเท่ากับยอดรวม");
      return;
    }

    if (existingIndex >= 0) {
      rememberUndo({ kind: "edit-transaction", index: existingIndex, before: clone(oldTx), afterId: tx.id });
      applyTransactionWalletImpact(state, oldTx, -1);
      state.transactions.splice(existingIndex, 1);
    }

    state.transactions.unshift(tx);
    applyTransactionWalletImpact(state, tx);
    completeSlipTodo(String(data.get("slipTodoId") || ""), tx.id);
    commit(id ? "แก้ไขรายการแล้ว" : "บันทึกรายการแล้ว");
  }

  function handleAllocationSubmit(form) {
    const state = getState();
    const data = new FormData(form);
    state.expectedIncome = Number(data.get("expectedIncome")) || state.expectedIncome;
    state.allocations = state.allocations.map((item) => ({ ...item, percent: Number(data.get(item.id)) || 0 }));
    commit("บันทึกสัดส่วนแล้ว");
  }

  function handleBudgetSubmit(form) {
    const state = getState();
    const data = new FormData(form);
    const id = String(data.get("id") || "");
    const categoryId = String(data.get("categoryId") || "food");
    const amount = Number(data.get("amount")) || 0;
    const existing = state.budgets.find((budget) => budget.id === id) || state.budgets.find((budget) => budget.categoryId === categoryId);

    if (existing) {
      existing.categoryId = categoryId;
      existing.amount = amount;
    } else {
      state.budgets.unshift({ id: makeId("budget"), categoryId, amount });
    }

    commit("บันทึกงบประมาณแล้ว", "budget");
  }

  function handleCategorySubmit(form) {
    const state = getState();
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    if (!name) return;

    state.customCategories.unshift({
      id: makeId("cat"),
      name,
      icon: String(data.get("icon") || "✨").trim() || "✨",
      color: String(data.get("color") || "#ffd86b")
    });

    commit("เพิ่มหมวดหมู่แล้ว", "budget");
  }

  function handleWalletSubmit(form) {
    const state = getState();
    const data = new FormData(form);
    const id = String(data.get("id") || "");
    const liability = data.get("kind") === "liability";
    const balance = Math.abs(Number(data.get("balance")) || 0);
    const wallet = {
      id: id || makeId("wallet"),
      name: String(data.get("name") || "กระเป๋าใหม่").trim(),
      icon: String(data.get("icon") || "👛").trim() || "👛",
      balance: liability ? -balance : balance,
      color: String(data.get("color") || "#d5f3ff"),
      liability
    };

    const existingIndex = state.wallets.findIndex((item) => item.id === id);
    if (existingIndex >= 0) state.wallets.splice(existingIndex, 1, wallet);
    else state.wallets.unshift(wallet);

    commit(id ? "แก้ไขกระเป๋าแล้ว" : "เพิ่มกระเป๋าแล้ว", "wallets");
  }

  function handleGoalSubmit(form) {
    const state = getState();
    const data = new FormData(form);
    const id = String(data.get("id") || "");
    const goal = {
      id: id || makeId("goal"),
      name: String(data.get("name") || "เป้าหมายใหม่").trim(),
      icon: String(data.get("icon") || "🎯").trim() || "🎯",
      target: Number(data.get("target")) || 1,
      saved: Number(data.get("saved")) || 0,
      due: String(data.get("due") || "")
    };

    const existingIndex = state.goals.findIndex((item) => item.id === id);
    if (existingIndex >= 0) state.goals.splice(existingIndex, 1, goal);
    else state.goals.unshift(goal);

    commit(id ? "แก้ไขเป้าหมายแล้ว" : "เพิ่มเป้าหมายแล้ว", "goals");
  }

  function handleGoalDepositSubmit(form) {
    const state = getState();
    const data = new FormData(form);
    const goal = state.goals.find((item) => item.id === String(data.get("id") || ""));
    if (!goal) {
      toast("ไม่พบเป้าหมายนี้");
      return;
    }

    goal.saved = Math.min(goal.target, goal.saved + (Number(data.get("amount")) || 0));
    commit("เติมเงินเป้าหมายแล้ว", "goals");
  }

  function handleLoanSubmit(form) {
    const state = getState();
    const data = new FormData(form);
    const id = String(data.get("id") || "");
    const principal = Number(data.get("principal")) || 1;
    const paidPrincipal = Number(data.get("paidPrincipal")) || 0;
    const totalTerms = Number(data.get("totalTerms")) || 12;
    const paidTerms = Number(data.get("paidTerms")) || 0;
    const rate = Number(data.get("rate")) || 0;
    const loan = {
      id: id || makeId("loan"),
      name: String(data.get("name") || "ผ่อนชำระใหม่").trim(),
      group: "ส่วนตัว",
      asset: "ทรัพย์สิน",
      icon: String(data.get("icon") || "🏠").trim() || "🏠",
      principal,
      paidPrincipal,
      interestPaid: Math.round((paidPrincipal * rate) / 100),
      totalInterest: Math.round((principal * rate) / 100),
      rate,
      nextPayment: Math.max(Math.round((principal - paidPrincipal) / Math.max(totalTerms - paidTerms, 1)), 0),
      totalTerms,
      paidTerms: Math.min(paidTerms, totalTerms)
    };

    const existingIndex = state.loans.findIndex((item) => item.id === id);
    if (existingIndex >= 0) state.loans.splice(existingIndex, 1, loan);
    else state.loans.unshift(loan);

    commit(id ? "แก้ไขผ่อนชำระแล้ว" : "เพิ่มผ่อนชำระแล้ว", "loans");
  }

  function handleSubmit(form) {
    if (form.matches("#transaction-form")) handleTransactionSubmitV2(form);
    if (form.matches("#allocation-form")) handleAllocationSubmit(form);
    if (form.matches("#budget-form")) handleBudgetSubmit(form);
    if (form.matches("#category-form")) handleCategorySubmit(form);
    if (form.matches("#wallet-form")) handleWalletSubmit(form);
    if (form.matches("#goal-form")) handleGoalSubmit(form);
    if (form.matches("#goal-deposit-form")) handleGoalDepositSubmit(form);
    if (form.matches("#loan-form")) handleLoanSubmit(form);
  }

  function handleAppSubmit(form) {
    if (!form?.matches?.("#transaction-filter-form")) return;
    const state = getState();
    const data = new FormData(form);

    state.transactionSearch = String(data.get("search") || "").trim();
    state.transactionAdvancedFilters = {
      ...defaultTransactionAdvancedFilters,
      walletId: String(data.get("walletId") || "all"),
      categoryId: String(data.get("categoryId") || "all"),
      status: String(data.get("status") || "all"),
      minAmount: String(data.get("minAmount") || ""),
      maxAmount: String(data.get("maxAmount") || ""),
      dateFrom: String(data.get("dateFrom") || ""),
      dateTo: String(data.get("dateTo") || ""),
      tag: String(data.get("tag") || "").trim()
    };

    commit("กรองรายการแล้ว", null, false);
  }

  function handleReceiptImage(file) {
    const thumb = document.querySelector("#receipt-thumb");
    if (!file || !thumb) return;
    const url = URL.createObjectURL(file);
    thumb.innerHTML = `<img src="${url}" alt="รูปใบเสร็จ">`;
  }

  function exportJson() {
    downloadFile(`lip-in-money-${toISODate(new Date())}.json`, JSON.stringify(getState(), null, 2), "application/json");
    toast("ส่งออก JSON แล้ว");
  }

  function exportCsv() {
    const state = getState();
    const rows = [
      ["date", "time", "type", "status", "title", "merchant", "category", "wallet", "amount", "source", "provider", "external_id", "tags", "note"],
      ...state.transactions.map((tx) => {
        const category = getCategory(state, tx.categoryId);
        const wallet = state.wallets.find((item) => item.id === tx.walletId);
        return [tx.date, tx.time || "", tx.type, tx.status || "posted", tx.title, tx.merchant || "", category.name, wallet?.name || "", tx.amount, tx.source, tx.provider || "", tx.externalId || "", (tx.tags || []).join("|"), tx.note || ""];
      })
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    downloadFile(`lip-in-transactions-${toISODate(new Date())}.csv`, `\uFEFF${csv}`, "text/csv;charset=utf-8");
    toast("ส่งออก CSV แล้ว");
  }

  function quickAdd(button) {
    const state = getState();
    const amount = Number(button?.dataset?.amount);
    if (!amount || amount <= 0) return toast("ยังไม่พบยอดบันทึกเร็ว");

    const now = new Date();
    const quick = { ...defaultQuickAdd, ...(state.quickAdd || {}) };
    const tx = normalizeTransaction({
      id: makeId("quick"),
      type: "expense",
      title: `บันทึกเร็ว ${formatMoney(amount)}`,
      categoryId: button?.dataset?.categoryId || quick.categoryId,
      walletId: button?.dataset?.walletId || quick.walletId,
      amount,
      date: toISODate(now),
      time: now.toTimeString().slice(0, 5),
      note: "Quick Add",
      status: "posted",
      source: "manual",
      tags: ["quick"]
    });

    state.transactions.unshift(tx);
    applyTransactionWalletImpact(state, tx);
    commit(`บันทึกเร็ว ${formatMoney(amount)} แล้ว`, null, false);
  }

  function duplicateTransaction(id) {
    const tx = getState().transactions.find((item) => item.id === id);
    if (!tx) return toast("ไม่พบรายการนี้");
    const draft = normalizeTransaction({ ...clone(tx), id: "", date: toISODate(new Date()), source: "manual" });
    openSheet(renderTransactionSheet(getState(), draft.type, draft));
  }

  function undoLastTransaction() {
    const state = getState();
    const [entry, ...rest] = state.undoStack || [];
    if (!entry) return toast("ไม่มีรายการให้ย้อนกลับ");

    if (entry.kind === "delete-transaction") {
      const tx = normalizeTransaction(entry.transaction);
      state.transactions.splice(Math.min(entry.index, state.transactions.length), 0, tx);
      applyTransactionWalletImpact(state, tx);
      state.undoStack = rest;
      commit("ย้อนกลับรายการที่ลบแล้ว", null, false);
      return;
    }

    if (entry.kind === "edit-transaction") {
      const currentIndex = state.transactions.findIndex((item) => item.id === entry.afterId);
      if (currentIndex >= 0) {
        applyTransactionWalletImpact(state, state.transactions[currentIndex], -1);
        state.transactions.splice(currentIndex, 1);
      }
      const oldTx = normalizeTransaction(entry.before);
      state.transactions.splice(Math.min(entry.index, state.transactions.length), 0, oldTx);
      applyTransactionWalletImpact(state, oldTx);
      state.undoStack = rest;
      commit("ย้อนกลับการแก้ไขแล้ว", null, false);
    }
  }

  function clearTransactionFilters() {
    const state = getState();
    state.transactionSearch = "";
    state.transactionAdvancedFilters = { ...defaultTransactionAdvancedFilters };
    state.transactionFilter = "all";
    commit("ล้างตัวกรองแล้ว", null, false);
  }

  function editTransaction(id) {
    const tx = getState().transactions.find((item) => item.id === id);
    if (!tx) return toast("ไม่พบรายการนี้");
    openTransaction(tx.type, tx);
  }

  function deleteTransaction(id) {
    const state = getState();
    const index = state.transactions.findIndex((item) => item.id === id);
    if (index < 0) return toast("ไม่พบรายการนี้");
    const [tx] = state.transactions.splice(index, 1);
    rememberUndo({ kind: "delete-transaction", index, transaction: clone(tx) });
    applyTransactionWalletImpact(state, tx, -1);
    commit("ลบรายการแล้ว", null, false);
  }

  function editBudget(id) {
    const budget = getState().budgets.find((item) => item.id === id);
    if (!budget) return toast("ไม่พบงบนี้");
    openSheet(renderBudgetSheet(getState(), budget));
  }

  function deleteBudget(id) {
    const state = getState();
    const index = state.budgets.findIndex((item) => item.id === id);
    if (index < 0) return toast("ไม่พบงบนี้");
    state.budgets.splice(index, 1);
    commit("ลบงบประมาณแล้ว", null, false);
  }

  function editWallet(id) {
    const wallet = getState().wallets.find((item) => item.id === id);
    if (!wallet) return toast("ไม่พบกระเป๋านี้");
    openSheet(renderWalletSheet(wallet));
  }

  function deleteWallet(id) {
    const state = getState();
    if (state.transactions.some((tx) => tx.walletId === id)) {
      toast("ลบไม่ได้ เพราะมีธุรกรรมในกระเป๋านี้");
      return;
    }
    const index = state.wallets.findIndex((item) => item.id === id);
    if (index < 0) return toast("ไม่พบกระเป๋านี้");
    state.wallets.splice(index, 1);
    commit("ลบกระเป๋าแล้ว", null, false);
  }

  function editGoal(id) {
    const goal = getState().goals.find((item) => item.id === id);
    if (!goal) return toast("ไม่พบเป้าหมายนี้");
    openSheet(renderGoalSheet(goal));
  }

  function depositGoal(id) {
    const goal = getState().goals.find((item) => item.id === id);
    if (!goal) return toast("ไม่พบเป้าหมายนี้");
    openSheet(renderGoalDepositSheet(goal));
  }

  function deleteGoal(id) {
    const state = getState();
    const index = state.goals.findIndex((item) => item.id === id);
    if (index < 0) return toast("ไม่พบเป้าหมายนี้");
    state.goals.splice(index, 1);
    commit("ลบเป้าหมายแล้ว", null, false);
  }

  function editLoan(id) {
    const loan = getState().loans.find((item) => item.id === id);
    if (!loan) return toast("ไม่พบรายการผ่อนชำระนี้");
    openSheet(renderLoanSheet(loan));
  }

  function payLoan(id) {
    const loan = getState().loans.find((item) => item.id === id);
    if (!loan) return toast("ไม่พบรายการผ่อนชำระนี้");
    if (loan.paidTerms >= loan.totalTerms) return toast("รายการนี้ผ่อนครบแล้ว");

    const balance = Math.max(loan.principal - loan.paidPrincipal, 0);
    const remainingTerms = Math.max(loan.totalTerms - loan.paidTerms, 1);
    const principalPart = Math.min(balance, loan.nextPayment || Math.round(balance / remainingTerms));
    loan.paidTerms += 1;
    loan.paidPrincipal = Math.min(loan.principal, loan.paidPrincipal + principalPart);
    loan.interestPaid += Math.round((principalPart * loan.rate) / 100 / 12);
    loan.nextPayment = Math.max(Math.round((loan.principal - loan.paidPrincipal) / Math.max(loan.totalTerms - loan.paidTerms, 1)), 0);
    commit("บันทึกจ่ายงวดแล้ว", null, false);
  }

  function deleteLoan(id) {
    const state = getState();
    const index = state.loans.findIndex((item) => item.id === id);
    if (index < 0) return toast("ไม่พบรายการผ่อนชำระนี้");
    state.loans.splice(index, 1);
    commit("ลบผ่อนชำระแล้ว", null, false);
  }

  async function installPwa() {
    const prompt = getDeferredInstallPrompt();
    if (!prompt) {
      openSheet(renderInstallGuideSheet());
      return;
    }

    prompt.prompt();
    await prompt.userChoice;
    setDeferredInstallPrompt(null);
  }

  function resetLocalData() {
    setState(resetState());
    toast("ล้างข้อมูลในเครื่องแล้ว");
  }

  function showChartDetail(button) {
    const title = button?.dataset?.title || "กราฟ";
    const value = button?.dataset?.value || "";
    const note = button?.dataset?.note || "";
    toast([title, value, note].filter(Boolean).join(" · "));
  }

  async function importThaiSlipFileList(fileList) {
    const files = [...(fileList || [])];
    if (!files.length) return;

    try {
      const parsed = await readThaiSlipFiles(files);
      const state = getState();
      const existingKeys = new Set((state.slipTodos || []).map((todo) => `${todo.reference}:${todo.fileSize}`));
      const todos = parsed
        .filter((item) => !existingKeys.has(`${item.reference}:${item.fileSize}`))
        .map((item) => ({
          id: makeId("slip"),
          ...item
        }));

      state.slipTodos = [...todos, ...(state.slipTodos || [])];
      state.slipInbox = {
        ...state.slipInbox,
        lastImportedAt: new Date().toISOString(),
        importedCount: (state.slipInbox?.importedCount || 0) + todos.length,
        needsReviewCount: state.slipTodos.filter((todo) => todo.status !== "done").length,
        lastError: ""
      };
      save();
      openSheet(renderBankSheet(state));
      render();
      toast(todos.length ? `เพิ่มสลิปเข้า To do ${todos.length} รายการ` : "สลิปนี้มีอยู่แล้ว");
    } catch (error) {
      const state = getState();
      state.slipInbox = { ...state.slipInbox, lastError: error.message || "อ่านสลิปไม่สำเร็จ" };
      save();
      openSheet(renderBankSheet(state));
      toast(error.message || "อ่านสลิปไม่สำเร็จ");
    }
  }

  async function importBankStatementFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseBankStatementCsv(text, {
        walletId: defaultQuickAdd.walletId,
        provider: "thai-statement"
      });
      if (parsed.errors.length) {
        toast(parsed.errors[0]);
        return;
      }

      const result = importStatementTransactions(parsed.transactions);
      const state = getState();
      state.slipInbox = {
        ...state.slipInbox,
        lastImportedAt: new Date().toISOString(),
        importedCount: (state.slipInbox?.importedCount || 0) + result.inserted + result.updated,
        lastError: ""
      };
      save();
      closeSheet();
      render();
      toast(`นำเข้า statement แล้ว ${result.inserted} รายการ`);
    } catch (error) {
      toast(error.message || "นำเข้า statement ไม่สำเร็จ");
    }
  }

  function handleAction(action, button = null) {
    const id = button?.dataset?.id || "";
    switch (action) {
      case "open-transaction":
        openTransaction("expense");
        break;
      case "edit-transaction":
        editTransaction(id);
        break;
      case "delete-transaction":
        deleteTransaction(id);
        break;
      case "duplicate-transaction":
        duplicateTransaction(id);
        break;
      case "undo-transaction":
        undoLastTransaction();
        break;
      case "quick-add":
        quickAdd(button);
        break;
      case "clear-transaction-filters":
        clearTransactionFilters();
        break;
      case "chart-detail":
        showChartDetail(button);
        break;
      case "apply-transaction-filters":
        handleAppSubmit(button?.closest("#transaction-filter-form"));
        break;
      case "open-receipt":
        openTransaction("expense");
        toast("เพิ่มเลขอ้างอิงหรือชื่อไฟล์ใบเสร็จในช่องหลักฐานแนบ");
        break;
      case "open-bank":
        openSheet(renderBankSheet(getState()));
        break;
      case "open-allocation":
        openSheet(renderAllocationSheet(getState()));
        break;
      case "pick-thai-slips":
        document.querySelector("#thai-slip-files")?.click();
        break;
      case "pick-bank-statement":
        document.querySelector("#bank-statement-file")?.click();
        break;
      case "review-slip-todo":
        openSlipTodo(id);
        break;
      case "delete-slip-todo":
        deleteSlipTodo(id);
        break;
      case "export-json":
        exportJson();
        break;
      case "export-csv":
        exportCsv();
        break;
      case "install-pwa":
        installPwa();
        break;
      case "open-install-guide":
        openSheet(renderInstallGuideSheet());
        break;
      case "check-update":
        checkForAppUpdate();
        break;
      case "reset-data":
        resetLocalData();
        break;
      case "open-budget":
        openSheet(renderBudgetSheet(getState()));
        break;
      case "edit-budget":
        editBudget(id);
        break;
      case "delete-budget":
        deleteBudget(id);
        break;
      case "open-category":
        openSheet(renderCategorySheet(getState()));
        break;
      case "open-loan":
        openSheet(renderLoanSheet());
        break;
      case "edit-loan":
        editLoan(id);
        break;
      case "pay-loan":
        payLoan(id);
        break;
      case "delete-loan":
        deleteLoan(id);
        break;
      case "open-goal":
        openSheet(renderGoalSheet());
        break;
      case "edit-goal":
        editGoal(id);
        break;
      case "deposit-goal":
        depositGoal(id);
        break;
      case "delete-goal":
        deleteGoal(id);
        break;
      case "open-wallet":
        openSheet(renderWalletSheet());
        break;
      case "edit-wallet":
        editWallet(id);
        break;
      case "delete-wallet":
        deleteWallet(id);
        break;
      default:
        break;
    }
  }

  return {
    handleAction,
    handleAppSubmit,
    handleBankStatementFile: importBankStatementFile,
    handleThaiSlipFiles: importThaiSlipFileList,
    handleReceiptImage,
    handleSubmit
  };
}
