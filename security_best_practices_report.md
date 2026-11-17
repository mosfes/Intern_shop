# รายงานตรวจความปลอดภัยแบบไม่เข้าสู่ระบบ

เป้าหมาย: https://edmpcshop-intern.mosapps.dev/  
วันที่ตรวจ: 17 พฤศจิกายน 2026 (เวลาประเทศไทย)  
ขอบเขต: เว็บและ API ที่เข้าถึงโดยไม่มีบัญชี รวมการอ่านซอร์สที่มีอยู่ใน workspace; ไม่รวมการตรวจสิทธิ์ในบัญชีลูกค้าหรือแอดมิน

## สรุป

พบความเสี่ยงที่ควรแก้ก่อนคือฟอร์มล็อกอินอาจส่งรหัสผ่านใน URL เมื่อ JavaScript ไม่ทำงาน และ API `/api/tasks` เปิดให้อ่านโดยไม่เข้าสู่ระบบ โดยซอร์สแสดงว่ามีทางสร้างข้อมูลโดยไม่ตรวจสิทธิ์ ZAP baseline สำรวจได้ 2,522 URL; จำนวน URL อาจรวมไฟล์ static และ URL ซ้ำในรูปแบบต่าง ๆ ไม่ใช่จำนวนหน้าที่เป็นเอกลักษณ์

## S-01 — สูง: รหัสผ่านอาจอยู่ใน URL เมื่อ JavaScript ไม่ทำงาน

- ตำแหน่ง: `src/components/account/auth-forms.tsx:117` ฟอร์มล็อกอิน และ `:137` ช่อง password
- หลักฐาน: ฟอร์มไม่มี `method` หรือ `action` ที่ระบุ และใช้ `onSubmit` เพื่อ `preventDefault()` ก่อนส่ง JSON ด้วย POST. ZAP spider ซึ่งไม่ได้ทำงานผ่าน JavaScript ส่งค่าจำลองไปที่ `/login?identifier=ZAP&password=ZAP&remember=on`; ค่าทดสอบไม่ใช่รหัสผ่านจริง
- ผลกระทบ: หาก JavaScript โหลดไม่สำเร็จหรือผู้ใช้ส่งฟอร์มก่อน hydration ค่าอาจอยู่ในประวัติเบราว์เซอร์และ access logs. ไม่ได้ทดสอบด้วยบัญชีจริง และไม่ได้พิสูจน์ว่ารหัสผ่านจริงเคยรั่ว
- แนวทางแก้: กำหนด `method="post"` และ action ที่ปลอดภัยซึ่งไม่บันทึกข้อมูลลับ หรือป้องกันการส่งจนกว่า client จะพร้อม พร้อมทดสอบกรณีปิด JavaScript และก่อน hydration; ตรวจฟอร์มสมัครและ OTP ที่มีรูปแบบเดียวกัน

## S-02 — กลาง: `/api/tasks` เปิดอ่านได้โดยไม่ตรวจสิทธิ์ และซอร์สเปิดการสร้างข้อมูล

- ตำแหน่ง: `src/app/api/tasks/route.ts:4` และ `:9-16`
- หลักฐาน: GET โดยไม่มี cookie ตอบ 200 และ array ว่าง; POST แบบข้อมูลว่างจาก Origin ภายนอกตอบ 400 `title is required` แทนการปฏิเสธสิทธิ์. ในซอร์ส POST เรียก `prisma.task.create` เมื่อ title ไม่ว่าง โดยไม่มีการตรวจ session หรือ Origin
- ผลกระทบ: ผู้ไม่เข้าสู่ระบบอาจอ่าน tasks และสร้างข้อมูลรบกวนหรือใช้พื้นที่ฐานข้อมูล ทั้งนี้ยังไม่ได้ส่ง title ที่สร้างข้อมูลจริง จึงยังไม่ได้ยืนยันการสร้างข้อมูลบน deployment โดยตรง และไม่ยืนยันว่า deployment ตรงกับซอร์สทุกบรรทัด
- แนวทางแก้: ลบ endpoint ถ้าเป็นของทดลองที่ไม่ใช้งาน หรือกำหนดสิทธิ์ฝั่งเซิร์ฟเวอร์ ตรวจ Origin และจำกัด input/rate

## S-03 — กลาง: ไม่มี CSP และการป้องกัน clickjacking ในหน้า HTML ที่ตรวจ

- หลักฐาน: การตอบกลับ `/` และ `/login` ไม่มี `Content-Security-Policy` และ `X-Frame-Options`; ZAP รายงานทั้งสองรายการ
- ผลกระทบ: ขาดชั้นป้องกันเสริมต่อ XSS และการฝังหน้าใน iframe; การไม่มี CSP เพียงอย่างเดียวไม่ได้ยืนยันว่ามี XSS
- แนวทางแก้: กำหนด CSP ที่เข้ากับ Next.js และบริการที่ใช้งาน รวม `frame-ancestors`; พิจารณา `X-Frame-Options` สำหรับเบราว์เซอร์เก่า และทดสอบ flow ชำระเงิน/Google

## S-04 — ต่ำ: เปิดเผยเวอร์ชันและรายละเอียดข้อผิดพลาดฐานข้อมูลผ่าน health endpoint

- ตำแหน่ง: `src/app/api/health/route.ts:5-11`
- หลักฐาน: GET โดยไม่เข้าสู่ระบบตอบ `ok: true` และระบุเวอร์ชัน TiDB; ซอร์สส่งข้อความ exception กลับเมื่อเกิดข้อผิดพลาด แต่ยังไม่ได้ทำให้เกิด error เพื่อทดสอบจริง
- แนวทางแก้: ให้ public health แสดงเพียงสถานะทั่วไป และจำกัดข้อมูลเวอร์ชันหรือ error ไว้ใน log หรือ endpoint สำหรับผู้มีสิทธิ์

## S-05 — ต่ำ: security headers เพิ่มเติมหายไป

ZAP แจ้ง `X-Content-Type-Options`, `Permissions-Policy` และ cross-origin isolation headers บางรายการ ตรวจความจำเป็นตามชนิดทรัพยากรและฟังก์ชันก่อนตั้งค่า โดย `X-Content-Type-Options: nosniff` เป็นจุดเริ่มต้นที่เหมาะสม

## การตรวจสิทธิ์ที่ได้ทดลอง

GET แบบไม่ส่ง session ไปยัง `/api/admin/overview`, `/users`, `/orders`, `/products`, `/catalog`, `/logs`, `/flash-sale`, `/promotions`, `/discount-codes` ภายใต้ `/api/admin` ตอบ 401; `/api/cart`, `/api/addresses`, `/api/orders` และ internal stock / order-emails ตอบ 401 เช่นกัน นอกจากนี้ POST `/api/payments/charge` พร้อม Origin ที่ถูกต้องและ body ว่างตอบ 401 โดยไม่เกิดการชำระเงิน ผลนี้ไม่ครอบคลุมทุก HTTP method, IDOR หรือการยกระดับสิทธิ์หลังล็อกอิน

## การคัดกรองผล ZAP เบื้องต้น

- `Cross-Domain Misconfiguration`: หลักฐานที่สุ่มดูเป็น `Access-Control-Allow-Origin: *` บนฟอนต์และไฟล์สาธารณะ ไม่ถือว่าเป็นการรั่วข้อมูลส่วนตัวโดยลำพัง
- `Sub Resource Integrity Attribute Missing`: หลักฐานที่สุ่มดูเป็น preload รูปภาพจาก R2 ไม่ใช่หลักฐานโดยตัวเองว่ามีสคริปต์ภายนอกที่ไม่ปลอดภัย
- `User Controllable HTML Element Attribute`: เป็นสัญญาณให้ตรวจต่อ ไม่ถือว่ายืนยัน XSS จนกว่าจะพิสูจน์ payload ได้
- การตรวจแบบสาธารณะไม่พิสูจน์ความปลอดภัยหลังล็อกอิน และผลอัตโนมัติอาจมี false positive หรือ false negative

รายงานดิบ: `security-audit/zap-baseline.html` และ `security-audit/zap-baseline.json`.

## Active scan เฉพาะจุด

ZAP 2.17.0 ทดสอบ URL `/search?q=computer`, `/products?search=computer` และ `/api/search/suggestions?q=computer` โดยกำหนดเวลาสูงสุด 3 นาทีต่อจุด ผลใน `security-audit/zap-active.json` ไม่มี alert ยืนยัน XSS หรือ SQL injection; รายการ Potential XSS เป็นเพียงการเตือนจาก passive rule และต้องพิสูจน์เพิ่มเติม การจำกัดเวลาหมายความว่าไม่ได้ยืนยันว่าทุกกฎและ payload เสร็จครบ

## ZAP full scan และข้อจำกัด

ZAP full scan สำรวจ 2,587 URL และเริ่ม active scan แต่หยุดด้วยตนเองที่ความคืบหน้า 14% หลังราว 9 นาที เนื่องจากค่าจำกัดเวลาที่ส่งผ่าน command line ไม่ได้ถูกนำไปใช้จริง (ZAP แสดงค่า `MaxScanDurationInMins` เป็น 0) การสแกนเชิงรุกจึง **ไม่ครบ** และผล PASS ในรายงานดิบไม่ควรตีความว่าทุกกฎได้รันครบหรือว่าระบบปลอดภัยทั้งหมด ZAP ไม่แจ้ง high-severity alert ในผลที่เก็บได้; ไม่ได้ยืนยันว่าไม่มีช่องโหว่ระดับสูง

รายงานดิบ full scan: `security-audit/zap-full.html` และ `security-audit/zap-full.json`.

## Full active scan รอบล่าสุด (หยุดตามคำขอ)

วันที่ 18 พฤศจิกายน 2026 ตามเวลาประเทศไทย ZAP สำรวจ 2,587 URL แล้วหยุด active scan ตามคำขอที่ความคืบหน้า 23%; กฎ DOM XSS กำลังทำงานอยู่ จึงไม่ครบทุกกฎ และค่า PASS ในรายงานอัตโนมัติไม่ควรใช้อนุมานว่ากฎที่ยังไม่รันผ่านการตรวจแล้ว รายงาน ZAP ฉบับที่หยุดตามคำขออยู่ที่ `security-audit/zap-active-partial.html` และ `security-audit/zap-active-partial.json`. ไม่มีการเข้าสู่ระบบในรอบนี้
