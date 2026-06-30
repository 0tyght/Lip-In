import { allCategories, assetTotal, expenseByCategory } from "../core/selectors.js";
import { formatDate, offsetDate, toISODate } from "../utils/date.js";
import { clamp, formatMoney, formatMoneyHtml } from "../utils/format.js";
import { escapeHtml } from "../utils/html.js";

function postedTransactions(state) {
  return (state.transactions || []).filter((transaction) => !transaction.status || transaction.status === "posted");
}

function chartButton({ className, title, value, note = "", style = "", content }) {
  return `
    <button class="${className}" type="button" style="${style}" data-action="chart-detail" data-title="${escapeHtml(title)}" data-value="${escapeHtml(value)}" data-note="${escapeHtml(note)}">
      ${content}
    </button>
  `;
}

function normalizePoints(values, height = 52) {
  const max = Math.max(...values.map((value) => Math.abs(value)), 1);
  const horizontalPadding = 5;
  return values.map((value, index) => {
    const x = values.length === 1 ? 50 : horizontalPadding + (index / (values.length - 1)) * (100 - horizontalPadding * 2);
    const y = height - (Math.abs(value) / max) * (height - 14) - 7;
    return { x, y, value };
  });
}

function monthlyKey(date) {
  return String(date || "").slice(0, 7);
}

function lastMonths(count = 6) {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("th-TH", { month: "short" })
    };
  });
}

export function renderChartPanel(title, subtitle, body, extraClass = "") {
  return `
    <article class="chart-panel ${extraClass}">
      <div class="chart-head">
        <div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(subtitle)}</p>
        </div>
      </div>
      ${body}
    </article>
  `;
}

export function renderCashTrendChart(state) {
  const transactions = postedTransactions(state);
  const days = Array.from({ length: 14 }, (_, index) => offsetDate(index - 13));
  const series = days.map((date) => {
    const dayTransactions = transactions.filter((transaction) => transaction.date === date);
    const income = dayTransactions.filter((transaction) => transaction.type === "income").reduce((sum, transaction) => sum + transaction.amount, 0);
    const expense = dayTransactions.filter((transaction) => transaction.type === "expense" || transaction.type === "payment").reduce((sum, transaction) => sum + transaction.amount, 0);
    return { date, income, expense, net: income - expense };
  });
  const assets = assetTotal(state);
  let runningBalance = assets - series.reduce((sum, day) => sum + day.net, 0);
  const balances = series.map((day) => {
    runningBalance += day.net;
    return runningBalance;
  });
  const balancePoints = normalizePoints(balances);
  const expensePoints = normalizePoints(series.map((day) => day.expense));
  const incomePoints = normalizePoints(series.map((day) => day.income));
  const toPolyline = (points) => points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");

  const body = `
    <div class="line-chart-wrap">
      <svg class="line-chart" viewBox="0 0 100 56" role="img" aria-label="แนวโน้มเงินเดือนนี้">
        <path class="chart-grid-line" d="M0 14H100M0 28H100M0 42H100"></path>
        <polyline class="line-balance" points="${toPolyline(balancePoints)}"></polyline>
        <polyline class="line-income" points="${toPolyline(incomePoints)}"></polyline>
        <polyline class="line-expense" points="${toPolyline(expensePoints)}"></polyline>
      </svg>
      ${balancePoints.map((point, index) => chartButton({
        className: "line-point balance",
        title: `ยอดคงเหลือ ${formatDate(series[index].date)}`,
        value: formatMoney(point.value),
        note: `รายรับ ${formatMoney(series[index].income)} · รายจ่าย ${formatMoney(series[index].expense)}`,
        style: `left:${point.x}%; top:${point.y / 56 * 100}%`,
        content: "<span></span>"
      })).join("")}
    </div>
    <div class="chart-legend compact">
      <span><i class="legend-balance"></i>ยอดคงเหลือ</span>
      <span><i class="legend-income"></i>รายรับ</span>
      <span><i class="legend-expense"></i>รายจ่าย</span>
    </div>
  `;

  return renderChartPanel("แนวโน้มเงิน", "แตะจุดเพื่อดูยอดรายวัน", body, "chart-panel-trend");
}

export function renderExpenseDonutChart(state, title = "สัดส่วนรายจ่าย", subtitle = "แตะหมวดเพื่อดูจำนวนเงิน") {
  const rows = expenseByCategory(state).slice(0, 7);
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  let cursor = 0;
  const stops = total ? rows.map((row) => {
    const start = cursor;
    cursor += (row.amount / total) * 100;
    return `${row.color} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
  }).join(", ") : "#ece7df 0% 100%";

  const body = `
    <div class="donut-layout">
      <div class="donut-wrap compact" style="--donut-stops:${stops}">
        <div class="donut" aria-label="${escapeHtml(title)}"></div>
        <div class="donut-center"><div><strong>${formatMoneyHtml(total)}</strong><span class="muted">เดือนนี้</span></div></div>
      </div>
      <div class="donut-legend">
        ${rows.map((row) => chartButton({
          className: "donut-legend-item",
          title: row.name,
          value: formatMoney(row.amount),
          note: `${total ? Math.round((row.amount / total) * 100) : 0}% ของรายจ่าย`,
          content: `<span class="legend-dot" style="background:${row.color}"></span><span>${escapeHtml(row.name)}</span><strong>${total ? Math.round((row.amount / total) * 100) : 0}%</strong>`
        })).join("") || `<div class="empty-state small">ยังไม่มีรายจ่าย</div>`}
      </div>
    </div>
  `;

  return renderChartPanel(title, subtitle, body, "chart-panel-donut");
}

export function renderBudgetComparisonChart(state) {
  const categories = allCategories(state);
  const rows = (state.budgets || []).map((budget) => {
    const category = categories.find((item) => item.id === budget.categoryId) || categories[0];
    const spent = postedTransactions(state)
      .filter((transaction) => transaction.type === "expense" && transaction.categoryId === budget.categoryId)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    return { ...budget, category, spent, ratio: budget.amount ? spent / budget.amount : 0 };
  }).slice(0, 5);

  const body = `
    <div class="budget-chart-list">
      ${rows.map((row) => chartButton({
        className: "budget-chart-row",
        title: row.category.name,
        value: `${formatMoney(row.spent)} / ${formatMoney(row.amount)}`,
        note: row.ratio > 1 ? "เกินงบแล้ว" : `เหลือ ${formatMoney(Math.max(row.amount - row.spent, 0))}`,
        content: `
          <span class="budget-chart-label"><span class="category-icon" style="background:${row.category.color}33">${row.category.icon}</span><strong>${escapeHtml(row.category.name)}</strong></span>
          <span class="budget-chart-track"><span style="width:${Math.min(row.ratio * 100, 100)}%; --bar-color:${row.ratio > 1 ? "#f778a2" : row.category.color}"></span><i></i></span>
          <span class="budget-chart-value">${formatMoneyHtml(row.spent)}</span>
        `
      })).join("")}
    </div>
  `;

  return renderChartPanel("งบประมาณ vs ใช้จริง", "แท่งแนวนอนอ่านเทียบวงเงินได้ไว", body);
}

export function renderMonthlyGroupedBarChart(state) {
  const transactions = postedTransactions(state);
  const months = lastMonths(6).map((month) => {
    const rows = transactions.filter((transaction) => monthlyKey(transaction.date) === month.key);
    return {
      ...month,
      income: rows.filter((transaction) => transaction.type === "income").reduce((sum, transaction) => sum + transaction.amount, 0),
      expense: rows.filter((transaction) => transaction.type === "expense" || transaction.type === "payment").reduce((sum, transaction) => sum + transaction.amount, 0)
    };
  });
  const max = Math.max(...months.flatMap((month) => [month.income, month.expense]), 1);

  const body = `
    <div class="grouped-bars">
      ${months.map((month) => `
        <div class="grouped-bar-col">
          <div class="grouped-bar-pair">
            ${chartButton({ className: "v-bar income", title: `รายรับ ${month.label}`, value: formatMoney(month.income), style: `height:${Math.max((month.income / max) * 100, 4)}%`, content: "<span></span>" })}
            ${chartButton({ className: "v-bar expense", title: `รายจ่าย ${month.label}`, value: formatMoney(month.expense), style: `height:${Math.max((month.expense / max) * 100, 4)}%`, content: "<span></span>" })}
          </div>
          <small>${escapeHtml(month.label)}</small>
        </div>
      `).join("")}
    </div>
    <div class="chart-legend compact"><span><i class="legend-income"></i>รายรับ</span><span><i class="legend-expense"></i>รายจ่าย</span></div>
  `;

  return renderChartPanel("สรุปรายเดือน", "Grouped bar สำหรับเทียบรายรับรายจ่าย", body);
}

export function renderCashFlowChart(state) {
  const transactions = postedTransactions(state);
  const income = transactions.filter((transaction) => transaction.type === "income").reduce((sum, transaction) => sum + transaction.amount, 0);
  const expense = transactions.filter((transaction) => transaction.type === "expense" || transaction.type === "payment").reduce((sum, transaction) => sum + transaction.amount, 0);
  const transfer = transactions.filter((transaction) => transaction.type === "transfer").reduce((sum, transaction) => sum + transaction.amount, 0);
  const net = income - expense;
  const rows = [
    { label: "เงินเข้า", value: income, className: "income" },
    { label: "เงินออก", value: -expense, className: "expense" },
    { label: "โอน", value: transfer, className: "transfer" },
    { label: "สุทธิ", value: net, className: net >= 0 ? "income" : "expense" }
  ];
  const max = Math.max(...rows.map((row) => Math.abs(row.value)), 1);

  const body = `
    <div class="waterfall-chart">
      ${rows.map((row) => chartButton({
        className: `waterfall-step ${row.className}`,
        title: row.label,
        value: formatMoney(Math.abs(row.value)),
        note: row.value < 0 ? "เงินออก" : "เงินเข้า/คงเหลือสุทธิ",
        style: `--h:${Math.max((Math.abs(row.value) / max) * 100, 6)}%`,
        content: `<span></span><strong>${escapeHtml(row.label)}</strong>`
      })).join("")}
    </div>
  `;

  return renderChartPanel("Cash Flow", "แตะเพื่ออ่านเงินเข้า-ออกและสุทธิ", body);
}

export function renderNetWorthAreaChart(state) {
  const assets = assetTotal(state);
  const debt = Math.abs((state.wallets || []).filter((wallet) => wallet.liability).reduce((sum, wallet) => sum + wallet.balance, 0)) +
    (state.loans || []).reduce((sum, loan) => sum + Math.max(loan.principal - loan.paidPrincipal, 0), 0);
  const points = Array.from({ length: 8 }, (_, index) => {
    const drift = (index - 7) * 0.018;
    return {
      label: `${index + 1}`,
      assets: assets * (1 + drift),
      debt: debt * (1 - drift * 0.5),
      net: assets * (1 + drift) - debt * (1 - drift * 0.5)
    };
  });
  const max = Math.max(...points.flatMap((point) => [point.assets, point.debt, Math.abs(point.net)]), 1);
  const toPoints = (key) => normalizePoints(points.map((point) => point[key] / max * 100), 52).map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");

  const body = `
    <div class="line-chart-wrap area">
      <svg class="line-chart" viewBox="0 0 100 56" role="img" aria-label="Net worth">
        <path class="area-fill" d="M0,56 ${toPoints("net")} 100,56 Z"></path>
        <polyline class="line-income" points="${toPoints("assets")}"></polyline>
        <polyline class="line-expense" points="${toPoints("debt")}"></polyline>
        <polyline class="line-balance" points="${toPoints("net")}"></polyline>
      </svg>
    </div>
    <div class="chart-legend compact"><span><i class="legend-income"></i>สินทรัพย์</span><span><i class="legend-expense"></i>หนี้สิน</span><span><i class="legend-balance"></i>สุทธิ</span></div>
  `;

  return renderChartPanel("Net Worth ย้อนหลัง", "Area chart สำหรับดูสินทรัพย์ หนี้สิน และสุทธิ", body);
}

export function renderSpendingHeatmap(state) {
  const buckets = [
    { id: "morning", label: "เช้า", start: 5, end: 12 },
    { id: "afternoon", label: "บ่าย", start: 12, end: 17 },
    { id: "evening", label: "เย็น", start: 17, end: 21 },
    { id: "night", label: "ดึก", start: 21, end: 29 }
  ];
  const days = Array.from({ length: 7 }, (_, index) => offsetDate(index - 6));
  const cells = days.flatMap((date) => buckets.map((bucket) => {
    const amount = postedTransactions(state)
      .filter((transaction) => transaction.type === "expense" || transaction.type === "payment")
      .filter((transaction) => transaction.date === date)
      .filter((transaction) => {
        const hour = Number(String(transaction.time || "12:00").slice(0, 2));
        const normalized = hour < 5 ? hour + 24 : hour;
        return normalized >= bucket.start && normalized < bucket.end;
      })
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    return { date, bucket, amount };
  }));
  const max = Math.max(...cells.map((cell) => cell.amount), 1);

  const body = `
    <div class="heatmap-grid" style="--heat-cols:${buckets.length}">
      ${buckets.map((bucket) => `<span class="heat-label">${escapeHtml(bucket.label)}</span>`).join("")}
      ${cells.map((cell) => chartButton({
        className: "heat-cell",
        title: `${formatDate(cell.date)} · ${cell.bucket.label}`,
        value: formatMoney(cell.amount),
        style: `--heat:${clamp(cell.amount / max, 0, 1).toFixed(2)}`,
        content: "<span></span>"
      })).join("")}
    </div>
  `;

  return renderChartPanel("พฤติกรรมตามเวลา", "Heatmap หา pattern วันที่ใช้จ่ายเยอะ", body);
}

export function renderLoanStackedChart(state) {
  const body = `
    <div class="loan-stack-list">
      ${(state.loans || []).map((loan) => {
        const balance = Math.max(loan.principal - loan.paidPrincipal, 0);
        const total = loan.paidPrincipal + loan.interestPaid + balance || 1;
        return chartButton({
          className: "loan-stack-row",
          title: loan.name,
          value: `คงเหลือ ${formatMoney(balance)}`,
          note: `เงินต้นจ่ายแล้ว ${formatMoney(loan.paidPrincipal)} · ดอกเบี้ย ${formatMoney(loan.interestPaid)}`,
          content: `
            <span class="loan-stack-title"><span class="category-icon">${loan.icon}</span><strong>${escapeHtml(loan.name)}</strong></span>
            <span class="loan-stack-track">
              <i class="principal" style="width:${(loan.paidPrincipal / total) * 100}%"></i>
              <i class="interest" style="width:${(loan.interestPaid / total) * 100}%"></i>
              <i class="balance" style="width:${(balance / total) * 100}%"></i>
            </span>
          `
        });
      }).join("")}
    </div>
  `;

  return renderChartPanel("เงินต้น/ดอกเบี้ย", "Stacked bar สำหรับตารางผ่อนชำระ", body);
}
