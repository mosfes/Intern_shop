# EDM PC Shop — Intern_shop

เว็บไซต์ร้านอุปกรณ์คอมพิวเตอร์

## ฟีเจอร์

- หน้าแรกพร้อมแบนเนอร์โปรโมชัน หมวดหมู่สินค้า และแบรนด์
- ค้นหา กรองตามหมวดหมู่ แบรนด์ ช่วงราคา สินค้าพร้อมส่ง และสินค้าลดราคา พร้อมเรียงลำดับ
- หน้ารายละเอียดสินค้า รูปภาพ สเปก รีวิว และ Quick View
- ตะกร้าสินค้า รายการโปรด และขั้นตอน Checkout พร้อมตัวเลือกจัดส่งและชำระเงิน
- หน้าสมัครสมาชิก เข้าสู่ระบบ โปรไฟล์ และประวัติคำสั่งซื้อ
- ธีมสว่าง/มืด ฟอนต์ Kanit และราคาเงินบาท

## เทคโนโลยี

| ส่วน | เทคโนโลยี |
| --- | --- |
| Framework | Next.js 16.4.6 (App Router), React 19, TypeScript |
| UI | HeroUI v3, Tailwind CSS v4 |
| แค็ตตาล็อก | สินค้าเดิมจาก MockAPI + สินค้าใหม่จาก TiDB พร้อม Next.js Cache Components |
| รูปสินค้า | Cloudflare R2 และ Next.js Image |
| ฐานข้อมูล | Prisma 7, TiDB / MySQL ผ่าน MariaDB adapter |

## เริ่มต้นใช้งาน

ใช้ Node.js 22 LTS (22.12 ขึ้นไป) และ npm

```bash
git clone https://github.com/mosfes/Intern_shop.git
cd Intern_shop
npm ci
cp .env.example .env
```

แก้ไขค่าใน `.env` ให้ตรงกับบริการที่ใช้งาน:

| ตัวแปร | ใช้สำหรับ |
| --- | --- |
| `MOCKAPI_BASE_URL` | URL หลักของโปรเจกต์ MockAPI เช่น `https://YOUR_PROJECT.mockapi.io/api/v1` |
| `NEXT_PUBLIC_IMAGE_BASE_URL` | URL สาธารณะของรูปบน R2 ใช้กำหนดโดเมนที่ Next.js Image อนุญาต |
| `DATABASE_URL` | Connection string ของ TiDB / MySQL สำหรับสินค้าใหม่ บัญชีผู้ใช้ และ API ตัวอย่าง |
| `DATABASE_SSL` | ตั้ง `true` หรือ `false` เพื่อกำหนด TLS เอง; ค่าเริ่มต้นเปิดสำหรับโฮสต์ที่ไม่ใช่ localhost |
| `R2_ACCOUNT_ID` | Account ID สำหรับสคริปต์ R2 |
| `R2_ACCESS_KEY_ID` | Access key สำหรับสคริปต์ R2 |
| `R2_SECRET_ACCESS_KEY` | Secret key สำหรับสคริปต์ R2 |
| `R2_BUCKET` | ชื่อ bucket สำหรับสคริปต์ R2 |

หน้าร้านรวมสินค้าเดิมจาก MockAPI กับสินค้าใหม่จาก TiDB ส่วนแบรนด์และหมวดหมู่ใช้ตาราง Brand/Category ของ TiDB เป็นแหล่งหลัก นำเข้ารายการอ้างอิงเดิมครั้งแรกด้วย `npm run db:import-catalog-metadata` โดยไม่คัดลอกสินค้าและไม่เขียนกลับไป MockAPI ไม่มีการอ่านแค็ตตาล็อกสำรองจาก `src/data` อัตโนมัติ R2 credentials ใช้ฝั่งเซิร์ฟเวอร์สำหรับอัปโหลดรูปผ่านแอดมินและสคริปต์จัดการรูป ส่วนการอ่านรูปสาธารณะไม่ต้องใช้ credentials

```bash
npm run db:generate
npm run db:setup-products
npm run db:setup-image-uploads
npm run db:setup-promotions
npm run db:setup-flash-sale
npm run db:import-catalog-metadata
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

## เตรียมข้อมูลสินค้าและรูปภาพ

ข้อมูลต้นทางอยู่ใน `src/data/products.ts` และ `src/data/categories.ts` รูปสินค้าอยู่ใน `public/images/products/` โดยสคริปต์อัปโหลดจะใช้ key รูปแบบ `products/<slug>/<filename>`

1. สร้าง R2 bucket เปิด URL สาธารณะ และตั้งค่าตัวแปร R2 ใน `.env`
2. อัปโหลดรูปและสร้าง JSON ที่แปลง path รูปให้เป็น URL ของ R2:

   ```bash
   npm run r2:upload
   npm run mockapi:export
   ```

3. สร้าง resource `products` และ `categories` ใน MockAPI ให้รองรับโครงสร้างข้อมูลจาก `output/mockapi/products.json` และ `output/mockapi/categories.json` รวมถึงฟิลด์แบบ array/object
4. นำเข้าข้อมูลด้วยตนเอง หรือใช้คำสั่งต่อไปนี้เมื่อพร้อมแทนที่ข้อมูลเดิม:

   ```bash
   npm run mockapi:push
   ```

   **คำสั่งนี้ลบทุก record ใน `products` และ `categories` ก่อนเพิ่มข้อมูลจาก JSON ใหม่**

รูปสินค้าใน MockAPI ต้องใช้โดเมนเดียวกับ `NEXT_PUBLIC_IMAGE_BASE_URL` หากเปลี่ยนตัวแปรนี้ให้ build แอปใหม่

หน้าแอดมินอัปโหลดรูปสินค้าได้โดยตรง เลือกได้หลายไฟล์ สูงสุด 12 รูปต่อสินค้า รองรับ JPG/PNG/WebP ขนาดไม่เกิน 8 MB ต่อรูป ระบบตรวจไฟล์จริง หมุนภาพตามข้อมูลกล้อง ลดขนาดด้านยาวไม่เกิน 2560 พิกเซล และแปลงเป็น WebP ก่อนอัปโหลดไป R2 ที่ `products/uploads/<uuid>.webp` ฟอร์มแสดงตัวอย่าง ตั้งรูปหลัก สลับลำดับ และนำรูปออกจากรายการได้ โดย URL จะบันทึกพร้อมสินค้าใน TiDB หรือ MockAPI ตามแหล่งเดิม ปุ่มบันทึกและปิดฟอร์มจะถูกปิดระหว่างอัปโหลด

`POST /api/admin/products/images` รับ multipart fields `file` และ `draftId` ครั้งละหนึ่งไฟล์ และตรวจเซสชันแอดมินกับ origin ก่อนรับไฟล์ ต้องตั้ง `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` และ `NEXT_PUBLIC_IMAGE_BASE_URL` ในฝั่งเซิร์ฟเวอร์

ระบบล้างรูปใช้ตาราง `ImageUpload` ใน TiDB ติดตามไฟล์ก่อนส่งเข้า R2 ยกเลิกฟอร์มหรือนำรูปใหม่ออกจะส่งคำขอล้างเฉพาะไฟล์ของผู้ใช้และฟอร์มนั้น ส่วนรูปเดิมล้างหลังบันทึกการแก้ไขหรือลบสินค้าแล้วเท่านั้น ก่อนลบจะตรวจสินค้าจากทั้ง TiDB และ MockAPI รวมถึงโลโก้แบรนด์และรูปหมวดหมู่ หากตรวจแหล่งใดไม่ได้จะเก็บไฟล์ไว้ รูปที่กำลังลบหรือถูกลบแล้วจะนำกลับมาบันทึกไม่ได้ ป้องกันการบันทึกชนกับการลบ

รูปที่ค้างจากปิดแท็บหรือเครือข่ายขัดข้องมีระยะพัก 24 ชั่วโมง การเข้าแอดมินหรืออัปโหลดรูปจะเรียกเก็บกวาดไฟล์หมดอายุหลังส่ง response และการลบที่ล้มเหลวจะเข้าคิวลองใหม่หลัง 5 นาที สำหรับรอบเก็บกวาดที่ไม่ขึ้นกับการเข้าแอดมิน ใช้ `npm run images:cleanup` กับ cron ของเซิร์ฟเวอร์ คำสั่ง `npm run images:cleanup -- --scan-existing` จะลงทะเบียนรูปอัปโหลดรุ่นเก่าที่มีอายุเกิน 24 ชั่วโมงด้วย โดยจำกัดเฉพาะ `products/uploads/<uuid>.webp` และตรวจการใช้งานก่อนลบเสมอ ไม่ลบรูปต้นฉบับในโฟลเดอร์อื่นและไม่ย้ายข้อมูลสินค้า MockAPI

## TiDB / MySQL

สินค้าที่เพิ่มใหม่ผ่านหน้าแอดมินบันทึกลง TiDB โดยไม่ย้ายสินค้าจาก MockAPI สินค้าเดิมยังอ่าน แก้ไข และลบที่ MockAPI ตามเดิม หน้าร้านรวมรายการจากทั้งสองแหล่ง และหน้าแอดมินแสดงป้าย TiDB/MockAPI พร้อมรหัส TiDB ที่ขึ้นต้นด้วย `tidb_` เพื่อไม่ชนกับรหัสเดิม

ตารางสินค้าแยกเป็น `Product`, `Brand`, `Category`, `ProductImage`, `ProductSpecification`, `ProductHighlight`, `ProductShortSpec`, `ProductTag` และ `ProductReview` เชื่อมด้วย Foreign Key ราคาเก็บเป็น Decimal(12,2) แบรนด์และหมวดหมู่ใช้ร่วมกันได้ จุดเด่นที่เลือกจากสเปกเก็บเป็น `ProductSpecification.isHighlighted` และเมื่อสินค้าถูกลบ แถวรายละเอียดที่เกี่ยวข้องถูกลบด้วย Cascade ส่วนแบรนด์/หมวดหมู่ที่ยังถูกใช้อยู่ลบไม่ได้

ใช้ `npm run db:setup-products` เพื่อสร้างเฉพาะตารางสินค้าและ Foreign Key ที่ยังไม่มี คำสั่งนี้ไม่อ่านหรือย้ายสินค้าจาก MockAPI หากเคยมีสินค้า TiDB ในตาราง JSON รุ่นก่อน จะย้ายเฉพาะข้อมูลนั้นและเก็บตารางเดิมไว้ที่ `CatalogProductLegacy`

```bash
# สร้างฐานข้อมูลหากยังไม่มี (ต้องมีสิทธิ์ CREATE DATABASE)
npm run db:create
# สร้าง/ซิงก์ตารางจาก schema
npm run db:push
```

- `GET /api/health` — ตรวจการเชื่อมต่อและเวอร์ชันฐานข้อมูล
- `GET /api/tasks` — อ่านรายการ Task
- `POST /api/tasks` — เพิ่ม Task ด้วย JSON เช่น `{ "title": "ทดสอบ" }`

ตั้งค่า `DATABASE_URL` เช่น `mysql://USER:PASSWORD@HOST:4000/DATABASE` โดย URL-encode อักขระพิเศษในชื่อผู้ใช้และรหัสผ่าน ใช้ `db:push` สำหรับ TiDB Cloud ที่ไม่รองรับ shadow database ของ `prisma migrate dev`

## เข้าสู่ระบบด้วย Google

สร้าง OAuth client ชนิด Web application ตาม [คู่มือ Google](https://developers.google.com/identity/protocols/oauth2/web-server) แล้วตั้ง Authorized redirect URI เป็น `http://localhost:3000/api/auth/google/callback` สำหรับการพัฒนา

ตั้งค่า `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_URL` และ `AUTH_SECRET` ใน `.env` ตาม `.env.example` โดยสร้าง secret ด้วย `openssl rand -base64 32` และเริ่ม dev server ใหม่ สำหรับ production ใช้ `AUTH_URL` เป็น HTTPS origin ของเว็บไซต์และลงทะเบียน callback URL ของโดเมนนั้นกับ Google ให้ตรงกัน

ผู้ใช้ Google จะถูกบันทึกใน `ShopUser` และได้รับ session ใน HttpOnly cookie เป็นเวลา 7 วัน แอดมินจะเข้า `/admin` ส่วนบัญชีที่ไม่มีรายการ `active = true` ใน `AdminCredential` จะเป็นลูกค้าและเข้า `/profile` คำสั่งซื้อยังเก็บในเบราว์เซอร์ แอดมินเข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่านผ่าน `POST /api/auth/password` ได้ด้วย ลูกค้าสมัครด้วยอีเมลและรหัสผ่านได้ โดยต้องยืนยัน OTP ที่ส่งทางอีเมลก่อนสร้างบัญชี และเข้าสู่ระบบด้วยอีเมลกับรหัสผ่าน

ตั้งค่าชื่อผู้ใช้และรหัสผ่านที่ `/admin` → จัดการผู้ใช้ → แอดมิน → แก้ไขบัญชี สำหรับ `mosfes3@gmail.com` ให้เข้า Google ครั้งแรกเพื่อตั้งค่าเอง แอดมินใหม่กำหนดชื่อผู้ใช้และรหัสผ่านได้ในกล่องเพิ่มแอดมิน โดยไม่ต้องล็อกอิน Google ก่อน ชื่อผู้ใช้เป็นอักษรอังกฤษ/ตัวเลข/จุด/ขีดกลาง/ขีดล่าง 3–64 ตัว ไม่แยกตัวพิมพ์ใหญ่เล็ก รหัสผ่าน 12–128 ตัว เก็บแฮช scrypt พร้อม salt เฉพาะบัญชีใน `AdminCredential` และไม่ส่งแฮชกลับทาง API

การเปลี่ยนรหัสผ่านหรือถอดสิทธิ์ทำให้เซสชันรหัสผ่านเดิมใช้งานต่อไม่ได้ การล็อกอินผิดจำกัด 10 ครั้งต่อชื่อผู้ใช้ต่อช่วง 15 นาทีผ่านฐานข้อมูล `AdminLoginLimit` หากไม่เลือกจดจำการเข้าสู่ระบบ cookie จะหมดเมื่อปิดเบราว์เซอร์และ token มีอายุสูงสุด 8 ชั่วโมง การล็อกอินรหัสผ่านต้องตั้ง `AUTH_URL` และ `AUTH_SECRET` แต่ไม่ต้องพึ่งค่าคอนฟิก Google OAuth

`AdminCredential` เป็นแหล่งตรวจสิทธิ์แอดมินเพียงตารางเดียว แอดมิน Google เดิมที่ยังไม่ได้ตั้งรหัสผ่านจะมี `username` และ `passwordHash` เป็น `NULL` และยังใช้ Google ได้ เมื่อถอดสิทธิ์จะตั้ง `active = false` ล้างชื่อผู้ใช้/แฮชรหัสผ่าน และเพิ่ม `version` เพื่อไม่ให้เซสชันเก่ากลับมาใช้ได้หากเพิ่มเป็นแอดมินอีกครั้ง

สำหรับฐานข้อมูลรุ่นเก่าที่มี `AdminEmail` ให้รัน `npm run db:migrate-admins` เพื่อย้ายข้อมูลโดยคงรหัสผ่านเดิม หลังอัปเดตแอปและตรวจสอบแล้วรัน `npm run db:migrate-admins -- --drop-legacy` เพื่อตรวจว่าทุกรายชื่อย้ายครบก่อนลบตารางเดิม อย่ารัน `db:push` เพื่อลบตารางเก่าก่อนย้ายข้อมูล

สำหรับ OTP ให้ตั้ง `RESEND_API_KEY` และ `RESEND_FROM` ด้วยโดเมนผู้ส่งที่ยืนยันใน Resend แล้ว รหัสมีอายุ 10 นาทีและลองยืนยันได้ไม่เกิน 5 ครั้ง

สร้างตารางด้วย `npm run db:push` หรือ `npm run db:setup-accounts` ซึ่งสร้างเฉพาะตารางบัญชีที่ยังไม่มีผ่าน driver โดยตรง จากนั้นรัน `npm run db:seed-admin` **ครั้งเดียวตอนตั้งค่าเริ่มต้น** เพื่อเพิ่ม `mosfes3@gmail.com` ก่อนล็อกอิน ห้ามผูก seed กับ startup หรือ callback เพราะจะเพิ่มสิทธิ์กลับหลังถูกถอด

หน้า `/admin` ใช้แก้ไขชื่อและเบอร์โทรลูกค้า ระงับ/เปิดบัญชี และเพิ่ม/ถอดอีเมลแอดมินล่วงหน้า สิทธิ์ตรวจจากฐานข้อมูลทุกคำขอ ทุกบัญชีถอดสิทธิ์ได้ รวมถึงบัญชีตัวเองและแอดมินคนสุดท้าย หากต้องกู้สิทธิ์ให้ผู้ดูแลฐานข้อมูลเพิ่มอีเมลกลับอย่างชัดเจน บัญชี Google ที่ล็อกอินค้างจากเวอร์ชันก่อนเพิ่มตารางต้องเข้าสู่ระบบใหม่ครั้งหนึ่ง

หน้า `/admin?section=products` → จัดการสินค้า ใช้เพิ่มสินค้าใหม่ลง TiDB และจัดการสินค้าจากทั้ง TiDB/MockAPI ชุดเดียวกับหน้าร้าน มีป้ายแหล่งข้อมูลในตารางและฟอร์ม การแก้ไขและลบบันทึกลงแหล่งเดิม โดยเซิร์ฟเวอร์ตรวจจากรหัสสินค้า ฟอร์มรองรับราคา ส่วนลด สต็อก รูปภาพ การรับประกัน สเปก และป้ายกำกับ พร้อมติ๊กสเปกเป็นจุดเด่น รูปภาพใช้พาธในเว็บไซต์หรือ URL ภายใต้ `NEXT_PUBLIC_IMAGE_BASE_URL` การแก้ไขเก็บคะแนนและรีวิวเดิมไว้ API `/api/admin/products` ตรวจสิทธิ์แอดมินและ origin ก่อนเขียนข้อมูล และล้างแคช catalog หลังบันทึก ก่อนใช้ต้องรัน `npm run db:generate` และ `npm run db:setup-products`

ทดสอบระบบสินค้าด้วย `node --import tsx --test tests/admin-products.test.ts` โดยจำลอง MockAPI และฐานข้อมูล ไม่มีการแก้ไขสินค้าจริง

เมนู `/admin?section=categories` และ `/admin?section=brands` จัดการหมวดหมู่และแบรนด์ใน TiDB รองรับค้นหา แบ่งหน้า เพิ่ม แก้ไข อัปโหลดรูป/โลโก้ และลบรายการที่ไม่มีสินค้าใช้งาน จำนวนสินค้านับรวมทั้ง TiDB และ MockAPI รหัสหมวดหมู่คงเดิมหลังสร้าง ส่วนชื่อแบรนด์ที่ยังมีสินค้า MockAPI อ้างอิงอยู่แก้ไขไม่ได้เพื่อไม่ให้การเชื่อมโยงขาด แต่เปลี่ยนโลโก้ได้ โลโก้ที่กำหนดใน TiDB ใช้แทนโลโก้เริ่มต้นบนหน้าร้าน ฟอร์มสินค้าใช้รายการแบรนด์และหมวดหมู่จาก TiDB โดยตรง

`npm run db:import-catalog-metadata` นำเข้าชื่อแบรนด์จากสินค้าเดิมและรายละเอียดหมวดหมู่จาก MockAPI เฉพาะรายการที่ยังไม่มีใน TiDB จึงรันซ้ำได้โดยไม่ทับข้อมูลที่แอดมินแก้ไขไว้ และไม่แตะต้องแถวสินค้า

ตรวจ flow และสิทธิ์ด้วย `node --import tsx --test tests/google-auth.test.ts tests/admin-access.test.ts tests/admin-password.test.ts` ซึ่งจำลอง Google และฐานข้อมูลโดยไม่ใช้บัญชีจริง

## คำสั่งที่ใช้บ่อย

| คำสั่ง | หน้าที่ |
| --- | --- |
| `npm run dev` | เปิดเซิร์ฟเวอร์พัฒนา |
| `npm run lint` | ตรวจโค้ดด้วย ESLint |
| `npm run build` | สร้าง production build |
| `npm start` | เปิด production server หลัง build |
| `npm run db:generate` | สร้าง Prisma Client (รันอัตโนมัติหลังติดตั้ง dependencies) |
| `npm run db:push` | ซิงก์ schema กับฐานข้อมูล |
| `npm run db:setup-products` | เพิ่มเฉพาะตารางสินค้าและ Foreign Key ใน TiDB โดยไม่ย้ายสินค้า MockAPI |
| `npm run db:import-catalog-metadata` | นำเข้าเฉพาะชื่อแบรนด์และรายละเอียดหมวดหมู่มาใช้ใน TiDB โดยไม่ย้ายสินค้า |
| `npm run db:setup-image-uploads` | สร้างตารางติดตามไฟล์อัปโหลดและคิวล้างรูป |
| `npm run db:setup-promotions` | สร้างตารางโปรโมชันหน้าแรก (สไลด์ การ์ด แบนเนอร์) และใส่ข้อมูลเริ่มต้น |
| `npm run db:setup-flash-sale` | สร้างตารางเวลาแฟลชเซลและราคาพิเศษแยกจากราคาสินค้า (เวลาประเทศไทย) |
| `npm run images:cleanup` | ล้างรูปหมดอายุที่ตรวจแล้วว่าไม่มีการใช้งาน และลองลบคิวที่ค้าง |
| `npm run db:studio` | เปิด Prisma Studio |
| `npm run db:migrate` | สร้าง migration สำหรับฐานข้อมูลที่รองรับ shadow database |
| `npm run db:create` | สร้างฐานข้อมูลตาม `DATABASE_URL` |
| `npm run r2:check` | ทดสอบเขียน อ่าน URL สาธารณะ และลบไฟล์ `_healthcheck.txt` ใน R2 |
| `npm run r2:upload` | อัปโหลดรูปสินค้าไป R2; ข้ามไฟล์ที่มีขนาดตรงกับไฟล์ปลายทาง |
| `npm run mockapi:export` | สร้าง JSON แค็ตตาล็อกใน `output/mockapi/` |
| `npm run mockapi:push` | แทนที่ข้อมูลใน MockAPI ด้วย JSON ที่ export ไว้ |

## โครงสร้างโปรเจกต์

```text
src/app/          หน้าเว็บและ API routes
src/components/   UI, แค็ตตาล็อก, หน้าสินค้า, ตะกร้า และ Checkout
src/data/         ข้อมูลต้นทางสินค้า หมวดหมู่ และแหล่งรูปภาพ
src/lib/          แค็ตตาล็อก, store, ค้นหา, รูปแบบราคา และ Prisma client
prisma/           Database schema
scripts/          เครื่องมือฐานข้อมูล, R2 และ MockAPI
public/           โลโก้แบรนด์ รูปสินค้า และภาพโปรโมชัน
```

ไฟล์ `.env`, Prisma Client ที่ generate แล้ว, build output, JSON exports และภาพตรวจงานใน `output/` ถูกยกเว้นจาก Git ส่วน `.env.example` เป็นตัวอย่างการตั้งค่าที่ไม่มี credentials จริง

หลังอัปเดตฟีเจอร์บังคับเปลี่ยนรหัสผ่าน ให้รัน `npm run db:setup-accounts` เพื่อเพิ่มคอลัมน์ `mustChangePassword` ในฐานข้อมูลเดิม แล้วรัน `npm run db:generate` และเริ่มเซิร์ฟเวอร์ใหม่ บัญชีที่สร้างหรือตั้งรหัสผ่านใหม่จากหน้าแอดมินจะต้องเปลี่ยนรหัสผ่านในการล็อกอินด้วยรหัสผ่านครั้งถัดไป ก่อนเข้าหน้าแอดมินได้

### Admin activity logs

Run `npm run db:setup-admin-logs` before using `/admin?section=logs`.
Logs capture actor, timestamp, resource, action, target identifier and HTTP status for product, brand, category, promotion, discount code and user mutations. Request bodies and passwords are excluded.
An attempt is saved before executing the handler; if this fails, the request returns 503 without changing data. Status 0 means the result is unconfirmed (process interrupted or status update failed), and does not establish success or failure.
Successful admin sign-ins (password and Google) and explicit sign-outs are also logged before issuing or clearing the session cookie. Customer authentication, failed sign-ins, automatic session expiry, image uploads and historical activity are outside this log. If audit persistence fails, authentication returns an error so the user can retry.

Admin logs also capture IP, User-Agent and approximate country/region/city when supplied by a trusted hosting proxy. Re-run `npm run db:setup-admin-logs` to add nullable columns to existing installations; old entries remain intact with unknown context. Restart the dev server after regenerating Prisma.
Vercel is detected through `VERCEL=1`. For Cloudflare, set `ADMIN_LOG_PROXY=cloudflare`, restrict direct access to the origin, and enable its Add visitor location headers transform for city/region. A custom protected reverse proxy can use `ADMIN_LOG_PROXY=proxy` and must overwrite `X-Real-IP`; location remains unknown in this mode. `ADMIN_LOG_PROXY=none` disables proxy metadata. Local development without a trusted proxy shows unknown IP/location. User-Agent descriptions are client-reported, and IP location is approximate (VPN/mobile networks can differ). No external geolocation service receives admin IPs.
Header references: [Vercel](https://vercel.com/docs/headers/request-headers), [Cloudflare](https://developers.cloudflare.com/fundamentals/reference/http-headers/).

### Order notification emails

Paid orders and fulfilment or tracking updates enqueue an email to the customer's account email. Each email includes a printable PDF purchase-order attachment (not a tax invoice). Internal admin notes are excluded. Email provider failures do not undo a completed order update; queued messages can be retried.

1. Run `npm run db:setup-order-emails` against the target database before enabling email.
2. Set `RESEND_API_KEY` and `RESEND_FROM` on the server. The sender domain must be verified in Resend. Never expose the key in browser code.
3. Set a long random `CRON_SECRET` and configure a scheduler to call `GET /api/internal/order-emails` with `Authorization: Bearer <CRON_SECRET>`. Schedule it frequently enough for the desired retry time. The endpoint handles up to 20 messages per invocation. Monitor errors and the `OrderEmail` table. Resend idempotency keys expire after 24 hours, so an uncertain delivery retried after that window can be duplicated.
4. Configure the same variables and scheduler in the production hosting environment. Messages are queued only while both Resend variables are configured; enabling email later does not backfill older orders.

### Stock reservations and MockAPI delivery

MockAPI remains the source of stock balances for MockAPI products. TiDB stores only reservation quantities, coordination locks and ordered stock movements; no MockAPI balance is migrated or mirrored.

Before running the updated checkout:

1. Run `npm run db:setup-stock`, then `npm run db:generate` and restart the app. The setup creates three additive tables and does not modify existing products, payments or balances.
2. Add a **String** field named `stockOperationId` to the MockAPI `products` resource, initially an empty string on existing records. MockAPI must persist this field together with `stock` in one product PUT. Checkout refuses to charge for a MockAPI product without this receipt capability. Keep the field on exports/imports and do not edit it manually.
3. Set `CRON_SECRET` and schedule `GET /api/internal/stock` every minute with `Authorization: Bearer <CRON_SECRET>`. Alternatively run `npm run stock:retry` from a server scheduler. This reconciles up to 20 pending/stock-blocked bank payments and processes up to 20 queued movements per run. It works independently of email configuration. Monitor the returned `pending`, `review` and `unlinked` counts and each movement's `lastError`.

A checkout reserves fresh, uncached availability before contacting Omise. Reservations reduce available stock without changing the displayed physical balance until payment succeeds. Definitive failed/expired/reversed payments release their reservation; a pending payment keeps it. A paid TiDB order decrements stock in the same transaction as settlement. MockAPI deductions and cancellation returns enter a durable per-product queue, with sequence numbers allocated under a shared database row lock across server instances. Failed deductions remain ahead of their returns. Full product edits, quick stock edits and deletion use the same locks; outdated stock values and reductions below reserved quantities are rejected.

The worker commits a `sending` intent before PUT, and sends only once for that intent. If a response or database commit is lost after MockAPI saved the change, the worker confirms `stockOperationId` and completes the job without another deduction. GET failures before PUT are retried automatically. An uncertain PUT is polled for its receipt; the worker never blindly resends it or lets a later operation overtake it. This also protects against a timed-out HTTP request that writes later. If the receipt never appears, or a response drops/changes it, the operation needs review rather than an automatic second write. After confirming at the provider that no original request can still complete, an operator can reconcile the remote balance/receipt and either mark that movement `applied` or reset it to `pending` **only when it was not applied**. Never reset an uncertain operation based only on elapsed time.

A bank-create timeout or process crash before saving its charge ID likewise retains the reservation. A later webhook can recover it through `metadata.checkoutId`; `unlinked` reports snapshots older than ten minutes still lacking an ID. Check Omise records before linking the actual charge and running reconciliation, or marking a definitively uncharged checkout failed and releasing its held reservations together in a transaction. There is no blind time-based release that could sell stock already paid for. Keep the Omise webhook configured; polling is recovery, not a substitute for webhooks.

Legacy paid checkouts without enough free stock remain visible as paid with an admin stock-allocation warning; shipping is blocked until reconciliation can allocate all lines. Cancelling one without an allocation does not create stock. Existing paid orders lacking the old `stockTaken` flag still do not return stock on cancellation.

All stock writes must go through this application. Changes made directly in the MockAPI dashboard or another integration bypass database locks; MockAPI does not expose conditional stock writes. Check physical stock and open reservations before any such maintenance.
