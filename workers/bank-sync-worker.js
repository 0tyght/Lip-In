const PLAID_HOSTS = {
  sandbox: "https://sandbox.plaid.com",
  development: "https://development.plaid.com",
  production: "https://production.plaid.com"
};

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders
    }
  });
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = String(env.CORS_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0] || origin || "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization,Content-Type",
    "Vary": "Origin"
  };
}

function assertAuthorized(request, env) {
  if (!env.SYNC_API_TOKEN) return;
  const expected = `Bearer ${env.SYNC_API_TOKEN}`;
  if (request.headers.get("Authorization") !== expected) {
    throw Object.assign(new Error("Unauthorized bank sync request"), { status: 401 });
  }
}

async function readJson(request) {
  if (!request.body) return {};
  return request.json().catch(() => ({}));
}

function userKey(userId) {
  return `lipin:user:${String(userId || "personal").replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

async function getUserRecord(env, userId) {
  if (!env.BANK_ITEMS) throw Object.assign(new Error("BANK_ITEMS KV binding is not configured"), { status: 500 });
  const raw = await env.BANK_ITEMS.get(userKey(userId));
  return raw ? JSON.parse(raw) : { items: [] };
}

async function saveUserRecord(env, userId, record) {
  if (!env.BANK_ITEMS) throw Object.assign(new Error("BANK_ITEMS KV binding is not configured"), { status: 500 });
  await env.BANK_ITEMS.put(userKey(userId), JSON.stringify(record));
}

function plaidHost(env) {
  return PLAID_HOSTS[env.PLAID_ENV] || PLAID_HOSTS.sandbox;
}

async function plaidRequest(env, path, body) {
  if (!env.PLAID_CLIENT_ID || !env.PLAID_SECRET) {
    throw Object.assign(new Error("Plaid credentials are not configured"), { status: 500 });
  }

  const response = await fetch(`${plaidHost(env)}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.PLAID_CLIENT_ID,
      secret: env.PLAID_SECRET,
      ...body
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(payload.error_message || payload.display_message || `Plaid error ${response.status}`), {
      status: response.status,
      payload
    });
  }

  return payload;
}

function parseList(value, fallback) {
  const items = String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : fallback;
}

async function createLinkToken(request, env, body) {
  const userId = String(body.userId || "lipin-personal");
  const products = parseList(env.PLAID_PRODUCTS, ["transactions"]);
  const countryCodes = parseList(env.PLAID_COUNTRY_CODES, ["US"]);

  const payload = await plaidRequest(env, "/link/token/create", {
    user: { client_user_id: userId },
    client_name: env.PLAID_CLIENT_NAME || "Lip In Money",
    products,
    country_codes: countryCodes,
    language: env.PLAID_LANGUAGE || "en",
    webhook: env.PLAID_WEBHOOK_URL || undefined,
    transactions: { days_requested: Number(env.PLAID_DAYS_REQUESTED || 730) }
  });

  return payload;
}

async function exchangePublicToken(env, body) {
  const userId = String(body.userId || "lipin-personal");
  const publicToken = String(body.publicToken || "");
  if (!publicToken) throw Object.assign(new Error("publicToken is required"), { status: 400 });

  const exchange = await plaidRequest(env, "/item/public_token/exchange", { public_token: publicToken });
  const record = await getUserRecord(env, userId);
  const metadata = body.metadata || {};
  const existingIndex = record.items.findIndex((item) => item.itemId === exchange.item_id);
  const item = {
    provider: "plaid",
    itemId: exchange.item_id,
    accessToken: exchange.access_token,
    institution: metadata.institution || null,
    accounts: metadata.accounts || [],
    cursor: null,
    connectedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) record.items.splice(existingIndex, 1, item);
  else record.items.push(item);
  await saveUserRecord(env, userId, record);

  return {
    provider: "plaid",
    itemId: item.itemId,
    institution: item.institution,
    accounts: item.accounts,
    connectedAt: item.connectedAt
  };
}

function mapPlaidAccount(account) {
  const balance = account.balances || {};
  return {
    provider: "plaid",
    accountId: account.account_id,
    name: account.name || account.official_name || "Bank account",
    mask: account.mask || "",
    type: account.type || "",
    subtype: account.subtype || "",
    balance: Number(balance.current ?? balance.available ?? 0),
    available: Number(balance.available ?? balance.current ?? 0),
    currency: balance.iso_currency_code || balance.unofficial_currency_code || "THB"
  };
}

function mapPlaidTransaction(transaction) {
  const personal = transaction.personal_finance_category || {};
  return {
    provider: "plaid",
    externalId: transaction.transaction_id,
    accountId: transaction.account_id,
    name: transaction.name,
    merchant: transaction.merchant_name || "",
    amount: Number(transaction.amount) || 0,
    date: transaction.authorized_date || transaction.date,
    pending: Boolean(transaction.pending),
    category: personal.primary || (transaction.category || []).join(" / "),
    currency: transaction.iso_currency_code || transaction.unofficial_currency_code || "THB"
  };
}

async function syncItem(env, item) {
  let cursor = item.cursor || null;
  const added = [];
  const modified = [];
  const removed = [];
  let accounts = [];
  let hasMore = true;

  while (hasMore) {
    const payload = await plaidRequest(env, "/transactions/sync", {
      access_token: item.accessToken,
      cursor,
      count: 500
    });

    added.push(...(payload.added || []).map(mapPlaidTransaction));
    modified.push(...(payload.modified || []).map(mapPlaidTransaction));
    removed.push(...(payload.removed || []).map((transaction) => ({
      provider: "plaid",
      externalId: transaction.transaction_id
    })));
    accounts = (payload.accounts || accounts).map(mapPlaidAccount);
    cursor = payload.next_cursor || cursor;
    hasMore = Boolean(payload.has_more);
  }

  if (!accounts.length) {
    const accountPayload = await plaidRequest(env, "/accounts/get", { access_token: item.accessToken });
    accounts = (accountPayload.accounts || []).map(mapPlaidAccount);
  }

  item.cursor = cursor;
  item.accounts = accounts;
  item.lastSyncedAt = new Date().toISOString();

  return { itemId: item.itemId, institution: item.institution, accounts, added, modified, removed };
}

async function syncBanks(env, body) {
  const userId = String(body.userId || "lipin-personal");
  const record = await getUserRecord(env, userId);
  const synced = [];

  for (const item of record.items) {
    if (item.provider !== "plaid") continue;
    synced.push(await syncItem(env, item));
  }

  await saveUserRecord(env, userId, record);

  return {
    provider: "plaid",
    syncedAt: new Date().toISOString(),
    connections: record.items.map((item) => ({
      provider: item.provider,
      itemId: item.itemId,
      institution: item.institution,
      accounts: item.accounts || [],
      connectedAt: item.connectedAt,
      lastSyncedAt: item.lastSyncedAt || null
    })),
    accounts: synced.flatMap((item) => item.accounts),
    added: synced.flatMap((item) => item.added),
    modified: synced.flatMap((item) => item.modified),
    removed: synced.flatMap((item) => item.removed)
  };
}

async function disconnectBank(env, body) {
  const userId = String(body.userId || "lipin-personal");
  const itemId = String(body.itemId || "");
  const record = await getUserRecord(env, userId);
  const item = record.items.find((entry) => entry.itemId === itemId);
  if (item?.accessToken) {
    await plaidRequest(env, "/item/remove", { access_token: item.accessToken }).catch(() => null);
  }
  record.items = record.items.filter((entry) => entry.itemId !== itemId);
  await saveUserRecord(env, userId, record);
  return { disconnected: itemId };
}

async function route(request, env) {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders(request, env) });

  if (url.pathname === "/api/banks/health") {
    assertAuthorized(request, env);
    return { ok: true, provider: "plaid", env: env.PLAID_ENV || "sandbox", kv: Boolean(env.BANK_ITEMS) };
  }

  if (request.method !== "POST") throw Object.assign(new Error("Method not allowed"), { status: 405 });
  assertAuthorized(request, env);
  const body = await readJson(request);

  if (url.pathname === "/api/banks/link-token") return createLinkToken(request, env, body);
  if (url.pathname === "/api/banks/exchange-public-token") return exchangePublicToken(env, body);
  if (url.pathname === "/api/banks/sync") return syncBanks(env, body);
  if (url.pathname === "/api/banks/disconnect") return disconnectBank(env, body);
  if (url.pathname === "/api/banks/webhook") return { ok: true };

  throw Object.assign(new Error("Not found"), { status: 404 });
}

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request, env);
    try {
      const result = await route(request, env);
      if (result instanceof Response) {
        Object.entries(headers).forEach(([key, value]) => result.headers.set(key, value));
        return result;
      }
      return jsonResponse(result, 200, headers);
    } catch (error) {
      return jsonResponse({
        error: error.message || "Bank sync failed",
        details: error.payload || undefined
      }, error.status || 500, headers);
    }
  }
};
