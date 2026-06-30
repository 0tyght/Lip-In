import { getCategory } from "../core/selectors.js";
import { resetState } from "../core/store.js";
import { toISODate } from "../utils/date.js";
import { downloadFile } from "../utils/download.js";
import { csvCell, makeId } from "../utils/format.js";
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
  renderReceiptSheet,
  renderScanItems,
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

  function sampleReceiptItems() {
    return [
      { title: "สเปรย์นีเวียเอ็กซ์ตร้า", amount: 99 },
      { title: "น้ำมันข้าวโพดวิปฟาร์ม", amount: 25 }
    ];
  }

  function applyWalletChange(walletId, type, amount) {
    const wallet = getState().wallets.find((item) => item.id === walletId);
    if (!wallet || Number.isNaN(amount)) return;
    if (type === "income") wallet.balance += amount;
    if (type === "expense" || type === "payment") wallet.balance -= amount;
    if (type === "transfer") wallet.balance += amount;
  }

  function revertWalletChange(walletId, type, amount) {
    const wallet = getState().wallets.find((item) => item.id === walletId);
    if (!wallet || Number.isNaN(amount)) return;
    if (type === "income") wallet.balance -= amount;
    if (type === "expense" || type === "payment") wallet.balance += amount;
    if (type === "transfer") wallet.balance -= amount;
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
    if (form.matches("#transaction-form")) handleTransactionSubmit(form);
    if (form.matches("#allocation-form")) handleAllocationSubmit(form);
    if (form.matches("#budget-form")) handleBudgetSubmit(form);
    if (form.matches("#category-form")) handleCategorySubmit(form);
    if (form.matches("#wallet-form")) handleWalletSubmit(form);
    if (form.matches("#goal-form")) handleGoalSubmit(form);
    if (form.matches("#goal-deposit-form")) handleGoalDepositSubmit(form);
    if (form.matches("#loan-form")) handleLoanSubmit(form);
  }

  function handleReceiptImage(file) {
    const thumb = document.querySelector("#receipt-thumb");
    if (!file || !thumb) return;
    const url = URL.createObjectURL(file);
    thumb.innerHTML = `<img src="${url}" alt="รูปใบเสร็จ">`;
  }

  function syncBankDemo() {
    const state = getState();
    const today = toISODate(new Date());
    const samples = [
      { title: "โอนเงินจากแอปธนาคาร", type: "transfer", amount: 500, categoryId: "transfer", walletId: "saving" },
      { title: "ร้านสะดวกซื้อต่างๆ", type: "expense", amount: 124, categoryId: "food", walletId: "daily" },
      { title: "เงินเดือนเข้า", type: "income", amount: 25000, categoryId: "salary", walletId: "daily" }
    ];

    samples.forEach((sample) => {
      const exists = state.transactions.some((tx) => tx.title === sample.title && tx.date === today && tx.source === "bank");
      if (exists) return;
      state.transactions.unshift({ id: makeId("bank"), date: today, note: "", source: "bank", ...sample });
      applyWalletChange(sample.walletId, sample.type, sample.amount);
    });

    state.lastSyncedAt = new Date().toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
    commit("ซิงก์ข้อมูลตัวอย่างแล้ว");
  }

  function recordScanItems() {
    const walletId = document.querySelector("#receipt-wallet")?.value || "daily";
    const date = document.querySelector("#receipt-date")?.value || toISODate(new Date());
    const state = getState();

    sampleReceiptItems().forEach((item) => {
      state.transactions.unshift({
        id: makeId("receipt"),
        type: "expense",
        title: item.title,
        categoryId: "food",
        walletId,
        amount: item.amount,
        date,
        note: "จากใบเสร็จ",
        source: "receipt"
      });
      applyWalletChange(walletId, "expense", item.amount);
    });

    commit("บันทึกรายการจากใบเสร็จแล้ว");
  }

  function exportJson() {
    downloadFile(`lip-in-money-${toISODate(new Date())}.json`, JSON.stringify(getState(), null, 2), "application/json");
    toast("ส่งออก JSON แล้ว");
  }

  function exportCsv() {
    const state = getState();
    const rows = [
      ["date", "type", "title", "category", "wallet", "amount", "source", "note"],
      ...state.transactions.map((tx) => {
        const category = getCategory(state, tx.categoryId);
        const wallet = state.wallets.find((item) => item.id === tx.walletId);
        return [tx.date, tx.type, tx.title, category.name, wallet?.name || "", tx.amount, tx.source, tx.note || ""];
      })
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    downloadFile(`lip-in-transactions-${toISODate(new Date())}.csv`, `\uFEFF${csv}`, "text/csv;charset=utf-8");
    toast("ส่งออก CSV แล้ว");
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
    revertWalletChange(tx.walletId, tx.type, tx.amount);
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

  function resetDemo() {
    setState(resetState());
    toast("รีเซ็ตข้อมูลเดโมแล้ว");
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
      case "open-receipt":
        openSheet(renderReceiptSheet(getState(), sampleReceiptItems()));
        break;
      case "open-bank":
        openSheet(renderBankSheet(getState()));
        break;
      case "open-allocation":
        openSheet(renderAllocationSheet(getState()));
        break;
      case "sync-bank":
        syncBankDemo();
        break;
      case "scan-demo":
        document.querySelector("#scan-result").innerHTML = renderScanItems(sampleReceiptItems());
        toast("อ่านรายการสำเร็จ");
        break;
      case "record-scan":
        recordScanItems();
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
      case "reset-demo":
        resetDemo();
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
    handleReceiptImage,
    handleSubmit
  };
}
