# Lip In Money

PWA สำหรับบันทึกรายรับรายจ่าย จัดการกระเป๋าเงิน งบประมาณ เป้าหมายออมเงิน ผ่อนชำระ สแกนใบเสร็จแบบเดโม และซิงก์ธนาคารแบบ mock connector

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
