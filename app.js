(() => {
  "use strict";

  const STORAGE_KEY = "lip-in-money-state-v1";
  const app = document.querySelector("#app");
  const sheetRoot = document.querySelector("#sheet-root");
  const toastRoot = document.querySelector("#toast-root");
  let deferredInstallPrompt = null;

  const categories = [
    { id: "food", name: "อาหาร", icon: "🍜", color: "#ffb4a6" },
    { id: "bill", name: "สาธารณูปโภค", icon: "🧾", color: "#bfe7d2" },
    { id: "credit", name: "บัตรเครดิต", icon: "💳", color: "#c8db8c" },
    { id: "travel", name: "เดินทาง", icon: "🚃", color: "#ff8f78" },
    { id: "coffee", name: "กาแฟฟาฟา", icon: "🥤", color: "#ffd07b" },
    { id: "taxi", name: "แท็กซี่", icon: "🚕", color: "#ffd86b" },
    { id: "fuel", name: "น้ำมัน", icon: "⛽", color: "#ffc9a8" },
    { id: "clothes", name: "เสื้อผ้า", icon: "👕", color: "#d7c7f4" },
    { id: "family", name: "ครอบครัว", icon: "👨‍👩‍👧", color: "#f4c2d6" },
    { id: "fun", name: "สังสรรค์", icon: "🍻", color: "#ffd0a7" },
    { id: "trip", name: "ท่องเที่ยว", icon: "🦕", color: "#bfe7d2" },
    { id: "home", name: "บ้าน", icon: "🏠", color: "#ffd2ac" },
    { id: "daily", name: "ของใช้", icon: "🍴", color: "#c8efdf" },
    { id: "shopping", name: "ช้อปปิ้ง", icon: "🛒", color: "#f7d897" },
    { id: "education", name: "การศึกษา", icon: "📚", color: "#d3efd0" },
    { id: "drink", name: "เครื่องดื่ม", icon: "🧃", color: "#abe2cf" },
    { id: "electric", name: "ไฟฟ้า", icon: "🔌", color: "#e8d7aa" },
    { id: "health", name: "สุขภาพ", icon: "🏥", color: "#ffd0da" },
    { id: "business", name: "ธุรกิจ", icon: "💸", color: "#dbe9a8" },
    { id: "invest", name: "ลงทุน", icon: "🌱", color: "#c7eac8" },
    { id: "game", name: "เกมส์", icon: "🎮", color: "#c9dcff" },
    { id: "love", name: "ความรัก", icon: "💌", color: "#ffd8e9" },
    { id: "pet", name: "สัตว์เลี้ยง", icon: "🐱", color: "#f4dfbf" },
    { id: "child", name: "เด็ก", icon: "🧒", color: "#dee9a6" },
    { id: "sport", name: "กีฬา", icon: "🏈", color: "#ddeac5" },
    { id: "movie", name: "ดูหนัง", icon: "🍿", color: "#ffd2a6" },
    { id: "gift", name: "ของขวัญ", icon: "🎁", color: "#ffc6c9" },
    { id: "salary", name: "เงินเดือน", icon: "💰", color: "#a8d785" },
    { id: "transfer", name: "โอนเงิน", icon: "↔️", color: "#c9dcff" }
  ];

  const topViews = [
    { id: "overview", label: "ภาพรวม" },
    { id: "reports", label: "สรุปรายงาน" },
    { id: "budget", label: "งบประมาณ" },
    { id: "loans", label: "ผ่อนชำระ" },
    { id: "goals", label: "เป้าหมาย" },
    { id: "menu", label: "เมนู" }
  ];

  const bottomViews = [
    { id: "overview", label: "ภาพรวม", icon: "📊" },
    { id: "transactions", label: "ธุรกรรม", icon: "🧾" },
    { id: "add", label: "", icon: "" },
    { id: "wallets", label: "กระเป๋า", icon: "👛" },
    { id: "menu", label: "เมนู", icon: "▦" }
  ];

  const state = loadState();

  function seedState() {
    const today = toISODate(new Date());
    return {
      theme: "sunny",
      view: "overview",
      reportTab: "category",
      reportRange: "month",
      transactionFilter: "all",
      lastSyncedAt: null,
      profile: {
        name: "น้องพอดี",
        caption: "วันนี้ใช้เงินแบบน่ารัก"
      },
      wallets: [
        { id: "daily", name: "เงินซื้อของใช้", icon: "🛍️", balance: 49745, color: "#d5f3ff" },
        { id: "cash", name: "เงินสด", icon: "📺", balance: 800, color: "#d9f6e9" },
        { id: "saving", name: "เงินออม", icon: "🪣", balance: 81000.88, color: "#ffe1d3" },
        { id: "test", name: "ทดสอบบัญชีจ้า", icon: "👛", balance: 15694, color: "#ffe4e6" },
        { id: "wallet", name: "เงินสดล", icon: "📼", balance: 5445.573, color: "#def4e9" },
        { id: "credit", name: "บัตรเครดิต", icon: "💳", balance: -26500, color: "#ece8ff", liability: true }
      ],
      transactions: [
        { id: "tx_1", type: "expense", title: "ข้าวหน้าไก่ทอดซอส", categoryId: "food", walletId: "daily", amount: 119, date: today, note: "มื้อกลางวัน", source: "manual" },
        { id: "tx_2", type: "expense", title: "กาแฟฟาฟา", categoryId: "coffee", walletId: "daily", amount: 85, date: today, note: "แก้วเช้า", source: "manual" },
        { id: "tx_3", type: "expense", title: "เติมเงินรถไฟฟ้า", categoryId: "travel", walletId: "daily", amount: 250, date: today, note: "", source: "bank" },
        { id: "tx_4", type: "expense", title: "ของใช้ในบ้าน", categoryId: "daily", walletId: "daily", amount: 161, date: today, note: "", source: "manual" },
        { id: "tx_5", type: "transfer", title: "โอนเข้าเงินออม", categoryId: "transfer", walletId: "saving", amount: 500, date: today, note: "", source: "manual" },
        { id: "tx_6", type: "income", title: "รายได้เสริม", categoryId: "salary", walletId: "cash", amount: 1200, date: offsetDate(-2), note: "", source: "manual" },
        { id: "tx_7", type: "expense", title: "สังสรรค์กับเพื่อน", categoryId: "fun", walletId: "credit", amount: 1863.667, date: offsetDate(-5), note: "", source: "bank" },
        { id: "tx_8", type: "expense", title: "เสื้อผ้า", categoryId: "clothes", walletId: "daily", amount: 740, date: offsetDate(-7), note: "", source: "manual" },
        { id: "tx_9", type: "expense", title: "ค่าไฟฟ้า", categoryId: "electric", walletId: "daily", amount: 920, date: offsetDate(-10), note: "", source: "bank" }
      ],
      budgets: [
        { id: "b_food", categoryId: "food", amount: 6500 },
        { id: "b_travel", categoryId: "travel", amount: 2200 },
        { id: "b_fun", categoryId: "fun", amount: 3500 },
        { id: "b_daily", categoryId: "daily", amount: 2800 },
        { id: "b_coffee", categoryId: "coffee", amount: 1200 }
      ],
      goals: [
        { id: "g_1", name: "เงินสำรอง 6 เดือน", icon: "🛟", target: 180000, saved: 81000.88, due: "ธ.ค. 2569" },
        { id: "g_2", name: "ทริปญี่ปุ่น", icon: "✈️", target: 65000, saved: 18750, due: "เม.ย. 2570" },
        { id: "g_3", name: "คอมใหม่", icon: "💻", target: 42000, saved: 14300, due: "ก.ย. 2569" }
      ],
      loans: [
        {
          id: "loan_1",
          name: "ผ่อนบ้านสาริน",
          group: "บ้าน",
          asset: "ยานพาหนะ",
          icon: "🏠",
          principal: 50000,
          paidPrincipal: 8291.667,
          interestPaid: 4807.292,
          totalInterest: 6125,
          rate: 6,
          nextPayment: 1250.208,
          totalTerms: 48,
          paidTerms: 26
        },
        {
          id: "loan_2",
          name: "ผ่อนชำระธุรกิจ",
          group: "ธุรกิจ",
          asset: "อุปกรณ์",
          icon: "💸",
          principal: 12000,
          paidPrincipal: 5058,
          interestPaid: 430,
          totalInterest: 900,
          rate: 4.5,
          nextPayment: 890,
          totalTerms: 18,
          paidTerms: 7
        }
      ],
      customCategories: [],
      allocations: [
        { id: "a_need", name: "ใช้จำเป็น", percent: 50, color: "#bfd17f" },
        { id: "a_want", name: "อยากได้", percent: 30, color: "#ffc022" },
        { id: "a_save", name: "ออม/ลงทุน", percent: 20, color: "#ff7ca8" }
      ],
      expectedIncome: 45000,
      dailyLimit: 700
    };
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return seedState();
      const parsed = JSON.parse(saved);
      return {
        ...seedState(),
        ...parsed,
        profile: { ...seedState().profile, ...(parsed.profile || {}) },
        reportRange: parsed.reportRange || "month",
        transactionFilter: parsed.transactionFilter || "all",
        wallets: parsed.wallets || seedState().wallets,
        transactions: parsed.transactions || seedState().transactions,
        budgets: parsed.budgets || seedState().budgets,
        goals: parsed.goals || seedState().goals,
        loans: parsed.loans || seedState().loans,
        customCategories: parsed.customCategories || [],
        allocations: parsed.allocations || seedState().allocations
      };
    } catch (error) {
      console.warn("Cannot load saved state", error);
      return seedState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function render() {
    app.dataset.theme = state.theme;
    app.dataset.view = state.view;
    app.innerHTML = `
      ${renderHeader()}
      ${renderSubNav()}
      <main class="content">${renderView()}</main>
      ${renderBottomNav()}
      <button class="add-fab" type="button" data-action="open-transaction" aria-label="เพิ่มรายการ">+</button>
    `;
    bindAppControls();
  }

  function renderHeader() {
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

  function renderSubNav() {
    if (state.view !== "reports") return "";
    const tabs = [
      { id: "category", label: "ตามหมวดหมู่" },
      { id: "networth", label: "ทรัพย์สินสุทธิ" },
      { id: "time", label: "ตามช่วงเวลา" },
      { id: "tag", label: "ตามแท็ก" }
    ];
    return `
      <nav class="sub-nav" aria-label="ตัวกรองรายงาน">
        ${tabs.map((tab) => `
          <button class="chip ${state.reportTab === tab.id ? "is-active" : ""}" type="button" data-report-tab="${tab.id}">
            ${tab.label}
          </button>
        `).join("")}
      </nav>
    `;
  }

  function renderBottomNav() {
    return `
      <nav class="bottom-nav" aria-label="เมนูล่าง">
        ${bottomViews.map((item) => {
          if (item.id === "add") return `<span class="bottom-item" aria-hidden="true"></span>`;
          const active = state.view === item.id || (item.id === "overview" && state.view === "reports");
          return `
            <button class="bottom-item ${active ? "is-active" : ""}" type="button" data-view="${item.id}">
              <span>${item.icon}</span><span>${item.label}</span>
            </button>
          `;
        }).join("")}
      </nav>
    `;
  }

  function renderView() {
    switch (state.view) {
      case "reports":
        return renderReports();
      case "budget":
        return renderBudget();
      case "loans":
        return renderLoans();
      case "goals":
        return renderGoals();
      case "wallets":
        return renderWallets();
      case "transactions":
        return renderTransactions();
      case "menu":
        return renderMenu();
      default:
        return renderOverview();
    }
  }

  function renderOverview() {
    const totalBalance = state.wallets.filter((wallet) => !wallet.liability).reduce((sum, wallet) => sum + wallet.balance, 0);
    const todayExpense = totalByType("expense", "today");
    const todayIncome = totalByType("income", "today");
    const todayTransfer = totalByType("transfer", "today");
    const ratio = clamp(todayExpense / state.dailyLimit, 0, 1.25);
    const recent = state.transactions.slice(0, 5);

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
        <div class="wallet-grid">
          ${state.wallets.slice(0, 6).map(renderWalletCard).join("")}
        </div>

        <div class="section-title"><h2>แบ่งสัดส่วนเงิน</h2><button class="section-action" type="button" data-action="open-allocation">ปรับ</button></div>
        <div class="allocation-list">
          ${state.allocations.map(renderAllocationItem).join("")}
        </div>

        <div class="section-title"><h2>รายการล่าสุด</h2><button class="section-action" type="button" data-view="transactions">ทั้งหมด</button></div>
        <div class="transaction-list">
          ${recent.map(renderTransactionRow).join("")}
        </div>
      </section>
    `;
  }

  function renderReports() {
    if (state.reportTab === "networth") return renderNetWorthReport();
    if (state.reportTab === "time") return renderTimeReport();
    if (state.reportTab === "tag") return renderTagReport();
    return renderCategoryReport();
  }

  function renderCategoryReport() {
    const rows = expenseByCategory();
    const total = rows.reduce((sum, row) => sum + row.amount, 0);
    const stops = donutStops(rows, total);
    const ranges = [
      { id: "month", label: "กุมภาพันธ์" },
      { id: "weeks12", label: "12 สัปดาห์ที่ผ่านมา" },
      { id: "year", label: "ปีนี้ 2569" },
      { id: "all", label: "ทุกกระเป๋า" }
    ];

    return `
      <section class="view">
        <div class="chip-row">
          ${ranges.map((range) => `
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
              <tr>
                <td>${row.icon} ${escapeHtml(row.name)}</td>
                <td>${total ? Math.round((row.amount / total) * 100) : 0}%</td>
                <td>${formatMoney(row.amount)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </section>
    `;
  }

  function renderNetWorthReport() {
    const assets = assetTotal();
    const creditDebt = Math.abs(state.wallets.filter((wallet) => wallet.liability).reduce((sum, wallet) => sum + wallet.balance, 0));
    const loanDebt = state.loans.reduce((sum, loan) => sum + Math.max(loan.principal - loan.paidPrincipal, 0), 0);
    return `
      <section class="view">
        <article class="card">
          <div class="asset-row">
            <div class="asset-main"><span class="category-icon">🌿</span><strong>ทรัพย์สินสุทธิ</strong></div>
            <p class="money lg good">${formatMoney(assets - creditDebt - loanDebt)}</p>
          </div>
          <div class="asset-row">
            <div class="asset-main"><span class="category-icon">👛</span><span>ทรัพย์สิน</span></div>
            <p class="money md good">${formatMoney(assets)}</p>
          </div>
          <div class="asset-row">
            <div class="asset-main"><span class="category-icon">💳</span><span>หนี้สินบัตรเครดิต</span></div>
            <p class="money md bad">${formatMoney(creditDebt)}</p>
          </div>
          <div class="asset-row">
            <div class="asset-main"><span class="category-icon">🏠</span><span>หนี้สินผ่อนชำระ</span></div>
            <p class="money md bad">${formatMoney(loanDebt)}</p>
          </div>
        </article>
        <div class="section-title"><h2>ทรัพย์สิน</h2></div>
        <div class="asset-list">
          ${state.wallets.filter((wallet) => !wallet.liability).map(renderAssetRow).join("")}
        </div>
      </section>
    `;
  }

  function renderTimeReport() {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = offsetDate(-index);
      const expense = state.transactions
        .filter((tx) => tx.type === "expense" && tx.date === date)
        .reduce((sum, tx) => sum + tx.amount, 0);
      return { date, expense };
    }).reverse();
    const max = Math.max(...days.map((day) => day.expense), 1);
    return `
      <section class="view">
        <div class="section-title"><h2>รายจ่าย 7 วัน</h2></div>
        ${days.map((day) => `
          <div class="allocation-item">
            <div class="allocation-head">
              <strong>${formatDate(day.date)}</strong>
              <span>${formatMoney(day.expense)}</span>
            </div>
            <div class="mini-bar"><span style="width:${(day.expense / max) * 100}%; --bar-color:#ff9aa8"></span></div>
          </div>
        `).join("")}
      </section>
    `;
  }

  function renderTagReport() {
    const sourceRows = ["manual", "bank", "receipt"].map((source) => ({
      source,
      amount: state.transactions
        .filter((tx) => tx.source === source && tx.type === "expense")
        .reduce((sum, tx) => sum + tx.amount, 0)
    }));
    return `
      <section class="view">
        <div class="section-title"><h2>ตามแท็ก</h2></div>
        ${sourceRows.map((row) => `
          <div class="allocation-item">
            <div class="allocation-head">
              <strong>${sourceLabel(row.source)}</strong>
              <span>${formatMoney(row.amount)}</span>
            </div>
            <div class="mini-bar"><span style="width:${Math.min(row.amount / 80, 100)}%; --bar-color:#9ccc87"></span></div>
          </div>
        `).join("")}
      </section>
    `;
  }

  function renderBudget() {
    return `
      <section class="view">
        <div class="section-title"><h2>งบประมาณ</h2><button class="section-action" type="button" data-action="open-budget">+ เพิ่ม</button></div>
        <div class="budget-list">
          ${state.budgets.map(renderBudgetCard).join("")}
        </div>
        <div class="section-title"><h2>หมวดหมู่</h2><button class="section-action" type="button" data-action="open-category">+ เพิ่ม</button></div>
        <div class="category-grid">
          ${allCategories().slice(0, 28).map(renderCategoryTile).join("")}
        </div>
      </section>
    `;
  }

  function renderLoans() {
    return `
      <section class="view">
        <div class="section-title"><h2>ผ่อนชำระ</h2><button class="section-action" type="button" data-action="open-loan">+ เพิ่ม</button></div>
        <div class="loan-list">
          ${state.loans.map(renderLoanCard).join("")}
        </div>
      </section>
    `;
  }

  function renderGoals() {
    return `
      <section class="view">
        <div class="section-title"><h2>เป้าหมายออมเงิน</h2><button class="section-action" type="button" data-action="open-goal">+ เพิ่ม</button></div>
        <div class="goal-grid">
          ${state.goals.map(renderGoalCard).join("")}
        </div>
      </section>
    `;
  }

  function renderWallets() {
    const assets = assetTotal();
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
        <div class="wallet-grid">
          ${state.wallets.map(renderWalletCard).join("")}
        </div>
        <article class="card bank-card">
          <div class="bank-status">
            <span class="category-icon">🏦</span>
            <div>
              <strong>เชื่อมธนาคาร</strong>
              <div class="muted">${state.lastSyncedAt ? `ซิงก์ล่าสุด ${escapeHtml(state.lastSyncedAt)}` : "Sandbox พร้อมทดลอง"}</div>
            </div>
          </div>
          <button class="primary-btn" type="button" data-action="sync-bank">ซิงก์ข้อมูลตัวอย่าง</button>
        </article>
      </section>
    `;
  }

  function renderTransactions() {
    const filters = [
      { id: "all", label: "ทุกประเภท" },
      { id: "expense", label: "รายจ่าย" },
      { id: "income", label: "รายรับ" },
      { id: "transfer", label: "โอนเงิน" }
    ];
    const txs = state.transactionFilter === "all"
      ? state.transactions
      : state.transactions.filter((tx) => tx.type === state.transactionFilter);
    return `
      <section class="view">
        <div class="section-title"><h2>ธุรกรรม</h2><button class="section-action" type="button" data-action="open-transaction">+ เพิ่ม</button></div>
        <div class="chip-row">
          ${filters.map((filter) => `
            <button class="chip ${state.transactionFilter === filter.id ? "is-active" : ""}" type="button" data-transaction-filter="${filter.id}">
              ${filter.label}
            </button>
          `).join("")}
        </div>
        <div class="transaction-list">
          ${txs.length ? txs.map(renderTransactionRow).join("") : `<div class="empty-state">ยังไม่มีรายการ</div>`}
        </div>
      </section>
    `;
  }

  function renderMenu() {
    return `
      <section class="view">
        <div class="section-title"><h2>ธีมสีพื้นหลัง</h2></div>
        <div class="quick-grid">
          <button class="quick-action" type="button" data-theme="sunny"><span>🟨</span><span>ใบเสร็จ</span></button>
          <button class="quick-action" type="button" data-theme="pink"><span>🌸</span><span>หวานนุ่ม</span></button>
          <button class="quick-action" type="button" data-theme="mint"><span>🟩</span><span>มิ้นต์</span></button>
          <button class="quick-action" type="button" data-action="reset-demo"><span>↺</span><span>รีเซ็ตเดโม</span></button>
        </div>
        <article class="card bank-card">
          <div class="bank-status">
            <span class="category-icon">🔐</span>
            <div>
              <strong>ข้อมูลในเครื่อง</strong>
              <div class="muted">บันทึกด้วย localStorage</div>
            </div>
          </div>
          <div class="form-row">
            <button class="ghost-btn" type="button" data-action="export-json">สำรอง JSON</button>
            <button class="ghost-btn" type="button" data-action="export-csv">ส่งออก CSV</button>
          </div>
        </article>
        <div class="section-title"><h2>หมวดหมู่ทั้งหมด</h2></div>
        <div class="category-grid">
          ${allCategories().map(renderCategoryTile).join("")}
        </div>
      </section>
    `;
  }

  function renderWalletCard(wallet) {
    return `
      <article class="wallet-card" style="--wallet-bg:${wallet.color}">
        <span class="wallet-icon">${wallet.icon}</span>
        <div>
          <p class="wallet-name">${escapeHtml(wallet.name)}</p>
          <p class="money md ${wallet.balance < 0 ? "bad" : ""}">${formatMoney(Math.abs(wallet.balance))}</p>
        </div>
        <div class="inline-actions">
          <button class="tiny-btn" type="button" data-action="edit-wallet" data-id="${wallet.id}">แก้ไข</button>
          <button class="tiny-btn danger" type="button" data-action="delete-wallet" data-id="${wallet.id}">ลบ</button>
        </div>
      </article>
    `;
  }

  function renderAllocationItem(item) {
    const amount = state.expectedIncome * (item.percent / 100);
    return `
      <article class="allocation-item">
        <div class="allocation-head">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${item.percent}% · ${formatMoney(amount)}</span>
        </div>
        <div class="mini-bar"><span style="width:${item.percent}%; --bar-color:${item.color}"></span></div>
      </article>
    `;
  }

  function renderTransactionRow(tx) {
    const category = getCategory(tx.categoryId);
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
          <div class="transaction-amount ${amountClass}">${sign}${formatMoney(tx.amount)}</div>
          <button class="tiny-btn" type="button" data-action="edit-transaction" data-id="${tx.id}" aria-label="แก้ไข ${escapeHtml(tx.title)}">แก้ไข</button>
          <button class="tiny-btn danger" type="button" data-action="delete-transaction" data-id="${tx.id}" aria-label="ลบ ${escapeHtml(tx.title)}">ลบ</button>
        </div>
      </article>
    `;
  }

  function renderAssetRow(wallet) {
    return `
      <article class="asset-row">
        <div class="asset-main"><span class="category-icon">${wallet.icon}</span><strong>${escapeHtml(wallet.name)}</strong></div>
        <p class="money md good">${formatMoney(wallet.balance)}</p>
      </article>
    `;
  }

  function renderBudgetCard(budget) {
    const category = getCategory(budget.categoryId);
    const spent = state.transactions
      .filter((tx) => tx.type === "expense" && tx.categoryId === budget.categoryId && inCurrentMonth(tx.date))
      .reduce((sum, tx) => sum + tx.amount, 0);
    const remaining = Math.max(budget.amount - spent, 0);
    const ratio = clamp(spent / budget.amount, 0, 1.4);
    return `
      <article class="budget-card">
        <div class="budget-head">
          <div class="transaction-main"><span class="category-icon" style="background:${category.color}55">${category.icon}</span><strong>${escapeHtml(category.name)}</strong></div>
          <div class="row-actions">
            <span class="tag ${ratio > 1 ? "pink" : "green"}">${ratio > 1 ? "เกินงบ" : "ในงบ"}</span>
            <button class="tiny-btn" type="button" data-action="edit-budget" data-id="${budget.id}">แก้ไข</button>
            <button class="tiny-btn danger" type="button" data-action="delete-budget" data-id="${budget.id}">ลบ</button>
          </div>
        </div>
        <div class="mini-bar"><span style="width:${Math.min(ratio * 100, 100)}%; --bar-color:${ratio > 1 ? "#f778a2" : category.color}"></span></div>
        <div class="budget-stats">
          <div class="stat-box"><div class="muted">ใช้แล้ว</div><strong class="bad">${formatMoney(spent)}</strong></div>
          <div class="stat-box"><div class="muted">คงเหลือ</div><strong class="good">${formatMoney(remaining)}</strong></div>
          <div class="stat-box"><div class="muted">งบ</div><strong>${formatMoney(budget.amount)}</strong></div>
        </div>
      </article>
    `;
  }

  function renderLoanCard(loan) {
    const balance = Math.max(loan.principal - loan.paidPrincipal, 0);
    const ratio = clamp(loan.paidPrincipal / loan.principal, 0, 1);
    return `
      <article class="loan-card">
        <div class="loan-head">
          <div class="transaction-main"><span class="category-icon">${loan.icon}</span><div><strong>${escapeHtml(loan.name)}</strong><div class="muted">${escapeHtml(loan.group)} · ${escapeHtml(loan.asset)}</div></div></div>
          <div class="row-actions">
            <span class="tag green">กำลังผ่อนชำระ</span>
            <button class="tiny-btn" type="button" data-action="pay-loan" data-id="${loan.id}">จ่ายงวด</button>
            <button class="tiny-btn" type="button" data-action="edit-loan" data-id="${loan.id}">แก้ไข</button>
            <button class="tiny-btn danger" type="button" data-action="delete-loan" data-id="${loan.id}">ลบ</button>
          </div>
        </div>
        <div class="loan-stats">
          <div class="stat-box"><div class="muted">จ่ายไปแล้ว</div><strong class="good">${formatMoney(loan.paidPrincipal)}</strong></div>
          <div class="stat-box"><div class="muted">คงเหลือ</div><strong>${formatMoney(balance)}</strong></div>
          <div class="stat-box"><div class="muted">เงินต้น</div><strong>${formatMoney(loan.principal)}</strong></div>
        </div>
        <div class="mini-bar"><span style="width:${ratio * 100}%; --bar-color:#ff8168"></span></div>
        <div class="loan-detail">
          <div class="allocation-head"><span>การคิดดอกเบี้ย</span><span class="tag green">ลดต้นลดดอก</span></div>
          <div class="asset-row"><span>ดอกเบี้ยที่จ่ายแล้ว</span><strong class="good">${formatMoney(loan.interestPaid)}</strong></div>
          <div class="asset-row"><span>ดอกเบี้ยที่ต้องจ่ายทั้งหมด</span><strong>${formatMoney(loan.totalInterest)}</strong></div>
          <div class="asset-row"><span>อัตราดอกเบี้ย</span><strong>${loan.rate}% ต่อปี</strong></div>
          <div class="asset-row"><span>ค่างวดงวดถัดไป</span><strong>${formatMoney(loan.nextPayment)}</strong></div>
        </div>
        <div>
          <div class="allocation-head"><span>ตารางการผ่อนชำระ</span><span>${loan.paidTerms}/${loan.totalTerms}</span></div>
          <div class="installment-grid">
            ${Array.from({ length: loan.totalTerms }, (_, index) => `<span class="installment-pill ${index < loan.paidTerms ? "paid" : ""}">${index + 1}</span>`).join("")}
          </div>
        </div>
      </article>
    `;
  }

  function renderGoalCard(goal) {
    const ratio = clamp(goal.saved / goal.target, 0, 1);
    return `
      <article class="goal-card">
        <span class="category-icon">${goal.icon}</span>
        <div>
          <strong>${escapeHtml(goal.name)}</strong>
          <div class="muted">ครบ ${escapeHtml(goal.due)}</div>
        </div>
        <div class="mini-bar"><span style="width:${ratio * 100}%; --bar-color:#91c36b"></span></div>
        <div class="allocation-head"><span>${formatMoney(goal.saved)}</span><strong>${Math.round(ratio * 100)}%</strong></div>
        <div class="inline-actions">
          <button class="tiny-btn" type="button" data-action="deposit-goal" data-id="${goal.id}">เติมเงิน</button>
          <button class="tiny-btn" type="button" data-action="edit-goal" data-id="${goal.id}">แก้ไข</button>
          <button class="tiny-btn danger" type="button" data-action="delete-goal" data-id="${goal.id}">ลบ</button>
        </div>
      </article>
    `;
  }

  function renderCategoryTile(category) {
    return `<article class="category-tile"><span class="category-icon" style="background:${category.color}55">${category.icon}</span><span>${escapeHtml(category.name)}</span></article>`;
  }

  function openTransactionSheet(defaultType = "expense", transaction = null) {
    const today = toISODate(new Date());
    const tx = transaction || {
      id: "",
      type: defaultType,
      title: "",
      amount: "",
      date: today,
      categoryId: "food",
      walletId: "daily",
      note: ""
    };
    openSheet(`
      <div class="sheet-head">
        <h2>${tx.id ? "แก้ไขรายการ" : "บันทึกรายการ"}</h2>
        <button class="close-btn" type="button" data-close aria-label="ปิด">×</button>
      </div>
      <form class="form-grid" id="transaction-form">
        <input type="hidden" name="id" value="${tx.id}">
        <input type="hidden" name="type" value="${tx.type}">
        <div class="segmented" data-segment-group="type">
          ${["expense", "income", "transfer", "payment"].map((type) => `<button class="seg-btn ${type === tx.type ? "is-active" : ""}" type="button" data-segment="${type}">${typeLabel(type)}</button>`).join("")}
        </div>
        <div class="field">
          <label for="tx-title">ชื่อรายการ</label>
          <input id="tx-title" name="title" required placeholder="เช่น ข้าวกลางวัน" value="${escapeHtml(tx.title)}">
        </div>
        <div class="form-row">
          <div class="field">
            <label for="tx-amount">จำนวนเงิน</label>
            <input id="tx-amount" name="amount" type="number" min="1" step="0.01" required placeholder="0" value="${tx.amount}">
          </div>
          <div class="field">
            <label for="tx-date">วันที่</label>
            <input id="tx-date" name="date" type="date" value="${tx.date || today}" required>
          </div>
        </div>
        <div class="form-row">
          <div class="field">
            <label for="tx-category">หมวดหมู่</label>
          <select id="tx-category" name="categoryId">${categoryOptions(tx.categoryId)}</select>
          </div>
          <div class="field">
            <label for="tx-wallet">กระเป๋า</label>
            <select id="tx-wallet" name="walletId">${walletOptions(tx.walletId)}</select>
          </div>
        </div>
        <div class="field">
          <label for="tx-note">โน้ต</label>
          <textarea id="tx-note" name="note" placeholder="รายละเอียดเพิ่มเติม">${escapeHtml(tx.note)}</textarea>
        </div>
        <button class="primary-btn" type="submit">${tx.id ? "บันทึกการแก้ไข" : "บันทึกรายการ"}</button>
      </form>
    `);
  }

  function openReceiptSheet() {
    openSheet(`
      <div class="sheet-head">
        <h2>สแกนใบเสร็จ</h2>
        <button class="close-btn" type="button" data-close aria-label="ปิด">×</button>
      </div>
      <div class="form-grid">
        <div class="receipt-preview">
          <div class="receipt-thumb" id="receipt-thumb">📄</div>
          <div>
            <div class="allocation-head"><strong>สแกนใบเสร็จสำเร็จ</strong><span class="tag green">เดโม OCR</span></div>
            <div class="chip-row" style="margin-top:8px">
              <span class="tag green">พบ: 1 ใบเสร็จ</span>
              <span class="tag purple">2 รายการ</span>
              <span class="tag">จาก: 7-Eleven</span>
            </div>
          </div>
        </div>
        <div class="field">
          <label for="receipt-file">รูปใบเสร็จ</label>
          <input id="receipt-file" type="file" accept="image/*" capture="environment">
        </div>
        <div class="form-row">
          <div class="field">
            <label for="receipt-wallet">กระเป๋า</label>
            <select id="receipt-wallet">${walletOptions("daily")}</select>
          </div>
          <div class="field">
            <label for="receipt-date">วันที่</label>
            <input id="receipt-date" type="date" value="${toISODate(new Date())}">
          </div>
        </div>
        <button class="ghost-btn" type="button" data-action="scan-demo">อ่านรายการ</button>
        <div class="scan-items" id="scan-result">
          ${renderScanItems(sampleReceiptItems())}
        </div>
        <button class="primary-btn" type="button" data-action="record-scan">บันทึกรายการ</button>
      </div>
    `);
  }

  function openBankSheet() {
    openSheet(`
      <div class="sheet-head">
        <h2>เชื่อมธนาคาร</h2>
        <button class="close-btn" type="button" data-close aria-label="ปิด">×</button>
      </div>
      <div class="form-grid">
        <article class="card bank-card">
          <div class="bank-status">
            <span class="category-icon">🏦</span>
            <div>
              <strong>Sandbox Connector</strong>
              <div class="muted">${state.lastSyncedAt ? `ซิงก์ล่าสุด ${escapeHtml(state.lastSyncedAt)}` : "ยังไม่เคยซิงก์"}</div>
            </div>
          </div>
          <button class="primary-btn" type="button" data-action="sync-bank">ซิงก์ข้อมูลตัวอย่าง</button>
        </article>
        <div class="allocation-list">
          <div class="allocation-item"><div class="allocation-head"><strong>Kasikorn</strong><span class="tag">OAuth</span></div><div class="mini-bar"><span style="width:64%; --bar-color:#91c36b"></span></div></div>
          <div class="allocation-item"><div class="allocation-head"><strong>SCB</strong><span class="tag">API</span></div><div class="mini-bar"><span style="width:48%; --bar-color:#ffc022"></span></div></div>
          <div class="allocation-item"><div class="allocation-head"><strong>PromptPay</strong><span class="tag">QR/Statement</span></div><div class="mini-bar"><span style="width:82%; --bar-color:#f778a2"></span></div></div>
        </div>
      </div>
    `);
  }

  function openInstallGuideSheet() {
    openSheet(`
      <div class="sheet-head">
        <h2>ติดตั้งบน iPhone</h2>
        <button class="close-btn" type="button" data-close aria-label="ปิด">×</button>
      </div>
      <div class="form-grid">
        <article class="card bank-card">
          <div class="bank-status">
            <span class="category-icon">📱</span>
            <div>
              <strong>ใช้แบบแอปบนหน้าจอหลัก</strong>
              <div class="muted">เปิดผ่าน Safari แล้วกดแชร์ จากนั้นเลือก Add to Home Screen</div>
            </div>
          </div>
        </article>
        <div class="allocation-list">
          <div class="allocation-item"><div class="allocation-head"><strong>1. เปิด URL นี้ใน Safari</strong><span class="tag">localhost/HTTPS</span></div></div>
          <div class="allocation-item"><div class="allocation-head"><strong>2. กดปุ่ม Share</strong><span class="tag">สี่เหลี่ยมลูกศรขึ้น</span></div></div>
          <div class="allocation-item"><div class="allocation-head"><strong>3. เลือก Add to Home Screen</strong><span class="tag green">ใช้ออฟไลน์หลังติดตั้ง</span></div></div>
        </div>
      </div>
    `);
  }

  function openAllocationSheet() {
    openSheet(`
      <div class="sheet-head">
        <h2>แบ่งสัดส่วนเงิน</h2>
        <button class="close-btn" type="button" data-close aria-label="ปิด">×</button>
      </div>
      <form class="form-grid" id="allocation-form">
        <div class="field">
          <label for="expected-income">รายรับต่อเดือน</label>
          <input id="expected-income" name="expectedIncome" type="number" min="0" step="100" value="${state.expectedIncome}">
        </div>
        ${state.allocations.map((item) => `
          <div class="field">
            <label for="${item.id}">${escapeHtml(item.name)} (${item.percent}%)</label>
            <input id="${item.id}" name="${item.id}" type="range" min="0" max="100" value="${item.percent}">
          </div>
        `).join("")}
        <button class="primary-btn" type="submit">บันทึกสัดส่วน</button>
      </form>
    `);
  }

  function openBudgetSheet(budget = null) {
    const item = budget || { id: "", categoryId: "food", amount: "" };
    openSheet(`
      <div class="sheet-head">
        <h2>${item.id ? "แก้ไขงบประมาณ" : "เพิ่มงบประมาณ"}</h2>
        <button class="close-btn" type="button" data-close aria-label="ปิด">×</button>
      </div>
      <form class="form-grid" id="budget-form">
        <input type="hidden" name="id" value="${item.id}">
        <div class="field">
          <label for="budget-category">หมวดหมู่</label>
          <select id="budget-category" name="categoryId">${categoryOptions(item.categoryId)}</select>
        </div>
        <div class="field">
          <label for="budget-amount">วงเงินต่อเดือน</label>
          <input id="budget-amount" name="amount" type="number" min="1" step="1" required placeholder="0" value="${item.amount}">
        </div>
        <button class="primary-btn" type="submit">${item.id ? "บันทึกการแก้ไข" : "บันทึกงบประมาณ"}</button>
      </form>
    `);
  }

  function openCategorySheet() {
    openSheet(`
      <div class="sheet-head">
        <h2>เลือกหมวดหมู่</h2>
        <button class="close-btn" type="button" data-close aria-label="ปิด">×</button>
      </div>
      <form class="form-grid" id="category-form">
        <div class="form-row">
          <div class="field">
            <label for="category-icon">ไอคอน</label>
            <input id="category-icon" name="icon" maxlength="4" value="✨" required>
          </div>
          <div class="field">
            <label for="category-color">สี</label>
            <input id="category-color" name="color" type="color" value="#ffd86b">
          </div>
        </div>
        <div class="field">
          <label for="category-name">ชื่อหมวดหมู่</label>
          <input id="category-name" name="name" required placeholder="เช่น งานอดิเรก">
        </div>
        <button class="primary-btn" type="submit">เพิ่มหมวดหมู่</button>
      </form>
      <div class="section-title"><h3>หมวดหมู่ทั้งหมด</h3></div>
      <div class="category-grid">${allCategories().map(renderCategoryTile).join("")}</div>
    `);
  }

  function openWalletSheet(wallet = null) {
    const item = wallet || { id: "", icon: "👛", color: "#d5f3ff", name: "", balance: 0, liability: false };
    openSheet(`
      <div class="sheet-head">
        <h2>${item.id ? "แก้ไขกระเป๋า" : "เพิ่มกระเป๋า"}</h2>
        <button class="close-btn" type="button" data-close aria-label="ปิด">×</button>
      </div>
      <form class="form-grid" id="wallet-form">
        <input type="hidden" name="id" value="${item.id}">
        <div class="form-row">
          <div class="field">
            <label for="wallet-icon">ไอคอน</label>
            <input id="wallet-icon" name="icon" maxlength="4" value="${escapeHtml(item.icon)}" required>
          </div>
          <div class="field">
            <label for="wallet-color">สีพื้น</label>
            <input id="wallet-color" name="color" type="color" value="${item.color || "#d5f3ff"}">
          </div>
        </div>
        <div class="field">
          <label for="wallet-name">ชื่อกระเป๋า</label>
          <input id="wallet-name" name="name" required placeholder="เช่น บัญชีเงินเดือน" value="${escapeHtml(item.name)}">
        </div>
        <div class="form-row">
          <div class="field">
            <label for="wallet-balance">ยอดเริ่มต้น</label>
            <input id="wallet-balance" name="balance" type="number" step="0.01" value="${Math.abs(item.balance || 0)}">
          </div>
          <div class="field">
            <label for="wallet-kind">ประเภท</label>
            <select id="wallet-kind" name="kind">
              <option value="asset" ${item.liability ? "" : "selected"}>ทรัพย์สิน</option>
              <option value="liability" ${item.liability ? "selected" : ""}>หนี้สิน</option>
            </select>
          </div>
        </div>
        <button class="primary-btn" type="submit">${item.id ? "บันทึกการแก้ไข" : "บันทึกกระเป๋า"}</button>
      </form>
    `);
  }

  function openGoalSheet(goal = null) {
    const item = goal || { id: "", icon: "🎯", due: "ธ.ค. 2569", name: "", target: "", saved: 0 };
    openSheet(`
      <div class="sheet-head">
        <h2>${item.id ? "แก้ไขเป้าหมาย" : "เพิ่มเป้าหมาย"}</h2>
        <button class="close-btn" type="button" data-close aria-label="ปิด">×</button>
      </div>
      <form class="form-grid" id="goal-form">
        <input type="hidden" name="id" value="${item.id}">
        <div class="form-row">
          <div class="field">
            <label for="goal-icon">ไอคอน</label>
            <input id="goal-icon" name="icon" maxlength="4" value="${escapeHtml(item.icon)}" required>
          </div>
          <div class="field">
            <label for="goal-due">ครบกำหนด</label>
            <input id="goal-due" name="due" value="${escapeHtml(item.due)}">
          </div>
        </div>
        <div class="field">
          <label for="goal-name">ชื่อเป้าหมาย</label>
          <input id="goal-name" name="name" required placeholder="เช่น เงินดาวน์รถ" value="${escapeHtml(item.name)}">
        </div>
        <div class="form-row">
          <div class="field">
            <label for="goal-target">เป้าหมาย</label>
            <input id="goal-target" name="target" type="number" min="1" step="1" required value="${item.target}">
          </div>
          <div class="field">
            <label for="goal-saved">ออมแล้ว</label>
            <input id="goal-saved" name="saved" type="number" min="0" step="1" value="${item.saved}">
          </div>
        </div>
        <button class="primary-btn" type="submit">${item.id ? "บันทึกการแก้ไข" : "บันทึกเป้าหมาย"}</button>
      </form>
    `);
  }

  function openGoalDepositSheet(goal) {
    openSheet(`
      <div class="sheet-head">
        <h2>เติมเงินเป้าหมาย</h2>
        <button class="close-btn" type="button" data-close aria-label="ปิด">×</button>
      </div>
      <form class="form-grid" id="goal-deposit-form">
        <input type="hidden" name="id" value="${goal.id}">
        <div class="field">
          <label>เป้าหมาย</label>
          <input value="${escapeHtml(goal.name)}" readonly>
        </div>
        <div class="field">
          <label for="goal-deposit-amount">จำนวนเงินที่เติม</label>
          <input id="goal-deposit-amount" name="amount" type="number" min="1" step="1" required placeholder="0">
        </div>
        <button class="primary-btn" type="submit">เติมเงิน</button>
      </form>
    `);
  }

  function openLoanSheet(loan = null) {
    const item = loan || { id: "", icon: "🏠", rate: 6, name: "", principal: "", paidPrincipal: 0, totalTerms: 12, paidTerms: 0 };
    openSheet(`
      <div class="sheet-head">
        <h2>${item.id ? "แก้ไขผ่อนชำระ" : "เพิ่มผ่อนชำระ"}</h2>
        <button class="close-btn" type="button" data-close aria-label="ปิด">×</button>
      </div>
      <form class="form-grid" id="loan-form">
        <input type="hidden" name="id" value="${item.id}">
        <div class="form-row">
          <div class="field">
            <label for="loan-icon">ไอคอน</label>
            <input id="loan-icon" name="icon" maxlength="4" value="${escapeHtml(item.icon)}" required>
          </div>
          <div class="field">
            <label for="loan-rate">ดอกเบี้ยต่อปี (%)</label>
            <input id="loan-rate" name="rate" type="number" min="0" step="0.01" value="${item.rate}">
          </div>
        </div>
        <div class="field">
          <label for="loan-name">ชื่อผ่อนชำระ</label>
          <input id="loan-name" name="name" required placeholder="เช่น ผ่อนโทรศัพท์" value="${escapeHtml(item.name)}">
        </div>
        <div class="form-row">
          <div class="field">
            <label for="loan-principal">เงินต้น</label>
            <input id="loan-principal" name="principal" type="number" min="1" step="1" required value="${item.principal}">
          </div>
          <div class="field">
            <label for="loan-paid">จ่ายเงินต้นแล้ว</label>
            <input id="loan-paid" name="paidPrincipal" type="number" min="0" step="1" value="${item.paidPrincipal}">
          </div>
        </div>
        <div class="form-row">
          <div class="field">
            <label for="loan-terms">จำนวนงวด</label>
            <input id="loan-terms" name="totalTerms" type="number" min="1" max="120" step="1" value="${item.totalTerms}">
          </div>
          <div class="field">
            <label for="loan-paid-terms">จ่ายแล้วกี่งวด</label>
            <input id="loan-paid-terms" name="paidTerms" type="number" min="0" max="120" step="1" value="${item.paidTerms}">
          </div>
        </div>
        <button class="primary-btn" type="submit">${item.id ? "บันทึกการแก้ไข" : "บันทึกผ่อนชำระ"}</button>
      </form>
    `);
  }

  function openSheet(html) {
    sheetRoot.innerHTML = `
      <div class="sheet-backdrop" data-close>
        <section class="sheet" role="dialog" aria-modal="true" onclick="event.stopPropagation()">
          ${html}
        </section>
      </div>
    `;
    bindSheetControls();
  }

  function closeSheet() {
    sheetRoot.innerHTML = "";
  }

  function handleTransactionSubmit(form) {
    const data = new FormData(form);
    const id = String(data.get("id") || "");
    const type = data.get("type");
    const amount = Number(data.get("amount"));
    const walletId = data.get("walletId");
    const tx = {
      id: id || makeId("tx"),
      type,
      title: String(data.get("title") || typeLabel(type)).trim(),
      categoryId: String(data.get("categoryId") || "food"),
      walletId,
      amount,
      date: String(data.get("date")),
      note: String(data.get("note") || ""),
      source: "manual"
    };
    const existingIndex = state.transactions.findIndex((item) => item.id === id);
    if (existingIndex >= 0) {
      revertWalletChange(state.transactions[existingIndex].walletId, state.transactions[existingIndex].type, state.transactions[existingIndex].amount);
      state.transactions.splice(existingIndex, 1);
    }
    state.transactions.unshift(tx);
    applyWalletChange(walletId, type, amount);
    saveState();
    closeSheet();
    render();
    toast(id ? "แก้ไขรายการแล้ว" : "บันทึกรายการแล้ว");
  }

  function handleAllocationSubmit(form) {
    const data = new FormData(form);
    state.expectedIncome = Number(data.get("expectedIncome")) || state.expectedIncome;
    state.allocations = state.allocations.map((item) => ({ ...item, percent: Number(data.get(item.id)) || 0 }));
    saveState();
    closeSheet();
    render();
    toast("บันทึกสัดส่วนแล้ว");
  }

  function handleBudgetSubmit(form) {
    const data = new FormData(form);
    const id = String(data.get("id") || "");
    const categoryId = String(data.get("categoryId"));
    const amount = Number(data.get("amount")) || 0;
    const existing = state.budgets.find((budget) => budget.id === id) || state.budgets.find((budget) => budget.categoryId === categoryId);
    if (existing) existing.amount = amount;
    else state.budgets.unshift({ id: makeId("budget"), categoryId, amount });
    if (existing) existing.categoryId = categoryId;
    saveState();
    closeSheet();
    state.view = "budget";
    render();
    toast("บันทึกงบประมาณแล้ว");
  }

  function handleCategorySubmit(form) {
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    if (!name) return;
    state.customCategories.unshift({
      id: makeId("cat"),
      name,
      icon: String(data.get("icon") || "✨").trim() || "✨",
      color: String(data.get("color") || "#ffd86b")
    });
    saveState();
    closeSheet();
    render();
    toast("เพิ่มหมวดหมู่แล้ว");
  }

  function handleWalletSubmit(form) {
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
    saveState();
    closeSheet();
    state.view = "wallets";
    render();
    toast(id ? "แก้ไขกระเป๋าแล้ว" : "เพิ่มกระเป๋าแล้ว");
  }

  function handleGoalSubmit(form) {
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
    saveState();
    closeSheet();
    state.view = "goals";
    render();
    toast(id ? "แก้ไขเป้าหมายแล้ว" : "เพิ่มเป้าหมายแล้ว");
  }

  function handleGoalDepositSubmit(form) {
    const data = new FormData(form);
    const id = String(data.get("id") || "");
    const goal = state.goals.find((item) => item.id === id);
    if (!goal) {
      toast("ไม่พบเป้าหมายนี้");
      return;
    }
    goal.saved = Math.min(goal.target, goal.saved + (Number(data.get("amount")) || 0));
    saveState();
    closeSheet();
    state.view = "goals";
    render();
    toast("เติมเงินเป้าหมายแล้ว");
  }

  function handleLoanSubmit(form) {
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
    saveState();
    closeSheet();
    state.view = "loans";
    render();
    toast(id ? "แก้ไขผ่อนชำระแล้ว" : "เพิ่มผ่อนชำระแล้ว");
  }

  function syncBankDemo() {
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
    saveState();
    closeSheet();
    render();
    toast("ซิงก์ข้อมูลตัวอย่างแล้ว");
  }

  function recordScanItems() {
    const walletId = document.querySelector("#receipt-wallet")?.value || "daily";
    const date = document.querySelector("#receipt-date")?.value || toISODate(new Date());
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
    saveState();
    closeSheet();
    render();
    toast("บันทึกรายการจากใบเสร็จแล้ว");
  }

  function applyWalletChange(walletId, type, amount) {
    const wallet = state.wallets.find((item) => item.id === walletId);
    if (!wallet || Number.isNaN(amount)) return;
    if (type === "income") wallet.balance += amount;
    if (type === "expense" || type === "payment") wallet.balance -= amount;
    if (type === "transfer") wallet.balance += amount;
  }

  function revertWalletChange(walletId, type, amount) {
    const wallet = state.wallets.find((item) => item.id === walletId);
    if (!wallet || Number.isNaN(amount)) return;
    if (type === "income") wallet.balance -= amount;
    if (type === "expense" || type === "payment") wallet.balance += amount;
    if (type === "transfer") wallet.balance -= amount;
  }

  function editTransaction(id) {
    const tx = state.transactions.find((item) => item.id === id);
    if (!tx) {
      toast("ไม่พบรายการนี้");
      return;
    }
    openTransactionSheet(tx.type, tx);
  }

  function deleteTransaction(id) {
    const index = state.transactions.findIndex((item) => item.id === id);
    if (index < 0) {
      toast("ไม่พบรายการนี้");
      return;
    }
    const [tx] = state.transactions.splice(index, 1);
    revertWalletChange(tx.walletId, tx.type, tx.amount);
    saveState();
    render();
    toast("ลบรายการแล้ว");
  }

  function editBudget(id) {
    const budget = state.budgets.find((item) => item.id === id);
    if (!budget) {
      toast("ไม่พบงบนี้");
      return;
    }
    openBudgetSheet(budget);
  }

  function deleteBudget(id) {
    const index = state.budgets.findIndex((item) => item.id === id);
    if (index < 0) {
      toast("ไม่พบงบนี้");
      return;
    }
    state.budgets.splice(index, 1);
    saveState();
    render();
    toast("ลบงบประมาณแล้ว");
  }

  function editWallet(id) {
    const wallet = state.wallets.find((item) => item.id === id);
    if (!wallet) {
      toast("ไม่พบกระเป๋านี้");
      return;
    }
    openWalletSheet(wallet);
  }

  function deleteWallet(id) {
    if (state.transactions.some((tx) => tx.walletId === id)) {
      toast("ลบไม่ได้ เพราะมีธุรกรรมในกระเป๋านี้");
      return;
    }
    const index = state.wallets.findIndex((item) => item.id === id);
    if (index < 0) {
      toast("ไม่พบกระเป๋านี้");
      return;
    }
    state.wallets.splice(index, 1);
    saveState();
    render();
    toast("ลบกระเป๋าแล้ว");
  }

  function editGoal(id) {
    const goal = state.goals.find((item) => item.id === id);
    if (!goal) {
      toast("ไม่พบเป้าหมายนี้");
      return;
    }
    openGoalSheet(goal);
  }

  function depositGoal(id) {
    const goal = state.goals.find((item) => item.id === id);
    if (!goal) {
      toast("ไม่พบเป้าหมายนี้");
      return;
    }
    openGoalDepositSheet(goal);
  }

  function deleteGoal(id) {
    const index = state.goals.findIndex((item) => item.id === id);
    if (index < 0) {
      toast("ไม่พบเป้าหมายนี้");
      return;
    }
    state.goals.splice(index, 1);
    saveState();
    render();
    toast("ลบเป้าหมายแล้ว");
  }

  function editLoan(id) {
    const loan = state.loans.find((item) => item.id === id);
    if (!loan) {
      toast("ไม่พบรายการผ่อนชำระนี้");
      return;
    }
    openLoanSheet(loan);
  }

  function payLoan(id) {
    const loan = state.loans.find((item) => item.id === id);
    if (!loan) {
      toast("ไม่พบรายการผ่อนชำระนี้");
      return;
    }
    if (loan.paidTerms >= loan.totalTerms) {
      toast("รายการนี้ผ่อนครบแล้ว");
      return;
    }
    const balance = Math.max(loan.principal - loan.paidPrincipal, 0);
    const remainingTerms = Math.max(loan.totalTerms - loan.paidTerms, 1);
    const principalPart = Math.min(balance, loan.nextPayment || Math.round(balance / remainingTerms));
    loan.paidTerms += 1;
    loan.paidPrincipal = Math.min(loan.principal, loan.paidPrincipal + principalPart);
    loan.interestPaid += Math.round((principalPart * loan.rate) / 100 / 12);
    loan.nextPayment = Math.max(Math.round((loan.principal - loan.paidPrincipal) / Math.max(loan.totalTerms - loan.paidTerms, 1)), 0);
    saveState();
    render();
    toast("บันทึกจ่ายงวดแล้ว");
  }

  function deleteLoan(id) {
    const index = state.loans.findIndex((item) => item.id === id);
    if (index < 0) {
      toast("ไม่พบรายการผ่อนชำระนี้");
      return;
    }
    state.loans.splice(index, 1);
    saveState();
    render();
    toast("ลบผ่อนชำระแล้ว");
  }

  function exportJson() {
    downloadFile(`lip-in-money-${toISODate(new Date())}.json`, JSON.stringify(state, null, 2), "application/json");
    toast("ส่งออก JSON แล้ว");
  }

  function exportCsv() {
    const rows = [
      ["date", "type", "title", "category", "wallet", "amount", "source", "note"],
      ...state.transactions.map((tx) => {
        const category = getCategory(tx.categoryId);
        const wallet = state.wallets.find((item) => item.id === tx.walletId);
        return [tx.date, tx.type, tx.title, category.name, wallet?.name || "", tx.amount, tx.source, tx.note || ""];
      })
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    downloadFile(`lip-in-transactions-${toISODate(new Date())}.csv`, "\uFEFF" + csv, "text/csv;charset=utf-8");
    toast("ส่งออก CSV แล้ว");
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function sampleReceiptItems() {
    return [
      { title: "สเปรย์เนวี่อิเล็กซิตร", amount: 99 },
      { title: "น้ำมนต์ข้าวโพดวิปฟาร์ม", amount: 25 }
    ];
  }

  function renderScanItems(items) {
    return items.map((item) => `
      <div class="scan-item">
        <div class="transaction-main"><span class="category-icon">🍜</span><div><strong>${escapeHtml(item.title)}</strong><div class="muted">อาหาร · ใบเสร็จที่ 1</div></div></div>
        <strong class="bad">${formatMoney(item.amount)}</strong>
      </div>
    `).join("");
  }

  function categoryOptions(selected = "food") {
    return allCategories().map((category) => `<option value="${category.id}" ${category.id === selected ? "selected" : ""}>${category.icon} ${escapeHtml(category.name)}</option>`).join("");
  }

  function walletOptions(selected = "daily") {
    return state.wallets.map((wallet) => `<option value="${wallet.id}" ${wallet.id === selected ? "selected" : ""}>${wallet.icon} ${escapeHtml(wallet.name)}</option>`).join("");
  }

  function expenseByCategory() {
    const map = new Map();
    state.transactions
      .filter((tx) => tx.type === "expense" && inCurrentMonth(tx.date))
      .forEach((tx) => {
        const category = getCategory(tx.categoryId);
        const row = map.get(category.id) || { ...category, amount: 0 };
        row.amount += tx.amount;
        map.set(category.id, row);
      });
    return [...map.values()].sort((a, b) => b.amount - a.amount);
  }

  function donutStops(rows, total) {
    if (!total || !rows.length) return "#ece7df 0% 100%";
    let cursor = 0;
    return rows.map((row) => {
      const start = cursor;
      cursor += (row.amount / total) * 100;
      return `${row.color} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
    }).join(", ");
  }

  function getCategory(id) {
    return allCategories().find((category) => category.id === id) || categories[0];
  }

  function allCategories() {
    return [...categories, ...(state.customCategories || [])];
  }

  function totalByType(type, period) {
    return state.transactions
      .filter((tx) => tx.type === type)
      .filter((tx) => (period === "today" ? tx.date === toISODate(new Date()) : true))
      .reduce((sum, tx) => sum + tx.amount, 0);
  }

  function assetTotal() {
    return state.wallets.filter((wallet) => !wallet.liability).reduce((sum, wallet) => sum + wallet.balance, 0);
  }

  function inCurrentMonth(dateString) {
    return dateString.slice(0, 7) === toISODate(new Date()).slice(0, 7);
  }

  function formatMoney(value) {
    return `${new Intl.NumberFormat("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(Number(value) || 0)} บาท`;
  }

  function formatPercent(value) {
    return `${new Intl.NumberFormat("th-TH", { maximumFractionDigits: 1 }).format((Number(value) || 0) * 100)}%`;
  }

  function formatDate(dateString) {
    return new Date(`${dateString}T00:00:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
  }

  function toISODate(date) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function offsetDate(offset) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return toISODate(date);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function sourceLabel(source) {
    const labels = { manual: "จดเอง", bank: "ธนาคาร", receipt: "ใบเสร็จ" };
    return labels[source] || "รายการ";
  }

  function typeLabel(type) {
    const labels = { expense: "รายจ่าย", income: "รายรับ", transfer: "โอนเงิน", payment: "ชำระ" };
    return labels[type] || type;
  }

  function makeId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function csvCell(value) {
    return `"${String(value ?? "").replaceAll('"', '""')}"`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function toast(message) {
    toastRoot.innerHTML = `<div class="toast">${escapeHtml(message)}</div>`;
    window.setTimeout(() => {
      toastRoot.innerHTML = "";
    }, 2300);
  }

  let lastDelegatedEvent = { key: "", time: 0 };

  function shouldSkipDuplicate(key) {
    const now = Date.now();
    if (lastDelegatedEvent.key === key && now - lastDelegatedEvent.time < 350) return true;
    lastDelegatedEvent = { key, time: now };
    return false;
  }

  function handleDelegatedInteraction(event, root = document) {
    const themeButton = closestFromEvent(event, "[data-theme]");
    if (themeButton && root.contains(themeButton)) {
      if (shouldSkipDuplicate(`theme:${themeButton.dataset.theme}`)) return;
      state.theme = themeButton.dataset.theme;
      saveState();
      render();
      return;
    }

    const viewButton = closestFromEvent(event, "[data-view]");
    if (viewButton && root.contains(viewButton)) {
      if (shouldSkipDuplicate(`view:${viewButton.dataset.view}`)) return;
      state.view = viewButton.dataset.view;
      saveState();
      render();
      return;
    }

    const reportButton = closestFromEvent(event, "[data-report-tab]");
    if (reportButton && root.contains(reportButton)) {
      if (shouldSkipDuplicate(`report:${reportButton.dataset.reportTab}`)) return;
      state.reportTab = reportButton.dataset.reportTab;
      saveState();
      render();
      return;
    }

    const reportRangeButton = closestFromEvent(event, "[data-report-range]");
    if (reportRangeButton && root.contains(reportRangeButton)) {
      if (shouldSkipDuplicate(`report-range:${reportRangeButton.dataset.reportRange}`)) return;
      state.reportRange = reportRangeButton.dataset.reportRange;
      saveState();
      render();
      return;
    }

    const transactionFilterButton = closestFromEvent(event, "[data-transaction-filter]");
    if (transactionFilterButton && root.contains(transactionFilterButton)) {
      if (shouldSkipDuplicate(`transaction-filter:${transactionFilterButton.dataset.transactionFilter}`)) return;
      state.transactionFilter = transactionFilterButton.dataset.transactionFilter;
      saveState();
      render();
      return;
    }

    const actionButton = closestFromEvent(event, "[data-action]");
    if (!actionButton || !root.contains(actionButton)) return;
    if (shouldSkipDuplicate(`action:${actionButton.dataset.action}`)) return;
    handleAction(actionButton.dataset.action, actionButton);
  }

  app.addEventListener("pointerup", (event) => handleDelegatedInteraction(event, app));
  app.addEventListener("click", (event) => handleDelegatedInteraction(event, app));
  if (document.addEventListener) {
    document.addEventListener("click", (event) => {
      if (sheetRoot.contains(event.target)) return;
      handleDelegatedInteraction(event, app);
    }, true);
    document.addEventListener("touchend", (event) => {
      if (sheetRoot.contains(event.target)) return;
      handleDelegatedInteraction(event, app);
    }, true);
  }

  function handleSheetInteraction(event) {
    if (closestFromEvent(event, "[data-close]")) {
      if (shouldSkipDuplicate("close:sheet")) return;
      closeSheet();
      return;
    }
    const segment = closestFromEvent(event, "[data-segment]");
    if (segment) {
      if (shouldSkipDuplicate(`segment:${segment.dataset.segment}`)) return;
      const group = segment.closest("[data-segment-group]");
      const input = group?.parentElement?.querySelector(`input[name="${group.dataset.segmentGroup}"]`);
      if (input) input.value = segment.dataset.segment;
      group.querySelectorAll(".seg-btn").forEach((button) => button.classList.remove("is-active"));
      segment.classList.add("is-active");
      return;
    }
    const actionButton = closestFromEvent(event, "[data-action]");
    if (!actionButton) return;
    if (shouldSkipDuplicate(`sheet-action:${actionButton.dataset.action}`)) return;
    handleAction(actionButton.dataset.action, actionButton);
  }

  function closestFromEvent(event, selector) {
    let target = event.target;
    if (!target) return null;
    if (target.nodeType === 3) target = target.parentElement;
    if (!target?.closest) return null;
    return target.closest(selector);
  }

  function bindAppControls() {
    app.querySelectorAll("[data-theme], [data-view], [data-report-tab], [data-report-range], [data-transaction-filter], [data-action]").forEach((element) => {
      element.setAttribute("onclick", "window.lipInTapFromElement(this,event);return false;");
      const handler = (event) => {
        event.preventDefault();
        handleDelegatedInteraction(event, app);
      };
      element.onpointerup = handler;
      element.onclick = handler;
    });
  }

  function bindSheetControls() {
    sheetRoot.querySelectorAll("[data-close], [data-segment], [data-action]").forEach((element) => {
      element.setAttribute("onclick", "window.lipInTapFromElement(this,event);return false;");
      const handler = (event) => {
        event.preventDefault();
        event.stopPropagation();
        handleSheetInteraction(event);
      };
      element.onpointerup = handler;
      element.onclick = handler;
    });
  }

  function lipInTapFromElement(element, event = null) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!element) return false;

    if (element.matches?.("[data-close]")) {
      closeSheet();
      return false;
    }

    if (element.dataset?.segment) {
      const group = element.closest("[data-segment-group]");
      const input = group?.parentElement?.querySelector(`input[name="${group.dataset.segmentGroup}"]`);
      if (input) input.value = element.dataset.segment;
      group?.querySelectorAll(".seg-btn").forEach((button) => button.classList.remove("is-active"));
      element.classList.add("is-active");
      return false;
    }

    if (element.dataset?.theme) {
      state.theme = element.dataset.theme;
      saveState();
      render();
      return false;
    }

    if (element.dataset?.view) {
      state.view = element.dataset.view;
      saveState();
      render();
      return false;
    }

    if (element.dataset?.reportTab) {
      state.reportTab = element.dataset.reportTab;
      saveState();
      render();
      return false;
    }

    if (element.dataset?.reportRange) {
      state.reportRange = element.dataset.reportRange;
      saveState();
      render();
      return false;
    }

    if (element.dataset?.transactionFilter) {
      state.transactionFilter = element.dataset.transactionFilter;
      saveState();
      render();
      return false;
    }

    if (element.dataset?.action) {
      handleAction(element.dataset.action, element);
      return false;
    }

    return false;
  }

  window.lipInTapFromElement = lipInTapFromElement;

  sheetRoot.addEventListener("pointerup", handleSheetInteraction);
  sheetRoot.addEventListener("click", handleSheetInteraction);

  sheetRoot.addEventListener("submit", (event) => {
    event.preventDefault();
    if (event.target.matches("#transaction-form")) handleTransactionSubmit(event.target);
    if (event.target.matches("#allocation-form")) handleAllocationSubmit(event.target);
    if (event.target.matches("#budget-form")) handleBudgetSubmit(event.target);
    if (event.target.matches("#category-form")) handleCategorySubmit(event.target);
    if (event.target.matches("#wallet-form")) handleWalletSubmit(event.target);
    if (event.target.matches("#goal-form")) handleGoalSubmit(event.target);
    if (event.target.matches("#goal-deposit-form")) handleGoalDepositSubmit(event.target);
    if (event.target.matches("#loan-form")) handleLoanSubmit(event.target);
  });

  sheetRoot.addEventListener("change", (event) => {
    if (!event.target.matches("#receipt-file")) return;
    const file = event.target.files?.[0];
    const thumb = document.querySelector("#receipt-thumb");
    if (!file || !thumb) return;
    const url = URL.createObjectURL(file);
    thumb.innerHTML = `<img src="${url}" alt="รูปใบเสร็จ">`;
  });

  function handleAction(action, button = null) {
    const id = button?.dataset?.id || "";
    switch (action) {
      case "open-transaction":
        openTransactionSheet("expense");
        break;
      case "edit-transaction":
        editTransaction(id);
        break;
      case "delete-transaction":
        deleteTransaction(id);
        break;
      case "open-receipt":
        openReceiptSheet();
        break;
      case "open-bank":
        openBankSheet();
        break;
      case "open-allocation":
        openAllocationSheet();
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
        localStorage.removeItem(STORAGE_KEY);
        Object.assign(state, seedState());
        saveState();
        render();
        toast("รีเซ็ตข้อมูลเดโมแล้ว");
        break;
      case "open-budget":
        openBudgetSheet();
        break;
      case "edit-budget":
        editBudget(id);
        break;
      case "delete-budget":
        deleteBudget(id);
        break;
      case "open-category":
        openCategorySheet();
        break;
      case "open-loan":
        openLoanSheet();
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
        openGoalSheet();
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
        openWalletSheet();
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

  async function installPwa() {
    if (!deferredInstallPrompt) {
      openInstallGuideSheet();
      return;
    }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch((error) => console.warn("Service worker failed", error));
    });
  }

  render();
})();
