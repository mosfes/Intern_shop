import 'dotenv/config';
import { writeFile } from 'node:fs/promises';
import { createOrderPdf } from '../src/lib/order-pdf';
import { renderOrderEmail } from '../src/lib/order-email';
import type { Order } from '../src/lib/types';
async function main() {
 const order: Order = { id: 'TEST-24001', createdAt: '2026-11-17T12:00:00Z', status: 'shipped', lines: [{productId:'1', name:'AMD Ryzen 7 9800X3D ซีพียูประสิทธิภาพสูง', image:'/images/products/amd-ryzen-7-9800x3d/3.webp', price:15500, quantity:1}, {productId:'2', name:'Kingston FURY Beast DDR5 32GB', image:'/images/products/kingston-fury-beast-ddr5-32gb-6000/1.webp', price:3890, quantity:2}], subtotal:23280, discount:500, shipping:0, total:22780, address:'คุณตัวอย่าง · 123 ถนนสุขุมวิท แขวงคลองตัน เขตวัฒนา กรุงเทพมหานคร 10110 · 0800000000', shippingMethod:'จัดส่งมาตรฐาน', paymentMethod:'บัตรเครดิต / เดบิต', trackingNumber:'TH123456789' };
 await writeFile('output/pdf/order-preview.pdf', await createOrderPdf(order, true, { name: 'คุณตัวอย่าง', email: 'customer@example.com', phone: '0800000000' }));
 await writeFile('output/pdf/email-preview.html', renderOrderEmail(order, 'status').html.replace('cid:edm-logo', '../../public/brand/email-logo.png'));
}
main().catch(e => {console.error(e); process.exitCode=1});
