const PLAID_SCRIPT_URL = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";

function cleanBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function requireSettings(settings) {
  const apiBaseUrl = cleanBaseUrl(settings?.apiBaseUrl);
  const apiToken = String(settings?.apiToken || "").trim();
  const userId = String(settings?.userId || "lipin-personal").trim();

  if (!apiBaseUrl) throw new Error("ยังไม่ได้ตั้งค่า Bank API URL");
  if (!apiToken) throw new Error("ยังไม่ได้ตั้งค่า Sync API token");

  return { apiBaseUrl, apiToken, userId };
}

async function bankApiFetch(settings, path, body = {}) {
  const config = requireSettings(settings);
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ userId: config.userId, ...body })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || payload.message || `Bank API error ${response.status}`);
  }

  return payload;
}

function loadPlaidScript() {
  if (window.Plaid) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${PLAID_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", () => reject(new Error("โหลด Plaid Link ไม่สำเร็จ")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = PLAID_SCRIPT_URL;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("โหลด Plaid Link ไม่สำเร็จ"));
    document.head.appendChild(script);
  });
}

export async function checkBankBackend(settings) {
  const config = requireSettings(settings);
  const response = await fetch(`${config.apiBaseUrl}/api/banks/health`, {
    headers: { "Authorization": `Bearer ${config.apiToken}` }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Bank API error ${response.status}`);
  return payload;
}

export async function connectPlaidBank(settings) {
  await loadPlaidScript();
  const linkToken = await bankApiFetch(settings, "/api/banks/link-token");

  return new Promise((resolve, reject) => {
    const handler = window.Plaid.create({
      token: linkToken.link_token,
      onSuccess: async (publicToken, metadata) => {
        try {
          const result = await bankApiFetch(settings, "/api/banks/exchange-public-token", {
            publicToken,
            metadata
          });
          resolve(result);
        } catch (error) {
          reject(error);
        }
      },
      onExit: (error) => {
        if (error) reject(new Error(error.display_message || error.error_message || "ออกจาก Plaid Link"));
        else reject(new Error("ยกเลิกการเชื่อมธนาคาร"));
      }
    });

    handler.open();
  });
}

export async function syncConfiguredBank(settings) {
  return bankApiFetch(settings, "/api/banks/sync");
}

export async function disconnectBankItem(settings, itemId) {
  return bankApiFetch(settings, "/api/banks/disconnect", { itemId });
}
