import { getCategory } from "../core/selectors.js";
import { formatDate } from "../utils/date.js";
import { clamp, formatMoneyHtml } from "../utils/format.js";
import { escapeHtml } from "../utils/html.js";

export function renderWalletCard(wallet) {
  return `
    <article class="wallet-card" style="--wallet-bg:${wallet.color}">
      <span class="wallet-icon">${wallet.icon}</span>
      <div>
        <p class="wallet-name">${escapeHtml(wallet.name)}</p>
        <p class="money md ${wallet.balance < 0 ? "bad" : ""}">${formatMoneyHtml(Math.abs(wallet.balance))}</p>
      </div>
      <div class="inline-actions">
        <button class="tiny-btn" type="button" data-action="edit-wallet" data-id="${wallet.id}">แก้ไข</button>
        <button class="tiny-btn danger" type="button" data-action="delete-wallet" data-id="${wallet.id}">ลบ</button>
      </div>
    </article>
  `;
}

export function renderAllocationItem(state, item) {
  const amount = state.expectedIncome * (item.percent / 100);
  return `
    <article class="allocation-item">
      <div class="allocation-head">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${item.percent}% · ${formatMoneyHtml(amount)}</span>
      </div>
      <div class="mini-bar"><span style="width:${item.percent}%; --bar-color:${item.color}"></span></div>
    </article>
  `;
}

export function renderTransactionRow(state, tx) {
  const category = getCategory(state, tx.categoryId);
  const wallet = state.wallets.find((item) => item.id === tx.walletId);
  const sign = tx.type === "income" ? "+" : tx.type === "transfer" ? "" : "-";
  const amountClass = tx.type === "income" ? "good" : tx.type === "transfer" ? "" : "bad";
  const status = tx.status || "posted";
  const statusText = { posted: "ลงบัญชีแล้ว", pending: "รอตรวจ", scheduled: "ล่วงหน้า" }[status] || status;
  const splitText = tx.splits?.length ? `แยก ${tx.splits.length} หมวด` : "";
  const attachmentText = tx.attachments?.length ? `แนบ ${tx.attachments.length}` : "";
  const tags = (tx.tags || []).slice(0, 3);
  const meta = [
    category.name,
    wallet?.name || "",
    formatDate(tx.date),
    tx.time || "",
    sourceLabel(tx.source)
  ].filter(Boolean).join(" · ");

  return `
    <article class="transaction-row ${status !== "posted" ? "is-muted" : ""}">
      <div class="transaction-main">
        <span class="category-icon" style="background:${category.color}33">${category.icon}</span>
        <div class="transaction-main-text">
          <strong>${escapeHtml(tx.title)}</strong>
          <div class="transaction-meta">${escapeHtml(meta)}</div>
          <div class="transaction-tags">
            <span class="tag ${status === "posted" ? "green" : "pink"}">${statusText}</span>
            ${splitText ? `<span class="tag purple">${escapeHtml(splitText)}</span>` : ""}
            ${attachmentText ? `<span class="tag">${escapeHtml(attachmentText)}</span>` : ""}
            ${tags.map((tag) => `<span class="tag">#${escapeHtml(tag)}</span>`).join("")}
          </div>
        </div>
      </div>
      <div class="row-actions">
        <div class="transaction-amount ${amountClass}">${sign}${formatMoneyHtml(tx.amount)}</div>
        <button class="tiny-btn" type="button" data-action="duplicate-transaction" data-id="${tx.id}" aria-label="คัดลอก ${escapeHtml(tx.title)}">คัดลอก</button>
        <button class="tiny-btn" type="button" data-action="edit-transaction" data-id="${tx.id}" aria-label="แก้ไข ${escapeHtml(tx.title)}">แก้ไข</button>
        <button class="tiny-btn danger" type="button" data-action="delete-transaction" data-id="${tx.id}" aria-label="ลบ ${escapeHtml(tx.title)}">ลบ</button>
      </div>
    </article>
  `;
}

function renderTransactionRowLegacy(state, tx) {
  const category = getCategory(state, tx.categoryId);
  const sign = tx.type === "income" ? "+" : tx.type === "transfer" ? "" : "-";
  const amountClass = tx.type === "income" ? "good" : tx.type === "transfer" ? "" : "bad";

  return `
    <article class="transaction-row">
      <div class="transaction-main">
        <span class="category-icon" style="background:${category.color}33">${category.icon}</span>
        <div class="transaction-main-text">
          <strong>${escapeHtml(tx.title)}</strong>
          <div class="transaction-meta">${escapeHtml(category.name)} · ${formatDate(tx.date)} · ${sourceLabel(tx.source)}</div>
        </div>
      </div>
      <div class="row-actions">
        <div class="transaction-amount ${amountClass}">${sign}${formatMoneyHtml(tx.amount)}</div>
        <button class="tiny-btn" type="button" data-action="edit-transaction" data-id="${tx.id}" aria-label="แก้ไข ${escapeHtml(tx.title)}">แก้ไข</button>
        <button class="tiny-btn danger" type="button" data-action="delete-transaction" data-id="${tx.id}" aria-label="ลบ ${escapeHtml(tx.title)}">ลบ</button>
      </div>
    </article>
  `;
}

export function renderAssetRow(wallet) {
  return `
    <article class="asset-row">
      <div class="asset-main"><span class="category-icon">${wallet.icon}</span><strong>${escapeHtml(wallet.name)}</strong></div>
      <p class="money md good">${formatMoneyHtml(wallet.balance)}</p>
    </article>
  `;
}

export function renderBudgetCard(state, budget) {
  const category = getCategory(state, budget.categoryId);
  const spent = state.transactions
    .filter((tx) => tx.type === "expense" && tx.categoryId === budget.categoryId)
    .reduce((sum, tx) => sum + tx.amount, 0);
  const remaining = Math.max(budget.amount - spent, 0);
  const ratio = clamp(spent / budget.amount, 0, 1.4);

  return `
    <article class="budget-card">
      <div class="budget-head">
        <div class="transaction-main">
          <span class="category-icon" style="background:${category.color}55">${category.icon}</span>
          <strong>${escapeHtml(category.name)}</strong>
        </div>
        <div class="row-actions">
          <span class="tag ${ratio > 1 ? "pink" : "green"}">${ratio > 1 ? "เกินงบ" : "ในงบ"}</span>
          <button class="tiny-btn" type="button" data-action="edit-budget" data-id="${budget.id}">แก้ไข</button>
          <button class="tiny-btn danger" type="button" data-action="delete-budget" data-id="${budget.id}">ลบ</button>
        </div>
      </div>
      <div class="mini-bar"><span style="width:${Math.min(ratio * 100, 100)}%; --bar-color:${ratio > 1 ? "#f778a2" : category.color}"></span></div>
      <div class="budget-stats">
        <div class="stat-box"><div class="muted">ใช้แล้ว</div><strong class="bad">${formatMoneyHtml(spent)}</strong></div>
        <div class="stat-box"><div class="muted">คงเหลือ</div><strong class="good">${formatMoneyHtml(remaining)}</strong></div>
        <div class="stat-box"><div class="muted">งบ</div><strong>${formatMoneyHtml(budget.amount)}</strong></div>
      </div>
    </article>
  `;
}

export function renderLoanCard(loan) {
  const balance = Math.max(loan.principal - loan.paidPrincipal, 0);
  const ratio = clamp(loan.paidPrincipal / loan.principal, 0, 1);

  return `
    <article class="loan-card">
      <div class="loan-head">
        <div class="transaction-main">
          <span class="category-icon">${loan.icon}</span>
          <div><strong>${escapeHtml(loan.name)}</strong><div class="muted">${escapeHtml(loan.group)} · ${escapeHtml(loan.asset)}</div></div>
        </div>
        <div class="row-actions">
          <span class="tag green">กำลังผ่อนชำระ</span>
          <button class="tiny-btn" type="button" data-action="pay-loan" data-id="${loan.id}">จ่ายงวด</button>
          <button class="tiny-btn" type="button" data-action="edit-loan" data-id="${loan.id}">แก้ไข</button>
          <button class="tiny-btn danger" type="button" data-action="delete-loan" data-id="${loan.id}">ลบ</button>
        </div>
      </div>
      <div class="loan-stats">
        <div class="stat-box"><div class="muted">จ่ายไปแล้ว</div><strong class="good">${formatMoneyHtml(loan.paidPrincipal)}</strong></div>
        <div class="stat-box"><div class="muted">คงเหลือ</div><strong>${formatMoneyHtml(balance)}</strong></div>
        <div class="stat-box"><div class="muted">เงินต้น</div><strong>${formatMoneyHtml(loan.principal)}</strong></div>
      </div>
      <div class="mini-bar"><span style="width:${ratio * 100}%; --bar-color:#ff8168"></span></div>
      <div class="loan-detail">
        <div class="allocation-head"><span>การคิดดอกเบี้ย</span><span class="tag green">ลดต้นลดดอก</span></div>
        <div class="asset-row"><span>ดอกเบี้ยที่จ่ายแล้ว</span><strong class="good">${formatMoneyHtml(loan.interestPaid)}</strong></div>
        <div class="asset-row"><span>ค่างวดงวดถัดไป</span><strong>${formatMoneyHtml(loan.nextPayment)}</strong></div>
      </div>
      <div class="installment-grid">
        ${Array.from({ length: loan.totalTerms }, (_, index) => `<span class="installment-pill ${index < loan.paidTerms ? "paid" : ""}">${index + 1}</span>`).join("")}
      </div>
    </article>
  `;
}

export function renderGoalCard(goal) {
  const ratio = clamp(goal.saved / goal.target, 0, 1);

  return `
    <article class="goal-card">
      <span class="goal-progress-ring" style="--goal-progress:${ratio * 100}%"><span>${goal.icon}</span></span>
      <div>
        <strong>${escapeHtml(goal.name)}</strong>
        <div class="muted">ครบ ${escapeHtml(goal.due)}</div>
      </div>
      <div class="mini-bar"><span style="width:${ratio * 100}%; --bar-color:#91c36b"></span></div>
      <div class="allocation-head"><span>${formatMoneyHtml(goal.saved)}</span><strong>${Math.round(ratio * 100)}%</strong></div>
      <div class="inline-actions">
        <button class="tiny-btn" type="button" data-action="deposit-goal" data-id="${goal.id}">เติมเงิน</button>
        <button class="tiny-btn" type="button" data-action="edit-goal" data-id="${goal.id}">แก้ไข</button>
        <button class="tiny-btn danger" type="button" data-action="delete-goal" data-id="${goal.id}">ลบ</button>
      </div>
    </article>
  `;
}

export function renderCategoryTile(category) {
  return `<article class="category-tile"><span class="category-icon" style="background:${category.color}55">${category.icon}</span><span>${escapeHtml(category.name)}</span></article>`;
}

export function sourceLabel(source) {
  return { manual: "จดเอง", bank: "ธนาคาร", receipt: "ใบเสร็จ" }[source] || "รายการ";
}

export function typeLabel(type) {
  return { expense: "รายจ่าย", income: "รายรับ", transfer: "โอนเงิน", payment: "ชำระ" }[type] || type;
}
