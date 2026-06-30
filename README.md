# Lip In Money

PWA สำหรับใช้งานเงินจริง: บันทึกรายรับรายจ่าย จัดการกระเป๋าเงิน งบประมาณ เป้าหมายออมเงิน ผ่อนชำระ แบ่งสัดส่วนเงิน นำเข้า statement CSV และซิงก์ธนาคารผ่าน backend ที่ถือ secret ฝั่ง server เท่านั้น

คู่มือใช้งานจริงแบบละเอียด: [docs/REAL_USE_GUIDE.md](docs/REAL_USE_GUIDE.md)

## Real bank sync

Static GitHub Pages cannot safely hold bank API secrets. Real bank sync is split into:

- PWA client: saves settings, opens Plaid Link, syncs transactions, imports CSV statements.
- Cloudflare Worker backend: exchanges public tokens, stores provider access tokens in KV, and talks to Plaid/Open Banking APIs.

Setup guide: [docs/BANK_SYNC.md](docs/BANK_SYNC.md)

## Run locally

```powershell
cd "C:\xampp\htdocs\Lip In"
node dev-server.mjs
```

เปิดใน browser:

```text
http://127.0.0.1:4173/
```

ถ้า port ชน:

```powershell
$env:PORT=4174
node dev-server.mjs
```

## Use from another device on the same Wi-Fi

```powershell
$env:HOST="0.0.0.0"
$env:PORT=4174
node dev-server.mjs
```

จากนั้นเปิดด้วย IP ของคอม เช่น:

```text
http://192.168.1.25:4174/
```

## GitHub Pages

Repo นี้มี workflow สำหรับ deploy GitHub Pages อยู่ที่ `.github/workflows/deploy-pages.yml`

หลัง push แล้ว ไปที่ GitHub repository settings แล้วเลือก Pages source เป็น GitHub Actions ถ้ายังไม่ได้เปิดไว้
