# Bank Sync Setup

Lip In Money supports two production paths:

1. Real Open Banking sync through a server-side connector.
2. Bank statement CSV import for banks that do not expose a personal transaction API.

The static PWA must not store bank access tokens or provider secrets. The included Cloudflare Worker keeps provider secrets and Plaid access tokens server-side.

## What Is Included

- `src/integrations/bank-client.js`: PWA client for Link, sync, and backend health checks.
- `src/integrations/bank-import.js`: CSV statement parser and category mapper.
- `workers/bank-sync-worker.js`: Cloudflare Worker API for Plaid Link token, public-token exchange, transactions sync, and disconnect.
- `workers/wrangler.toml.example`: Worker config template.

## Deploy Worker

```powershell
cd "C:\xampp\htdocs\Lip In\workers"
copy wrangler.toml.example wrangler.toml
```

Edit `wrangler.toml`:

- Set `BANK_ITEMS` KV namespace id.
- Set `CORS_ORIGINS` to your GitHub Pages URL and local dev URLs.
- Choose `PLAID_ENV`: use `development` for your own live test connections, then `production` only after provider approval.
- Choose `PLAID_COUNTRY_CODES` for countries supported by your provider.

Create KV:

```powershell
wrangler kv namespace create BANK_ITEMS
```

Set secrets:

```powershell
wrangler secret put PLAID_CLIENT_ID
wrangler secret put PLAID_SECRET
wrangler secret put SYNC_API_TOKEN
```

Deploy:

```powershell
wrangler deploy
```

## Configure The PWA

Open Lip In Money, go to `ธนาคาร`, and fill:

- `Bank API URL`: your Worker URL, for example `https://lip-in-bank-sync.example.workers.dev`
- `User ID`: `lipin-personal` or another stable id for your own data
- `Sync API token`: the same value as the Worker `SYNC_API_TOKEN` secret

Then:

1. Tap `ตรวจ backend`.
2. Tap `เชื่อมธนาคารจริง`.
3. Complete the provider Link flow.
4. Tap `ซิงก์รายการจริง`.

## Security Notes

- Bank provider `access_token` is stored in Worker KV, not in localStorage.
- The PWA stores only the Worker URL, your local user id, and the app sync token.
- For a real multi-user app, replace `SYNC_API_TOKEN` with proper login/session auth.
- Do not deploy with Plaid production credentials until the provider app is reviewed and production access is approved.
- If your bank/country is not supported by the selected provider, use CSV import or replace the Worker connector with an API you are officially allowed to use.

## CSV Statement Fallback

If your bank does not provide a supported API, download a CSV statement from the bank app/website and use `นำเข้า statement`.

Supported column names include:

- `date`, `transaction date`, `วันที่`
- `description`, `details`, `รายการ`, `รายละเอียด`
- `amount`, `debit`, `credit`, `เงินออก`, `เงินเข้า`
- `reference`, `transaction id`, `เลขที่รายการ`

The parser deduplicates by reference id or a stable hash of date, description, amount, and account.
