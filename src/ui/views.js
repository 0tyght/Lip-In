import { APP_VERSION, bottomViews, reportRanges, reportTabs, topViews, transactionFilters } from "../config/app-config.js";
import { allCategories, assetTotal, donutStops, expenseByCategory, totalByType } from "../core/selectors.js";
import { offsetDate, formatDate } from "../utils/date.js";
import { clamp, formatMoney, formatPercent } from "../utils/format.js";
import { escapeHtml } from "../utils/html.js";
import {
  renderAllocationItem,
  renderAssetRow,
  renderBudgetCard,
  renderCategoryTile,
  renderGoalCard,
  renderLoanCard,
  sourceLabel,
  renderTransactionRow,
  renderWalletCard
} from "./components.js";

export function renderApp(state) {
  return `
    ${renderHeader(state)}
    ${renderSubNav(state)}
    <main class="content">${renderView(state)}</main>
    ${renderBottomNav(state)}
    <button class="add-fab" type="button" data-action="open-transaction" aria-label="เพิ่มรายการ">+</button>
  `;
}

function renderHeader(state) {
  return `
    <header class="app-header">
      <div class="top-title">
        <div class="profile">
          <div class="avatar"><img src="assets/icon.svg" alt=""></div>
          <div class="profile-text">
            <p class="profile-name">${escapeHtml(state.profile.name)}</p>
            <p class="profile-caption">${escapeHtml(state.profile.caption)}</p>
          </div>
        </div>
        <div class="header-actions">
          <button class="icon-btn" type="button" data-action="open-receipt" aria-label="สแกนใบเสร็จ">📷</button>
          <button class="install-btn" type="button" data-action="install-pwa" aria-label="ติดตั้ง PWA">ติดตั้ง</button>
        </div>
      </div>
      <nav class="top-nav" aria-label="เมนูหลัก">
        ${topViews.map((item) => `
          <button class="nav-tab" type="button" data-view="${item.id}" aria-selected="${state.view === item.id}">
            ${item.label}
          </button>
        `).join("")}
      </nav>
    </header>
  `;
}

function renderSubNav(state) {
  if (state.view !== "reports") return "";

  return `
    <nav class="sub-nav" aria-label="ตัวกรองรายงาน">
      ${reportTabs.map((tab) => `
        <button class="chip ${state.reportTab === tab.id ? "is-active" : ""}" type="button" data-report-tab="${tab.id}">
          ${tab.label}
        </button>
      `).join("")}
    </nav>
  `;
}

function renderBottomNav(state) {
  return `
    <nav class="bottom-nav" aria-label="เมนูล่าง">
      ${bottomViews.map((item) => {
        if (item.id === "add") return `<span class="bottom-item" aria-hidden="true"></span>`;
        const active = state.view === item.id;
        return `
          <button class="bottom-item ${active ? "is-active" : ""}" type="button" data-view="${item.id}">
            <span>${item.icon}</span><span>${item.label}</span>
          </button>
        `;
      }).join("")}
    </nav>
  `;
}

function renderView(state) {
  switch (state.view) {
    case "reports":
      return renderReports(state);
    case "budget":
      return renderBudget(state);
    case "loans":
      return renderLoans(state);
    case "goals":
      return renderGoals(state);
    case "wallets":
      return renderWallets(state);
    case "transactions":
      return renderTransactions(state);
    case "menu":
      return renderMenu(state);
    default:
      return renderOverview(state);
  }
}

function renderOverview(state) {
  const totalBalance = state.wallets.filter((wallet) => !wallet.liability).reduce((sum, wallet) => sum + wallet.balance, 0);
  const todayExpense = totalByType(state, "expense", "today");
  const todayIncome = totalByType(state, "income", "today");
  const todayTransfer = totalByType(state, "transfer", "today");
  const ratio = clamp(todayExpense / state.dailyLimit, 0, 1.25);

  return `
    <section class="view">
      <article class="card metric-card">
        <div class="metric-top">
          <div>
            <p class="label">ยอดคงเหลือ <span class="tag">6 กระเป๋า</span></p>
            <p class="money xl">${formatMoney(totalBalance)}</p>
            <p class="label">ค่าใช้จ่ายรายวัน ${formatPercent(ratio)} <strong>${formatMoney(todayExpense)} / ${formatMoney(state.dailyLimit)}</strong></p>
          </div>
          <div class="assistant-bubble">แมวเงินดูแลแล้วนะ</div>
        </div>
        <div class="progress" aria-label="ค่าใช้จ่ายเทียบงบรายวัน">
          <span class="green" style="width:${Math.min(ratio * 55, 55)}%"></span>
          <span class="yellow" style="width:${Math.min(ratio * 28, 28)}%"></span>
          <span class="pink" style="width:${Math.max(0, Math.min((ratio - 0.78) * 58, 17))}%"></span>
        </div>
        <div class="summary-grid">
          <div class="summary-item"><p class="money md bad">${formatMoney(todayExpense)}</p><p class="label">รายจ่ายวันนี้</p></div>
          <div class="summary-item"><p class="money md good">${formatMoney(todayIncome)}</p><p class="label">รายรับวันนี้</p></div>
          <div class="summary-item"><p class="money md">${formatMoney(todayTransfer)}</p><p class="label">โอนเงินวันนี้</p></div>
        </div>
      </article>

      <div class="quick-grid">
        <button class="quick-action" type="button" data-action="open-receipt"><span>📷</span><span>สแกนใบเสร็จ</span></button>
        <button class="quick-action" type="button" data-action="open-transaction"><span>✍️</span><span>เพิ่มรายการ</span></button>
        <button class="quick-action" type="button" data-action="open-bank"><span>🏦</span><span>ซิงก์ธนาคาร</span></button>
        <button class="quick-action" type="button" data-action="export-csv"><span>📤</span><span>ส่งออก CSV</span></button>
      </div>

      <div class="section-title"><h2>กระเป๋าเงิน</h2><button class="section-action" type="button" data-view="wallets">ดูทั้งหมด</button></div>
      <div class="wallet-grid">${state.wallets.slice(0, 6).map(renderWalletCard).join("")}</div>

      <div class="section-title"><h2>แบ่งสัดส่วนเงิน</h2><button class="section-action" type="button" data-action="open-allocation">ปรับ</button></div>
      <div class="allocation-list">${state.allocations.map((item) => renderAllocationItem(state, item)).join("")}</div>

      <div class="section-title"><h2>รายการล่าสุด</h2><button class="section-action" type="button" data-view="transactions">ทั้งหมด</button></div>
      <div class="transaction-list">${state.transactions.slice(0, 5).map((tx) => renderTransactionRow(state, tx)).join("")}</div>
    </section>
  `;
}

function renderReports(state) {
  if (state.reportTab === "networth") return renderNetWorthReport(state);
  if (state.reportTab === "time") return renderTimeReport(state);
  if (state.reportTab === "source" || state.reportTab === "tag") return renderSourceReport(state);
  return renderCategoryReport(state);
}

function renderCategoryReport(state) {
  const rows = expenseByCategory(state);
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const stops = donutStops(rows, total);

  return `
    <section class="view">
      <div class="chip-row">
        ${reportRanges.map((range) => `
          <button class="chip ${state.reportRange === range.id ? "is-active" : ""}" type="button" data-report-range="${range.id}">
            ${range.label}
          </button>
        `).join("")}
      </div>
      <article class="chart-card">
        <div class="donut-wrap" style="--donut-stops:${stops}">
          <div class="donut" aria-label="สัดส่วนรายจ่ายตามหมวดหมู่"></div>
          <div class="donut-center"><div><strong>${formatMoney(total)}</strong><span class="muted">เดือนนี้</span></div></div>
        </div>
      </article>
      <div class="section-title"><h2>แยกตามหมวดหมู่</h2><button class="section-action" type="button" data-action="export-csv">ส่งออก</button></div>
      <table class="table">
        <thead><tr><th>หมวดหมู่</th><th>ร้อยละ</th><th>จำนวน</th></tr></thead>
        <tbody>
          ${rows.map((row) => `
            <tr><td>${row.icon} ${escapeHtml(row.name)}</td><td>${total ? Math.round((row.amount / total) * 100) : 0}%</td><td>${formatMoney(row.amount)}</td></tr>
          `).join("")}
        </tbody>
      </table>
    </section>
  `;
}

function renderNetWorthReport(state) {
  const assets = assetTotal(state);
  const creditDebt = Math.abs(state.wallets.filter((wallet) => wallet.liability).reduce((sum, wallet) => sum + wallet.balance, 0));
  const loanDebt = state.loans.reduce((sum, loan) => sum + Math.max(loan.principal - loan.paidPrincipal, 0), 0);

  return `
    <section class="view">
      <article class="card">
        <div class="asset-row"><div class="asset-main"><span class="category-icon">🌿</span><strong>ทรัพย์สินสุทธิ</strong></div><p class="money lg good">${formatMoney(assets - creditDebt - loanDebt)}</p></div>
        <div class="asset-row"><div class="asset-main"><span class="category-icon">👛</span><span>ทรัพย์สิน</span></div><p class="money md good">${formatMoney(assets)}</p></div>
        <div class="asset-row"><div class="asset-main"><span class="category-icon">💳</span><span>หนี้สินบัตรเครดิต</span></div><p class="money md bad">${formatMoney(creditDebt)}</p></div>
        <div class="asset-row"><div class="asset-main"><span class="category-icon">🏠</span><span>หนี้สินผ่อนชำระ</span></div><p class="money md bad">${formatMoney(loanDebt)}</p></div>
      </article>
      <div class="section-title"><h2>ทรัพย์สิน</h2></div>
      <div class="asset-list">${state.wallets.filter((wallet) => !wallet.liability).map(renderAssetRow).join("")}</div>
    </section>
  `;
}

function renderTimeReport(state) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = offsetDate(-index);
    const expense = state.transactions.filter((tx) => tx.type === "expense" && tx.date === date).reduce((sum, tx) => sum + tx.amount, 0);
    return { date, expense };
  }).reverse();
  const max = Math.max(...days.map((day) => day.expense), 1);

  return `
    <section class="view">
      <div class="section-title"><h2>รายจ่าย 7 วัน</h2></div>
      ${days.map((day) => `
        <div class="allocation-item">
          <div class="allocation-head"><strong>${formatDate(day.date)}</strong><span>${formatMoney(day.expense)}</span></div>
          <div class="mini-bar"><span style="width:${(day.expense / max) * 100}%; --bar-color:#ff9aa8"></span></div>
        </div>
      `).join("")}
    </section>
  `;
}

function renderSourceReport(state) {
  const rows = ["manual", "bank", "receipt"].map((source) => ({
    source,
    amount: state.transactions.filter((tx) => tx.source === source && tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0)
  }));

  return `
    <section class="view">
      <div class="section-title"><h2>ช่องทางบันทึก</h2></div>
      ${rows.map((row) => `
        <div class="allocation-item">
          <div class="allocation-head"><strong>${sourceLabel(row.source)}</strong><span>${formatMoney(row.amount)}</span></div>
          <div class="mini-bar"><span style="width:${Math.min(row.amount / 80, 100)}%; --bar-color:#9ccc87"></span></div>
        </div>
      `).join("")}
    </section>
  `;
}

function renderBudget(state) {
  return `
    <section class="view">
      <div class="section-title"><h2>งบประมาณ</h2><button class="section-action" type="button" data-action="open-budget">+ เพิ่ม</button></div>
      <div class="budget-list">${state.budgets.map((budget) => renderBudgetCard(state, budget)).join("")}</div>
      <div class="section-title"><h2>หมวดหมู่</h2><button class="section-action" type="button" data-action="open-category">+ เพิ่ม</button></div>
      <div class="category-grid">${allCategories(state).slice(0, 28).map(renderCategoryTile).join("")}</div>
    </section>
  `;
}

function renderLoans(state) {
  return `
    <section class="view">
      <div class="section-title"><h2>ผ่อนชำระ</h2><button class="section-action" type="button" data-action="open-loan">+ เพิ่ม</button></div>
      <div class="loan-list">${state.loans.map(renderLoanCard).join("")}</div>
    </section>
  `;
}

function renderGoals(state) {
  return `
    <section class="view">
      <div class="section-title"><h2>เป้าหมายออมเงิน</h2><button class="section-action" type="button" data-action="open-goal">+ เพิ่ม</button></div>
      <div class="goal-grid">${state.goals.map(renderGoalCard).join("")}</div>
    </section>
  `;
}

function renderWallets(state) {
  const assets = assetTotal(state);
  const debt = Math.abs(state.wallets.filter((wallet) => wallet.liability).reduce((sum, wallet) => sum + wallet.balance, 0));
  const loanDebt = state.loans.reduce((sum, loan) => sum + Math.max(loan.principal - loan.paidPrincipal, 0), 0);

  return `
    <section class="view">
      <article class="card">
        <div class="section-title"><h2>ทรัพย์สินสุทธิ</h2><p class="money lg good">${formatMoney(assets - debt - loanDebt)}</p></div>
        <div class="asset-row"><div class="asset-main"><span class="category-icon">👛</span><span>ทรัพย์สิน</span></div><strong class="good">${formatMoney(assets)}</strong></div>
        <div class="asset-row"><div class="asset-main"><span class="category-icon">💳</span><span>หนี้สินบัตรเครดิต</span></div><strong class="bad">${formatMoney(debt)}</strong></div>
        <div class="asset-row"><div class="asset-main"><span class="category-icon">🏠</span><span>หนี้สินผ่อนชำระ</span></div><strong class="bad">${formatMoney(loanDebt)}</strong></div>
      </article>
      <div class="section-title"><h2>กระเป๋าเงิน</h2><button class="section-action" type="button" data-action="open-wallet">+ เพิ่ม</button></div>
      <div class="wallet-grid">${state.wallets.map(renderWalletCard).join("")}</div>
      <article class="card bank-card">
        <div class="bank-status"><span class="category-icon">🏦</span><div><strong>เชื่อมธนาคาร</strong><div class="muted">${state.lastSyncedAt ? `ซิงก์ล่าสุด ${escapeHtml(state.lastSyncedAt)}` : "Sandbox พร้อมทดลอง"}</div></div></div>
        <button class="primary-btn" type="button" data-action="sync-bank">ซิงก์ข้อมูลตัวอย่าง</button>
      </article>
    </section>
  `;
}

function renderTransactions(state) {
  const txs = state.transactionFilter === "all"
    ? state.transactions
    : state.transactions.filter((tx) => tx.type === state.transactionFilter);

  return `
    <section class="view">
      <div class="section-title"><h2>ธุรกรรม</h2><button class="section-action" type="button" data-action="open-transaction">+ เพิ่ม</button></div>
      <div class="chip-row">
        ${transactionFilters.map((filter) => `
          <button class="chip ${state.transactionFilter === filter.id ? "is-active" : ""}" type="button" data-transaction-filter="${filter.id}">
            ${filter.label}
          </button>
        `).join("")}
      </div>
      <div class="transaction-list">${txs.length ? txs.map((tx) => renderTransactionRow(state, tx)).join("") : `<div class="empty-state">ยังไม่มีรายการ</div>`}</div>
    </section>
  `;
}

function renderMenu(state) {
  const categoryPreview = allCategories(state).slice(0, 12);

  return `
    <section class="view">
      <div class="section-title"><h2>เมนู</h2><span class="tag">v${APP_VERSION}</span></div>
      <div class="menu-list">
        <button class="menu-row" type="button" data-action="open-bank">
          <span class="menu-icon">🏦</span>
          <span class="menu-copy"><strong>ธนาคาร</strong><span>Sandbox</span></span>
        </button>
        <button class="menu-row" type="button" data-action="open-allocation">
          <span class="menu-icon">🧮</span>
          <span class="menu-copy"><strong>แบ่งสัดส่วนเงิน</strong><span>${formatMoney(state.expectedIncome)}</span></span>
        </button>
        <button class="menu-row" type="button" data-action="check-update">
          <span class="menu-icon">↻</span>
          <span class="menu-copy"><strong>ตรวจเวอร์ชันล่าสุด</strong><span>v${APP_VERSION}</span></span>
        </button>
        <button class="menu-row" type="button" data-action="open-install-guide">
          <span class="menu-icon">📱</span>
          <span class="menu-copy"><strong>ติดตั้งบน iPhone</strong><span>Safari</span></span>
        </button>
      </div>

      <div class="section-title"><h2>บันทึกเร็ว</h2></div>
      <div class="quick-grid">
        <button class="quick-action" type="button" data-action="open-transaction"><span>✍️</span><span>เพิ่มรายการ</span></button>
        <button class="quick-action" type="button" data-action="open-receipt"><span>📷</span><span>สแกนใบเสร็จ</span></button>
        <button class="quick-action" type="button" data-view="transactions"><span>🧾</span><span>รายการ</span></button>
        <button class="quick-action" type="button" data-view="wallets"><span>👛</span><span>กระเป๋า</span></button>
      </div>

      <div class="section-title"><h2>ธีม</h2></div>
      <div class="quick-grid">
        <button class="quick-action" type="button" data-theme="sunny"><span>🟨</span><span>ใบเสร็จ</span></button>
        <button class="quick-action" type="button" data-theme="pink"><span>🌸</span><span>หวานนุ่ม</span></button>
        <button class="quick-action" type="button" data-theme="mint"><span>🟩</span><span>มิ้นต์</span></button>
      </div>

      <article class="card bank-card">
        <div class="bank-status"><span class="category-icon">🔐</span><div><strong>ข้อมูล</strong><div class="muted">localStorage</div></div></div>
        <div class="form-row">
          <button class="ghost-btn" type="button" data-action="export-json">สำรอง JSON</button>
          <button class="ghost-btn" type="button" data-action="export-csv">ส่งออก CSV</button>
        </div>
        <button class="danger-btn" type="button" data-action="reset-demo">รีเซ็ตข้อมูลเดโม</button>
      </article>

      <div class="section-title"><h2>หมวดหมู่</h2><button class="section-action" type="button" data-action="open-category">+ เพิ่ม</button></div>
      <div class="category-grid is-compact">${categoryPreview.map(renderCategoryTile).join("")}</div>
    </section>
  `;
}
