# Lip In Money

PWA สำหรับใช้งานเงินจริงกับธนาคารไทย: บันทึกรายรับรายจ่าย จัดการกระเป๋าเงิน งบประมาณ เป้าหมาย ผ่อนชำระ อ่านสลิปโอนเงินจากรูปในเครื่อง และนำเข้า statement CSV จากธนาคารไทย

คู่มือใช้งานจริงแบบละเอียด: [docs/REAL_USE_GUIDE.md](docs/REAL_USE_GUIDE.md)

## Thai slip workflow

- เลือกรูปสลิปจากเครื่อง ผู้ใช้ไม่ต้องอัปโหลดรูปออกจากอุปกรณ์
- แอปพยายามอ่าน QR ในสลิปด้วยความสามารถของ browser
- สลิปที่อ่านยอด/รายละเอียดไม่ครบจะเข้า `To do สลิป`
- ผู้ใช้เปิด To do เพื่อเติมชื่อรายการ หมวด กระเป๋า แล้วบันทึกเป็นธุรกรรมจริง
- ไม่มี Plaid, Open Banking ต่างประเทศ, Worker backend หรือ bank secret ในโปรเจกต์แล้ว

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
