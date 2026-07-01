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
      <input type="hidden" name="slipTodoId" value="${escapeHtml(tx.slipTodoId || "")}">
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

export function renderReceiptSheet(state) {
  return `
    <div class="sheet-head"><h2>แนบใบเสร็จ</h2><button class="close-btn" type="button" data-close aria-label="ปิด">×</button></div>
    <div class="form-grid">
      <div class="receipt-preview">
        <div class="receipt-thumb" id="receipt-thumb">📄</div>
        <div>
          <div class="allocation-head"><strong>เก็บหลักฐานใบเสร็จ</strong><span class="tag green">ใช้กับรายการจริง</span></div>
          <div class="chip-row" style="margin-top:8px"><span class="tag green">บันทึกเลขอ้างอิง</span><span class="tag purple">แนบชื่อไฟล์</span><span class="tag">ตรวจย้อนหลังได้</span></div>
        </div>
      </div>
      <div class="field"><label for="receipt-file">รูปใบเสร็จ</label><input id="receipt-file" type="file" accept="image/*" capture="environment"></div>
      <div class="form-row">
        <div class="field"><label for="receipt-wallet">กระเป๋า</label><select id="receipt-wallet">${walletOptions(state, "daily")}</select></div>
        <div class="field"><label for="receipt-date">วันที่</label><input id="receipt-date" type="date" value="${toISODate(new Date())}"></div>
      </div>
      <button class="primary-btn" type="button" data-action="open-transaction">บันทึกรายการจริง</button>
    </div>
  `;
}

export function renderBankSheet(state) {
  const inbox = state.slipInbox || {};
  const todos = (state.slipTodos || []).filter((todo) => todo.status !== "done");
  const doneCount = (state.slipTodos || []).filter((todo) => todo.status === "done").length;
  const lastImport = inbox.lastImportedAt ? new Date(inbox.lastImportedAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "ยังไม่เคยนำเข้าสลิป";

  return `
    <div class="sheet-head"><h2>สลิปธนาคารไทย</h2><button class="close-btn" type="button" data-close aria-label="ปิด">×</button></div>
    <div class="form-grid">
      <article class="card bank-card">
        <div class="bank-status"><span class="category-icon">🧾</span><div><strong>อ่านสลิปในเครื่อง</strong><div class="muted">${lastImport}</div></div></div>
        <div class="bank-metrics">
          <div class="stat-box"><div class="muted">รอตรวจ</div><strong>${todos.length}</strong></div>
          <div class="stat-box"><div class="muted">นำเข้าแล้ว</div><strong>${inbox.importedCount || 0}</strong></div>
          <div class="stat-box"><div class="muted">บันทึกแล้ว</div><strong>${doneCount}</strong></div>
        </div>
        ${inbox.lastError ? `<div class="bank-alert">${escapeHtml(inbox.lastError)}</div>` : ""}
      </article>

      <div class="bank-action-grid">
        <button class="quick-action" type="button" data-action="pick-thai-slips"><span>📷</span><span>เลือกสลิปในเครื่อง</span></button>
        <button class="quick-action" type="button" data-action="pick-bank-statement"><span>📄</span><span>นำเข้า CSV ธนาคารไทย</span></button>
        <input class="sr-only" id="thai-slip-files" type="file" accept="image/*" multiple>
        <input class="sr-only" id="bank-statement-file" type="file" accept=".csv,text/csv">
      </div>

      <div class="allocation-list">
        <div class="allocation-item"><div class="allocation-head"><strong>อ่านจากรูปในเครื่อง</strong><span class="tag green">ไม่อัปโหลด</span></div><div class="muted">ถ้า browser อ่าน QR จากสลิปได้ แอปจะเติมยอดและเลขอ้างอิงให้ก่อน</div></div>
        <div class="allocation-item"><div class="allocation-head"><strong>สลิปที่ยังไม่ชัดเจน</strong><span class="tag">เข้า To do</span></div><div class="muted">ผู้ใช้มาเลือกหมวด กระเป๋า ชื่อรายการ แล้วบันทึกเป็นธุรกรรมจริง</div></div>
      </div>

      ${todos.length ? `
        <div class="section-title"><h2>To do สลิป</h2><span class="tag">${todos.length} รายการ</span></div>
        <div class="slip-todo-list">
          ${todos.map((todo) => `
            <article class="slip-todo-card">
              ${todo.thumbnail ? `<img class="slip-thumb" src="${todo.thumbnail}" alt="สลิป ${escapeHtml(todo.fileName)}">` : `<div class="slip-thumb is-empty">🧾</div>`}
              <div class="slip-todo-main">
                <div class="allocation-head"><strong>${escapeHtml(todo.fileName)}</strong><span class="tag ${todo.qrStatus === "read" ? "green" : "pink"}">${todo.qrStatus === "read" ? "อ่าน QR ได้" : "ต้องกรอกเอง"}</span></div>
                <div class="muted">${todo.amount ? formatMoneyHtml(todo.amount) : "ยังไม่พบยอด"} · ${escapeHtml(todo.reference || "ไม่มีเลขอ้างอิง")}</div>
                <div class="row-actions">
                  <button class="tiny-btn" type="button" data-action="review-slip-todo" data-id="${todo.id}">บันทึกรายการ</button>
                  <button class="tiny-btn danger" type="button" data-action="delete-slip-todo" data-id="${todo.id}">ลบ</button>
                </div>
              </div>
            </article>
          `).join("")}
        </div>
      ` : `<div class="empty-state">ยังไม่มีสลิปที่ต้องตรวจ</div>`}
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
