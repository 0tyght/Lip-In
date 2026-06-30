import { APP_VERSION, bottomViews, reportRanges, reportTabs, topViews, transactionFilters } from "../config/app-config.js";
import { allCategories, assetTotal, expenseByCategory, totalByType } from "../core/selectors.js";
import { defaultTransactionAdvancedFilters, filteredTransactions } from "../core/transactions.js";
import { offsetDate, formatDate } from "../utils/date.js";
import { clamp, formatMoneyHtml, formatPercent } from "../utils/format.js";
import { escapeHtml } from "../utils/html.js";
import {
  renderBudgetComparisonChart,
  renderCashFlowChart,
  renderCashTrendChart,
  renderExpenseDonutChart,
  renderLoanStackedChart,
  renderMonthlyGroupedBarChart,
  renderNetWorthAreaChart,
  renderSpendingHeatmap
} from "./charts.js";
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
          <button class="icon-btn" type="button" data-action="open-receipt" aria-label="แนบใบเสร็จ">📷</button>
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

function renderQuickAmounts(state) {
  const quick = state.quickAdd || { walletId: "daily", categoryId: "food" };
  const amounts = Array.isArray(state.quickAmounts) && state.quickAmounts.length ? state.quickAmounts : [59, 99, 129, 250];
  return `
    <div class="quick-amounts" aria-label="บันทึกเร็ว">
      ${amounts.map((amount) => `
        <button class="quick-amount" type="button" data-action="quick-add" data-amount="${amount}" data-wallet-id="${quick.walletId}" data-category-id="${quick.categoryId}">
          <span>-${formatMoneyHtml(amount)}</span>
          <small>บันทึกเร็ว</small>
        </button>
      `).join("")}
    </div>
  `;
}

function renderFilterOptions(items, selected, labeler) {
  return items.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === selected ? "selected" : ""}>${escapeHtml(labeler(item))}</option>`).join("");
}

function renderTransactionFilterForm(state) {
  const filters = { ...defaultTransactionAdvancedFilters, ...(state.transactionAdvancedFilters || {}) };
  const wallets = [{ id: "all", name: "ทุกกระเป๋า", icon: "" }, ...state.wallets];
  const categories = [{ id: "all", name: "ทุกหมวด", icon: "" }, ...allCategories(state)];
  const statuses = [
    { id: "all", name: "ทุกสถานะ" },
    { id: "posted", name: "ลงบัญชีแล้ว" },
    { id: "pending", name: "รอตรวจสอบ" },
    { id: "scheduled", name: "ล่วงหน้า" }
  ];

  return `
    <form class="filter-panel" id="transaction-filter-form">
      <div class="field"><label for="tx-search">ค้นหา</label><input class="search-input" id="tx-search" name="search" placeholder="ร้านค้า โน้ต แท็ก หมวด กระเป๋า" value="${escapeHtml(state.transactionSearch || "")}"></div>
      <div class="form-row">
        <div class="field"><label for="filter-wallet">กระเป๋า</label><select id="filter-wallet" name="walletId">${renderFilterOptions(wallets, filters.walletId, (wallet) => `${wallet.icon ? `${wallet.icon} ` : ""}${wallet.name}`)}</select></div>
        <div class="field"><label for="filter-category">หมวด</label><select id="filter-category" name="categoryId">${renderFilterOptions(categories, filters.categoryId, (category) => `${category.icon ? `${category.icon} ` : ""}${category.name}`)}</select></div>
      </div>
      <div class="form-row">
        <div class="field"><label for="filter-status">สถานะ</label><select id="filter-status" name="status">${renderFilterOptions(statuses, filters.status, (status) => status.name)}</select></div>
        <div class="field"><label for="filter-tag">แท็ก</label><input id="filter-tag" name="tag" placeholder="quick, trip" value="${escapeHtml(filters.tag)}"></div>
      </div>
      <div class="form-row">
        <div class="field"><label for="filter-from">ตั้งแต่</label><input id="filter-from" name="dateFrom" type="date" value="${escapeHtml(filters.dateFrom)}"></div>
        <div class="field"><label for="filter-to">ถึง</label><input id="filter-to" name="dateTo" type="date" value="${escapeHtml(filters.dateTo)}"></div>
      </div>
      <div class="form-row">
        <div class="field"><label for="filter-min">ยอดต่ำสุด</label><input id="filter-min" name="minAmount" type="number" min="0" step="0.01" value="${escapeHtml(filters.minAmount)}"></div>
        <div class="field"><label for="filter-max">ยอดสูงสุด</label><input id="filter-max" name="maxAmount" type="number" min="0" step="0.01" value="${escapeHtml(filters.maxAmount)}"></div>
      </div>
      <div class="form-row">
        <button class="primary-btn" type="button" data-action="apply-transaction-filters">ค้นหา</button>
        <button class="ghost-btn" type="button" data-action="clear-transaction-filters">ล้างตัวกรอง</button>
      </div>
    </form>
  `;
}

function renderOverview(state) {
  const totalBalance = state.wallets.filter((wallet) => !wallet.liability).reduce((sum, wallet) => sum + wallet.balance, 0);
  const todayExpense = totalByType(state, "expense", "today");
  const todayIncome = totalByType(state, "income", "today");
  const todayTransfer = totalByType(state, "transfer", "today");
  const ratio = state.dailyLimit > 0 ? clamp(todayExpense / state.dailyLimit, 0, 1.25) : 0;
  const dailyLimitLabel = state.dailyLimit > 0
    ? `${formatMoneyHtml(todayExpense)} / ${formatMoneyHtml(state.dailyLimit)}`
    : "ยังไม่ได้ตั้งวงเงิน";

  return `
    <section class="view">
      <article class="card metric-card">
        <div class="metric-top">
          <div>
            <p class="label">ยอดคงเหลือ <span class="tag">${state.wallets.length} กระเป๋า</span></p>
            <p class="money xl">${formatMoneyHtml(totalBalance)}</p>
            <p class="label">ค่าใช้จ่ายรายวัน ${formatPercent(ratio)} <strong class="nowrap">${dailyLimitLabel}</strong></p>
          </div>
          <div class="assistant-bubble">แมวเงินดูแลแล้วนะ</div>
        </div>
        <div class="progress" aria-label="ค่าใช้จ่ายเทียบงบรายวัน">
          <span class="green" style="width:${Math.min(ratio * 55, 55)}%"></span>
          <span class="yellow" style="width:${Math.min(ratio * 28, 28)}%"></span>
          <span class="pink" style="width:${Math.max(0, Math.min((ratio - 0.78) * 58, 17))}%"></span>
        </div>
        <div class="summary-grid">
          <div class="summary-item"><p class="money md bad">${formatMoneyHtml(todayExpense)}</p><p class="label">รายจ่ายวันนี้</p></div>
          <div class="summary-item"><p class="money md good">${formatMoneyHtml(todayIncome)}</p><p class="label">รายรับวันนี้</p></div>
          <div class="summary-item"><p class="money md">${formatMoneyHtml(todayTransfer)}</p><p class="label">โอนเงินวันนี้</p></div>
        </div>
      </article>

      ${renderCashTrendChart(state)}
      ${renderExpenseDonutChart(state)}
      ${renderBudgetComparisonChart(state)}

      ${renderQuickAmounts(state)}

      <div class="quick-grid">
        <button class="quick-action" type="button" data-action="open-receipt"><span>📷</span><span>แนบใบเสร็จ</span></button>
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

  return `
    <section class="view">
      <div class="chip-row">
        ${reportRanges.map((range) => `
          <button class="chip ${state.reportRange === range.id ? "is-active" : ""}" type="button" data-report-range="${range.id}">
            ${range.label}
          </button>
        `).join("")}
      </div>
      ${renderExpenseDonutChart(state, "รายจ่ายตามหมวด", "โดนัทพร้อม legend ที่แตะอ่านค่าได้")}
      <div class="section-title"><h2>แยกตามหมวดหมู่</h2><button class="section-action" type="button" data-action="export-csv">ส่งออก</button></div>
      <table class="table">
        <thead><tr><th>หมวดหมู่</th><th>ร้อยละ</th><th>จำนวน</th></tr></thead>
        <tbody>
          ${rows.map((row) => `
            <tr><td>${row.icon} ${escapeHtml(row.name)}</td><td>${total ? Math.round((row.amount / total) * 100) : 0}%</td><td>${formatMoneyHtml(row.amount)}</td></tr>
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
      ${renderNetWorthAreaChart(state)}
      <article class="card">
        <div class="asset-row"><div class="asset-main"><span class="category-icon">🌿</span><strong>ทรัพย์สินสุทธิ</strong></div><p class="money lg good">${formatMoneyHtml(assets - creditDebt - loanDebt)}</p></div>
        <div class="asset-row"><div class="asset-main"><span class="category-icon">👛</span><span>ทรัพย์สิน</span></div><p class="money md good">${formatMoneyHtml(assets)}</p></div>
        <div class="asset-row"><div class="asset-main"><span class="category-icon">💳</span><span>หนี้สินบัตรเครดิต</span></div><p class="money md bad">${formatMoneyHtml(creditDebt)}</p></div>
        <div class="asset-row"><div class="asset-main"><span class="category-icon">🏠</span><span>หนี้สินผ่อนชำระ</span></div><p class="money md bad">${formatMoneyHtml(loanDebt)}</p></div>
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
      ${renderMonthlyGroupedBarChart(state)}
      ${renderCashFlowChart(state)}
      ${renderSpendingHeatmap(state)}
      <div class="section-title"><h2>รายจ่าย 7 วัน</h2></div>
      ${days.map((day) => `
        <div class="allocation-item">
          <div class="allocation-head"><strong>${formatDate(day.date)}</strong><span>${formatMoneyHtml(day.expense)}</span></div>
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
          <div class="allocation-head"><strong>${sourceLabel(row.source)}</strong><span>${formatMoneyHtml(row.amount)}</span></div>
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
      ${renderBudgetComparisonChart(state)}
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
      ${renderLoanStackedChart(state)}
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
        <div class="section-title"><h2>ทรัพย์สินสุทธิ</h2><p class="money lg good">${formatMoneyHtml(assets - debt - loanDebt)}</p></div>
        <div class="asset-row"><div class="asset-main"><span class="category-icon">👛</span><span>ทรัพย์สิน</span></div><strong class="good">${formatMoneyHtml(assets)}</strong></div>
        <div class="asset-row"><div class="asset-main"><span class="category-icon">💳</span><span>หนี้สินบัตรเครดิต</span></div><strong class="bad">${formatMoneyHtml(debt)}</strong></div>
        <div class="asset-row"><div class="asset-main"><span class="category-icon">🏠</span><span>หนี้สินผ่อนชำระ</span></div><strong class="bad">${formatMoneyHtml(loanDebt)}</strong></div>
      </article>
      <div class="section-title"><h2>กระเป๋าเงิน</h2><button class="section-action" type="button" data-action="open-wallet">+ เพิ่ม</button></div>
      <div class="wallet-grid">${state.wallets.map(renderWalletCard).join("")}</div>
      <article class="card bank-card">
        <div class="bank-status"><span class="category-icon">🏦</span><div><strong>เชื่อมธนาคารจริง</strong><div class="muted">${state.bankSync?.lastSyncedAt ? `ซิงก์ล่าสุด ${escapeHtml(new Date(state.bankSync.lastSyncedAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }))}` : "ตั้งค่า Bank API หรือ import statement"}</div></div></div>
        <button class="primary-btn" type="button" data-action="open-bank">ตั้งค่า / ซิงก์ธนาคาร</button>
      </article>
    </section>
  `;
}

function renderTransactions(state) {
  const txs = filteredTransactions(state);
  const pendingCount = (state.transactions || []).filter((tx) => tx.status === "pending" || tx.status === "scheduled").length;

  return `
    <section class="view">
      <div class="section-title">
        <h2>ธุรกรรม <span class="tag">${txs.length} รายการ</span></h2>
        <div class="inline-actions">
          ${(state.undoStack || []).length ? `<button class="section-action" type="button" data-action="undo-transaction">Undo</button>` : ""}
          <button class="section-action" type="button" data-action="open-transaction">+ เพิ่ม</button>
        </div>
      </div>
      <div class="chip-row">
        ${transactionFilters.map((filter) => `
          <button class="chip ${state.transactionFilter === filter.id ? "is-active" : ""}" type="button" data-transaction-filter="${filter.id}">
            ${filter.label}
          </button>
        `).join("")}
      </div>
      ${pendingCount ? `<div class="notice-card">มีรายการรอตรวจสอบ/ตั้งเวลา ${pendingCount} รายการ ยังไม่กระทบยอดกระเป๋าจนกว่าจะลงบัญชี</div>` : ""}
      ${renderTransactionFilterForm(state)}
      <div class="transaction-list">${txs.length ? txs.map((tx) => renderTransactionRow(state, tx)).join("") : `<div class="empty-state">ยังไม่มีรายการที่ตรงกับตัวกรอง</div>`}</div>
    </section>
  `;
}

function renderTransactionsLegacy(state) {
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
          <span class="menu-copy"><strong>ธนาคาร</strong><span>API จริง / statement</span></span>
        </button>
        <button class="menu-row" type="button" data-action="open-allocation">
          <span class="menu-icon">🧮</span>
          <span class="menu-copy"><strong>แบ่งสัดส่วนเงิน</strong><span>${formatMoneyHtml(state.expectedIncome)}</span></span>
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
        <button class="quick-action" type="button" data-action="open-receipt"><span>📷</span><span>แนบใบเสร็จ</span></button>
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
        <button class="danger-btn" type="button" data-action="reset-data">ล้างข้อมูลในเครื่อง</button>
      </article>

      <div class="section-title"><h2>หมวดหมู่</h2><button class="section-action" type="button" data-action="open-category">+ เพิ่ม</button></div>
      <div class="category-grid is-compact">${categoryPreview.map(renderCategoryTile).join("")}</div>
    </section>
  `;
}
