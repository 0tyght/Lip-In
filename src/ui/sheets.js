import { allCategories } from "../core/selectors.js";
import { toISODate } from "../utils/date.js";
import { escapeHtml, optionList } from "../utils/html.js";
import { formatMoneyHtml } from "../utils/format.js";
import { typeLabel } from "./components.js";

export function categoryOptions(state, selected = "food") {
  return optionList(allCategories(state), selected, (category) => `${category.icon} ${category.name}`);
}

export function walletOptions(state, selected = "daily") {
  return optionList(state.wallets, selected, (wallet) => `${wallet.icon} ${wallet.name}`);
}

export function renderTransactionSheet(state, defaultType = "expense", transaction = null) {
  const today = toISODate(new Date());
  const tx = transaction || {
    id: "",
    type: defaultType,
    title: "",
    amount: "",
    date: today,
    categoryId: defaultType === "income" ? "salary" : defaultType === "transfer" ? "transfer" : "food",
    walletId: "daily",
    toWalletId: "",
    fee: "",
    status: "posted",
    time: "",
    merchant: "",
    location: "",
    tags: [],
    attachments: [],
    splits: [],
    note: ""
  };
  const tagValue = Array.isArray(tx.tags) ? tx.tags.join(", ") : "";
  const attachmentValue = (tx.attachments || []).map((item) => item.name).join(", ");
  const splitRows = [...(tx.splits || []), {}, {}].slice(0, Math.max(2, (tx.splits || []).length));

  return `
    <div class="sheet-head"><h2>${tx.id ? "แก้ไขรายการ" : "บันทึกรายการ"}</h2><button class="close-btn" type="button" data-close aria-label="ปิด">×</button></div>
    <form class="form-grid" id="transaction-form">
      <input type="hidden" name="id" value="${escapeHtml(tx.id)}">
      <input type="hidden" name="type" value="${escapeHtml(tx.type)}">
      <div class="segmented" data-segment-group="type">
        ${["expense", "income", "transfer", "payment"].map((type) => `<button class="seg-btn ${type === tx.type ? "is-active" : ""}" type="button" data-segment="${type}">${typeLabel(type)}</button>`).join("")}
      </div>
      <div class="field"><label for="tx-title">ชื่อรายการ</label><input id="tx-title" name="title" required placeholder="เช่น ข้าวกลางวัน" value="${escapeHtml(tx.title)}"></div>
      <div class="form-row">
        <div class="field"><label for="tx-amount">จำนวนเงิน</label><input id="tx-amount" name="amount" type="number" min="1" step="0.01" required placeholder="0" value="${tx.amount}"></div>
        <div class="field"><label for="tx-date">วันที่</label><input id="tx-date" name="date" type="date" value="${tx.date || today}" required></div>
      </div>
      <div class="form-row">
        <div class="field"><label for="tx-time">เวลา</label><input id="tx-time" name="time" type="time" value="${escapeHtml(tx.time || "")}"></div>
        <div class="field"><label for="tx-status">สถานะ</label><select id="tx-status" name="status"><option value="posted" ${tx.status === "posted" ? "selected" : ""}>ลงบัญชีแล้ว</option><option value="pending" ${tx.status === "pending" ? "selected" : ""}>รอตรวจสอบ</option><option value="scheduled" ${tx.status === "scheduled" ? "selected" : ""}>ตั้งเวลาล่วงหน้า</option></select></div>
      </div>
      <div class="form-row">
        <div class="field"><label for="tx-category">หมวดหมู่หลัก</label><select id="tx-category" name="categoryId">${categoryOptions(state, tx.categoryId)}</select></div>
        <div class="field"><label for="tx-wallet">กระเป๋าต้นทาง</label><select id="tx-wallet" name="walletId">${walletOptions(state, tx.walletId)}</select></div>
      </div>
      <div class="form-row">
        <div class="field"><label for="tx-to-wallet">ปลายทางเมื่อโอนเงิน</label><select id="tx-to-wallet" name="toWalletId"><option value="">ไม่ระบุ</option>${walletOptions(state, tx.toWalletId || "")}</select></div>
        <div class="field"><label for="tx-fee">ค่าธรรมเนียมโอน</label><input id="tx-fee" name="fee" type="number" min="0" step="0.01" value="${tx.fee || ""}" placeholder="0"></div>
      </div>
      <div class="form-row">
        <div class="field"><label for="tx-merchant">ร้านค้า/ผู้รับเงิน</label><input id="tx-merchant" name="merchant" placeholder="เช่น 7-Eleven" value="${escapeHtml(tx.merchant || "")}"></div>
        <div class="field"><label for="tx-location">สถานที่</label><input id="tx-location" name="location" placeholder="เช่น สยาม" value="${escapeHtml(tx.location || "")}"></div>
      </div>
      <div class="field"><label for="tx-tags">แท็ก</label><input id="tx-tags" name="tags" placeholder="เช่น ทริป, งาน, บ้าน" value="${escapeHtml(tagValue)}"></div>
      <div class="field"><label for="tx-attachment">หลักฐานแนบ</label><input id="tx-attachment" name="attachmentName" placeholder="ชื่อไฟล์/เลขอ้างอิง" value="${escapeHtml(attachmentValue)}"></div>
      <div class="split-box">
        <div class="allocation-head"><strong>แยกหมวดในรายการเดียว</strong><span class="tag">ยอดรวมต้องเท่ากับจำนวนเงิน</span></div>
        ${splitRows.map((split, index) => `
          <div class="form-row">
            <div class="field"><label for="split-cat-${index}">หมวด ${index + 1}</label><select id="split-cat-${index}" name="splitCategoryId">${categoryOptions(state, split.categoryId || tx.categoryId)}</select></div>
            <div class="field"><label for="split-amount-${index}">ยอด</label><input id="split-amount-${index}" name="splitAmount" type="number" min="0" step="0.01" value="${split.amount || ""}" placeholder="0"></div>
          </div>
        `).join("")}
      </div>
      <div class="field"><label for="tx-note">โน้ต</label><textarea id="tx-note" name="note" placeholder="รายละเอียดเพิ่มเติม">${escapeHtml(tx.note)}</textarea></div>
      <button class="primary-btn" type="submit">${tx.id ? "บันทึกการแก้ไข" : "บันทึกรายการ"}</button>
    </form>
  `;
}

function renderTransactionSheetLegacy(state, defaultType = "expense", transaction = null) {
  const today = toISODate(new Date());
  const tx = transaction || {
    id: "",
    type: defaultType,
    title: "",
    amount: "",
    date: today,
    categoryId: "food",
    walletId: "daily",
    toWalletId: "",
    fee: "",
    status: "posted",
    time: "",
    merchant: "",
    location: "",
    tags: [],
    attachments: [],
    splits: [],
    note: ""
  };
  const tagValue = Array.isArray(tx.tags) ? tx.tags.join(", ") : "";
  const attachmentValue = (tx.attachments || []).map((item) => item.name).join(", ");
  const splitRows = [...(tx.splits || []), {}, {}].slice(0, Math.max(2, (tx.splits || []).length));

  return `
    <div class="sheet-head"><h2>${tx.id ? "แก้ไขรายการ" : "บันทึกรายการ"}</h2><button class="close-btn" type="button" data-close aria-label="ปิด">×</button></div>
    <form class="form-grid" id="transaction-form">
      <input type="hidden" name="id" value="${tx.id}">
      <input type="hidden" name="type" value="${tx.type}">
      <div class="segmented" data-segment-group="type">
        ${["expense", "income", "transfer", "payment"].map((type) => `<button class="seg-btn ${type === tx.type ? "is-active" : ""}" type="button" data-segment="${type}">${typeLabel(type)}</button>`).join("")}
      </div>
      <div class="field"><label for="tx-title">ชื่อรายการ</label><input id="tx-title" name="title" required placeholder="เช่น ข้าวกลางวัน" value="${escapeHtml(tx.title)}"></div>
      <div class="form-row">
        <div class="field"><label for="tx-amount">จำนวนเงิน</label><input id="tx-amount" name="amount" type="number" min="1" step="0.01" required placeholder="0" value="${tx.amount}"></div>
        <div class="field"><label for="tx-date">วันที่</label><input id="tx-date" name="date" type="date" value="${tx.date || today}" required></div>
      </div>
      <div class="form-row">
        <div class="field"><label for="tx-category">หมวดหมู่</label><select id="tx-category" name="categoryId">${categoryOptions(state, tx.categoryId)}</select></div>
        <div class="field"><label for="tx-wallet">กระเป๋า</label><select id="tx-wallet" name="walletId">${walletOptions(state, tx.walletId)}</select></div>
      </div>
      <div class="field"><label for="tx-note">โน้ต</label><textarea id="tx-note" name="note" placeholder="รายละเอียดเพิ่มเติม">${escapeHtml(tx.note)}</textarea></div>
      <button class="primary-btn" type="submit">${tx.id ? "บันทึกการแก้ไข" : "บันทึกรายการ"}</button>
    </form>
  `;
}

export function renderReceiptSheet(state, sampleItems) {
  return `
    <div class="sheet-head"><h2>สแกนใบเสร็จ</h2><button class="close-btn" type="button" data-close aria-label="ปิด">×</button></div>
    <div class="form-grid">
      <div class="receipt-preview">
        <div class="receipt-thumb" id="receipt-thumb">📄</div>
        <div>
          <div class="allocation-head"><strong>สแกนใบเสร็จสำเร็จ</strong><span class="tag green">เดโม OCR</span></div>
          <div class="chip-row" style="margin-top:8px"><span class="tag green">พบ: 1 ใบเสร็จ</span><span class="tag purple">2 รายการ</span><span class="tag">จาก: 7-Eleven</span></div>
        </div>
      </div>
      <div class="field"><label for="receipt-file">รูปใบเสร็จ</label><input id="receipt-file" type="file" accept="image/*" capture="environment"></div>
      <div class="form-row">
        <div class="field"><label for="receipt-wallet">กระเป๋า</label><select id="receipt-wallet">${walletOptions(state, "daily")}</select></div>
        <div class="field"><label for="receipt-date">วันที่</label><input id="receipt-date" type="date" value="${toISODate(new Date())}"></div>
      </div>
      <button class="ghost-btn" type="button" data-action="scan-demo">อ่านรายการ</button>
      <div class="scan-items" id="scan-result">${renderScanItems(sampleItems)}</div>
      <button class="primary-btn" type="button" data-action="record-scan">บันทึกรายการ</button>
    </div>
  `;
}

function renderBankSheetLegacy(state) {
  return `
    <div class="sheet-head"><h2>ธนาคาร</h2><button class="close-btn" type="button" data-close aria-label="ปิด">×</button></div>
    <div class="form-grid">
      <article class="card bank-card">
        <div class="bank-status"><span class="category-icon">🏦</span><div><strong>Sandbox</strong><div class="muted">${state.lastSyncedAt ? `ซิงก์ล่าสุด ${escapeHtml(state.lastSyncedAt)}` : "ยังไม่เคยซิงก์"}</div></div></div>
        <button class="primary-btn" type="button" data-action="sync-bank">ซิงก์ข้อมูลตัวอย่าง</button>
      </article>
      <div class="allocation-list">
        <div class="allocation-item"><div class="allocation-head"><strong>นำเข้า statement</strong><span class="tag green">พร้อมออกแบบ</span></div><div class="mini-bar"><span style="width:64%; --bar-color:#91c36b"></span></div></div>
        <div class="allocation-item"><div class="allocation-head"><strong>Open banking</strong><span class="tag">รอ API จริง</span></div><div class="mini-bar"><span style="width:48%; --bar-color:#ffc022"></span></div></div>
        <div class="allocation-item"><div class="allocation-head"><strong>PromptPay / QR</strong><span class="tag">รอเชื่อมต่อ</span></div><div class="mini-bar"><span style="width:82%; --bar-color:#f778a2"></span></div></div>
      </div>
    </div>
  `;
}

export function renderBankSheet(state) {
  const settings = state.bankSettings || {};
  const sync = state.bankSync || {};
  const configured = Boolean(settings.apiBaseUrl && settings.apiToken);
  const connectionCount = (state.bankConnections || []).length;
  const statusLabel = sync.status === "synced" ? "ซิงก์แล้ว" :
    sync.status === "connected" ? "เชื่อมแล้ว" :
      sync.status === "syncing" ? "กำลังซิงก์" :
        sync.status === "connecting" ? "กำลังเชื่อม" :
          configured ? "พร้อมต่อ API" : "ต้องตั้งค่า API";
  const lastSync = sync.lastSyncedAt ? new Date(sync.lastSyncedAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "ยังไม่เคยซิงก์จริง";

  return `
    <div class="sheet-head"><h2>ธนาคาร</h2><button class="close-btn" type="button" data-close aria-label="ปิด">×</button></div>
    <div class="form-grid">
      <article class="card bank-card">
        <div class="bank-status"><span class="category-icon">🏦</span><div><strong>${statusLabel}</strong><div class="muted">${lastSync}</div></div></div>
        <div class="bank-metrics">
          <div class="stat-box"><div class="muted">บัญชีที่เชื่อม</div><strong>${connectionCount}</strong></div>
          <div class="stat-box"><div class="muted">Provider</div><strong>${escapeHtml(settings.provider || "plaid")}</strong></div>
          <div class="stat-box"><div class="muted">รายการล่าสุด</div><strong>${sync.importedCount || 0}</strong></div>
        </div>
        ${sync.lastError ? `<div class="bank-alert">${escapeHtml(sync.lastError)}</div>` : ""}
      </article>

      <form class="form-grid bank-setup" id="bank-settings-form">
        <div class="field">
          <label for="bank-api-url">Bank API URL</label>
          <input id="bank-api-url" name="apiBaseUrl" inputmode="url" placeholder="https://lip-in-bank-sync.yourname.workers.dev" value="${escapeHtml(settings.apiBaseUrl || "")}">
        </div>
        <div class="form-row">
          <div class="field">
            <label for="bank-user-id">User ID</label>
            <input id="bank-user-id" name="userId" value="${escapeHtml(settings.userId || "lipin-personal")}">
          </div>
          <div class="field">
            <label for="bank-provider">Provider</label>
            <select id="bank-provider" name="provider"><option value="plaid" ${settings.provider === "plaid" ? "selected" : ""}>Plaid / Open Banking</option></select>
          </div>
        </div>
        <div class="field">
          <label for="bank-api-token">Sync API token</label>
          <input id="bank-api-token" name="apiToken" type="password" autocomplete="off" placeholder="เก็บไว้ในเครื่องนี้เท่านั้น" value="${escapeHtml(settings.apiToken || "")}">
        </div>
        <button class="primary-btn" type="submit">บันทึกการตั้งค่า</button>
      </form>

      <div class="bank-action-grid">
        <button class="quick-action" type="button" data-action="check-bank-backend"><span>🔐</span><span>ตรวจ backend</span></button>
        <button class="quick-action" type="button" data-action="connect-real-bank"><span>🏦</span><span>เชื่อมธนาคารจริง</span></button>
        <button class="quick-action" type="button" data-action="sync-real-bank"><span>🔄</span><span>ซิงก์รายการจริง</span></button>
        <button class="quick-action" type="button" data-action="pick-bank-statement"><span>📄</span><span>นำเข้า statement</span></button>
        <input class="sr-only" id="bank-statement-file" type="file" accept=".csv,text/csv">
      </div>

      <div class="allocation-list">
        <div class="allocation-item"><div class="allocation-head"><strong>1. Deploy Worker</strong><span class="tag green">ต้องมี secret</span></div><div class="muted">ใช้ไฟล์ workers/bank-sync-worker.js แล้วตั้งค่า Plaid + KV</div></div>
        <div class="allocation-item"><div class="allocation-head"><strong>2. เชื่อมผ่าน Plaid Link</strong><span class="tag">token ไม่เข้า PWA</span></div><div class="muted">หน้าแอปจะได้เฉพาะรายการที่ sync แล้ว ไม่เก็บ access token ธนาคาร</div></div>
        <div class="allocation-item"><div class="allocation-head"><strong>3. ธนาคารที่ไม่มี API</strong><span class="tag">CSV fallback</span></div><div class="muted">ดาวน์โหลด statement จากแอปธนาคาร แล้วนำเข้า CSV เพื่อกันข้อมูลหล่น</div></div>
        <button class="ghost-btn" type="button" data-action="sync-bank">เติมข้อมูลเดโม</button>
      </div>
    </div>
  `;
}

export function renderAllocationSheet(state) {
  return `
    <div class="sheet-head"><h2>แบ่งสัดส่วนเงิน</h2><button class="close-btn" type="button" data-close aria-label="ปิด">×</button></div>
    <form class="form-grid" id="allocation-form">
      <div class="field"><label for="expected-income">รายรับต่อเดือน</label><input id="expected-income" name="expectedIncome" type="number" min="0" step="100" value="${state.expectedIncome}"></div>
      ${state.allocations.map((item) => `<div class="field"><label for="${item.id}">${escapeHtml(item.name)} (${item.percent}%)</label><input id="${item.id}" name="${item.id}" type="range" min="0" max="100" value="${item.percent}"></div>`).join("")}
      <button class="primary-btn" type="submit">บันทึกสัดส่วน</button>
    </form>
  `;
}

export function renderBudgetSheet(state, budget = null) {
  const item = budget || { id: "", categoryId: "food", amount: "" };
  return `
    <div class="sheet-head"><h2>${item.id ? "แก้ไขงบประมาณ" : "เพิ่มงบประมาณ"}</h2><button class="close-btn" type="button" data-close aria-label="ปิด">×</button></div>
    <form class="form-grid" id="budget-form">
      <input type="hidden" name="id" value="${item.id}">
      <div class="field"><label for="budget-category">หมวดหมู่</label><select id="budget-category" name="categoryId">${categoryOptions(state, item.categoryId)}</select></div>
      <div class="field"><label for="budget-amount">วงเงินต่อเดือน</label><input id="budget-amount" name="amount" type="number" min="1" step="1" required placeholder="0" value="${item.amount}"></div>
      <button class="primary-btn" type="submit">${item.id ? "บันทึกการแก้ไข" : "บันทึกงบประมาณ"}</button>
    </form>
  `;
}

export function renderCategorySheet(state) {
  return `
    <div class="sheet-head"><h2>เลือกหมวดหมู่</h2><button class="close-btn" type="button" data-close aria-label="ปิด">×</button></div>
    <form class="form-grid" id="category-form">
      <div class="form-row">
        <div class="field"><label for="category-icon">ไอคอน</label><input id="category-icon" name="icon" maxlength="4" value="✨" required></div>
        <div class="field"><label for="category-color">สี</label><input id="category-color" name="color" type="color" value="#ffd86b"></div>
      </div>
      <div class="field"><label for="category-name">ชื่อหมวดหมู่</label><input id="category-name" name="name" required placeholder="เช่น งานอดิเรก"></div>
      <button class="primary-btn" type="submit">เพิ่มหมวดหมู่</button>
    </form>
  `;
}

export function renderWalletSheet(wallet = null) {
  const item = wallet || { id: "", icon: "👛", color: "#d5f3ff", name: "", balance: 0, liability: false };
  return `
    <div class="sheet-head"><h2>${item.id ? "แก้ไขกระเป๋า" : "เพิ่มกระเป๋า"}</h2><button class="close-btn" type="button" data-close aria-label="ปิด">×</button></div>
    <form class="form-grid" id="wallet-form">
      <input type="hidden" name="id" value="${item.id}">
      <div class="form-row">
        <div class="field"><label for="wallet-icon">ไอคอน</label><input id="wallet-icon" name="icon" maxlength="4" value="${escapeHtml(item.icon)}" required></div>
        <div class="field"><label for="wallet-color">สีพื้น</label><input id="wallet-color" name="color" type="color" value="${item.color || "#d5f3ff"}"></div>
      </div>
      <div class="field"><label for="wallet-name">ชื่อกระเป๋า</label><input id="wallet-name" name="name" required placeholder="เช่น บัญชีเงินเดือน" value="${escapeHtml(item.name)}"></div>
      <div class="form-row">
        <div class="field"><label for="wallet-balance">ยอดเริ่มต้น</label><input id="wallet-balance" name="balance" type="number" step="0.01" value="${Math.abs(item.balance || 0)}"></div>
        <div class="field"><label for="wallet-kind">ประเภท</label><select id="wallet-kind" name="kind"><option value="asset" ${item.liability ? "" : "selected"}>ทรัพย์สิน</option><option value="liability" ${item.liability ? "selected" : ""}>หนี้สิน</option></select></div>
      </div>
      <button class="primary-btn" type="submit">${item.id ? "บันทึกการแก้ไข" : "บันทึกกระเป๋า"}</button>
    </form>
  `;
}

export function renderGoalSheet(goal = null) {
  const item = goal || { id: "", icon: "🎯", due: "ธ.ค. 2569", name: "", target: "", saved: 0 };
  return `
    <div class="sheet-head"><h2>${item.id ? "แก้ไขเป้าหมาย" : "เพิ่มเป้าหมาย"}</h2><button class="close-btn" type="button" data-close aria-label="ปิด">×</button></div>
    <form class="form-grid" id="goal-form">
      <input type="hidden" name="id" value="${item.id}">
      <div class="form-row"><div class="field"><label for="goal-icon">ไอคอน</label><input id="goal-icon" name="icon" maxlength="4" value="${escapeHtml(item.icon)}" required></div><div class="field"><label for="goal-due">ครบกำหนด</label><input id="goal-due" name="due" value="${escapeHtml(item.due)}"></div></div>
      <div class="field"><label for="goal-name">ชื่อเป้าหมาย</label><input id="goal-name" name="name" required placeholder="เช่น เงินดาวน์รถ" value="${escapeHtml(item.name)}"></div>
      <div class="form-row"><div class="field"><label for="goal-target">เป้าหมาย</label><input id="goal-target" name="target" type="number" min="1" step="1" required value="${item.target}"></div><div class="field"><label for="goal-saved">ออมแล้ว</label><input id="goal-saved" name="saved" type="number" min="0" step="1" value="${item.saved}"></div></div>
      <button class="primary-btn" type="submit">${item.id ? "บันทึกการแก้ไข" : "บันทึกเป้าหมาย"}</button>
    </form>
  `;
}

export function renderGoalDepositSheet(goal) {
  return `
    <div class="sheet-head"><h2>เติมเงินเป้าหมาย</h2><button class="close-btn" type="button" data-close aria-label="ปิด">×</button></div>
    <form class="form-grid" id="goal-deposit-form">
      <input type="hidden" name="id" value="${goal.id}">
      <div class="field"><label>เป้าหมาย</label><input value="${escapeHtml(goal.name)}" readonly></div>
      <div class="field"><label for="goal-deposit-amount">จำนวนเงินที่เติม</label><input id="goal-deposit-amount" name="amount" type="number" min="1" step="1" required placeholder="0"></div>
      <button class="primary-btn" type="submit">เติมเงิน</button>
    </form>
  `;
}

export function renderLoanSheet(loan = null) {
  const item = loan || { id: "", icon: "🏠", rate: 6, name: "", principal: "", paidPrincipal: 0, totalTerms: 12, paidTerms: 0 };
  return `
    <div class="sheet-head"><h2>${item.id ? "แก้ไขผ่อนชำระ" : "เพิ่มผ่อนชำระ"}</h2><button class="close-btn" type="button" data-close aria-label="ปิด">×</button></div>
    <form class="form-grid" id="loan-form">
      <input type="hidden" name="id" value="${item.id}">
      <div class="form-row"><div class="field"><label for="loan-icon">ไอคอน</label><input id="loan-icon" name="icon" maxlength="4" value="${escapeHtml(item.icon)}" required></div><div class="field"><label for="loan-rate">ดอกเบี้ยต่อปี (%)</label><input id="loan-rate" name="rate" type="number" min="0" step="0.01" value="${item.rate}"></div></div>
      <div class="field"><label for="loan-name">ชื่อผ่อนชำระ</label><input id="loan-name" name="name" required placeholder="เช่น ผ่อนโทรศัพท์" value="${escapeHtml(item.name)}"></div>
      <div class="form-row"><div class="field"><label for="loan-principal">เงินต้น</label><input id="loan-principal" name="principal" type="number" min="1" step="1" required value="${item.principal}"></div><div class="field"><label for="loan-paid">จ่ายเงินต้นแล้ว</label><input id="loan-paid" name="paidPrincipal" type="number" min="0" step="1" value="${item.paidPrincipal}"></div></div>
      <div class="form-row"><div class="field"><label for="loan-terms">จำนวนงวด</label><input id="loan-terms" name="totalTerms" type="number" min="1" max="120" step="1" value="${item.totalTerms}"></div><div class="field"><label for="loan-paid-terms">จ่ายแล้วกี่งวด</label><input id="loan-paid-terms" name="paidTerms" type="number" min="0" max="120" step="1" value="${item.paidTerms}"></div></div>
      <button class="primary-btn" type="submit">${item.id ? "บันทึกการแก้ไข" : "บันทึกผ่อนชำระ"}</button>
    </form>
  `;
}

export function renderInstallGuideSheet() {
  return `
    <div class="sheet-head"><h2>ติดตั้งบน iPhone</h2><button class="close-btn" type="button" data-close aria-label="ปิด">×</button></div>
    <div class="form-grid">
      <article class="card bank-card"><div class="bank-status"><span class="category-icon">📱</span><div><strong>ใช้แบบแอปบนหน้าจอหลัก</strong><div class="muted">เปิดผ่าน Safari แล้วกดแชร์ จากนั้นเลือก Add to Home Screen</div></div></div></article>
      <div class="allocation-list">
        <div class="allocation-item"><div class="allocation-head"><strong>1. เปิด URL นี้ใน Safari</strong><span class="tag">HTTPS</span></div></div>
        <div class="allocation-item"><div class="allocation-head"><strong>2. กดปุ่ม Share</strong><span class="tag">สี่เหลี่ยมลูกศรขึ้น</span></div></div>
        <div class="allocation-item"><div class="allocation-head"><strong>3. เลือก Add to Home Screen</strong><span class="tag green">ใช้ออฟไลน์หลังติดตั้ง</span></div></div>
      </div>
    </div>
  `;
}

export function renderScanItems(items) {
  return items.map((item) => `
    <div class="scan-item">
      <div class="transaction-main"><span class="category-icon">🍜</span><div><strong>${escapeHtml(item.title)}</strong><div class="muted">อาหาร · ใบเสร็จที่ 1</div></div></div>
      <strong class="bad">${formatMoneyHtml(item.amount)}</strong>
    </div>
  `).join("");
}
