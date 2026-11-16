# EDM PC Shop — Intern_shop

เว็บไซต์ร้านอุปกรณ์คอมพิวเตอร์ภาษาไทย รองรับมือถือและเดสก์ท็อป พร้อมแค็ตตาล็อกสินค้า ระบบค้นหา ตะกร้า และขั้นตอนสั่งซื้อ

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
| แค็ตตาล็อก | MockAPI (`products` และ `categories`) พร้อม Next.js Cache Components |
| รูปสินค้า | Cloudflare R2 และ Next.js Image |
| ฐานข้อมูล API ตัวอย่าง | Prisma 7, TiDB / MySQL ผ่าน MariaDB adapter |

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
| `DATABASE_URL` | Connection string ของ TiDB / MySQL สำหรับ `/api/health` และ `/api/tasks` |
| `DATABASE_SSL` | ตั้ง `true` หรือ `false` เพื่อกำหนด TLS เอง; ค่าเริ่มต้นเปิดสำหรับโฮสต์ที่ไม่ใช่ localhost |
| `R2_ACCOUNT_ID` | Account ID สำหรับสคริปต์ R2 |
| `R2_ACCESS_KEY_ID` | Access key สำหรับสคริปต์ R2 |
| `R2_SECRET_ACCESS_KEY` | Secret key สำหรับสคริปต์ R2 |
| `R2_BUCKET` | ชื่อ bucket สำหรับสคริปต์ R2 |

หน้าร้านโหลดสินค้าและหมวดหมู่จาก MockAPI โดยตรง จึงต้องมี resource `products` และ `categories` พร้อมข้อมูลก่อนเปิดเว็บ ไม่มีการอ่านแค็ตตาล็อกสำรองจาก `src/data` อัตโนมัติ ส่วน R2 credentials ใช้เฉพาะสคริปต์จัดการรูป ไม่จำเป็นสำหรับการอ่านรูปสาธารณะ

```bash
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

## TiDB / MySQL

แค็ตตาล็อกหน้าร้านใช้ MockAPI ส่วน Prisma เชื่อมฐานข้อมูลสำหรับ API ตัวอย่าง `Task`

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

## คำสั่งที่ใช้บ่อย

| คำสั่ง | หน้าที่ |
| --- | --- |
| `npm run dev` | เปิดเซิร์ฟเวอร์พัฒนา |
| `npm run lint` | ตรวจโค้ดด้วย ESLint |
| `npm run build` | สร้าง production build |
| `npm start` | เปิด production server หลัง build |
| `npm run db:generate` | สร้าง Prisma Client (รันอัตโนมัติหลังติดตั้ง dependencies) |
| `npm run db:push` | ซิงก์ schema กับฐานข้อมูล |
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
