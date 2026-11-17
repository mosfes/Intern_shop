import PDFDocument from "pdfkit";
import { join } from "node:path";
import { orderStatusLabel } from "./admin-orders";
import { productImageBuffer } from "./order-images";
import { bahtText } from "./baht-text";
import type { Order } from "./types";

const root = process.cwd();
const amount = (n: number) => `฿${Number(n).toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;
type Customer = { name: string; email: string; phone: string | null };

/** Purchase order based on the existing printable page; embeds Thai fonts for portable PDFs. */
export async function createOrderPdf(order: Order, paid = true, customer?: Customer, chargeId?: string | null): Promise<Buffer> {
  const pictures = await Promise.all(order.lines.map((item) => productImageBuffer(item.image)));
  const date = new Date(order.createdAt);
  const pdf = new PDFDocument({ size: "A4", margin: 43, info: { Title: `Purchase order ${order.id}`, Author: "EDM PC Shop", CreationDate: Number.isNaN(date.valueOf()) ? new Date(0) : date } });
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => { pdf.on("data", (c: Buffer) => chunks.push(c)); pdf.on("end", () => resolve(Buffer.concat(chunks))); pdf.on("error", reject); });
  pdf.registerFont("regular", join(root, "assets/fonts/Sarabun-Regular.ttf"));
  pdf.registerFont("bold", join(root, "assets/fonts/Sarabun-Bold.ttf"));
  const left = 43, width = pdf.page.width - 86, right = left + width;
  const rule = (y: number, dark = false) => pdf.moveTo(left, y).lineTo(right, y).lineWidth(dark ? 1.2 : 0.5).strokeColor(dark ? "#171717" : "#d4d4d4").stroke();
  const text = (str: string, x: number, y: number, w: number, size = 9, bold = false, color = "#262626", align: "left" | "right" = "left") => pdf.font(bold ? "bold" : "regular").fontSize(size).fillColor(color).text(str, x, y, { width: w, align });
  pdf.image(join(root, "public/brand/document-logo.png"), left, 42, { width: 85 });
  text("EDM PC Shop", left, 82, 240, 10, true);
  text("250/92 ซอยรามคำแหง 112 แขวงสะพานสูง เขตสะพานสูง กรุงเทพฯ 10240", left, 99, 270, 8);
  text("โทร 02-000-0000 · hello@edmpcshop.example", left, 126, 270, 8);
  text("ใบสั่งซื้อ", left + 305, 42, width - 305, 21, true, "#171717", "right");
  text("PURCHASE ORDER", left + 305, 70, width - 305, 9, false, "#737373", "right");
  const fmtDate = Number.isNaN(date.valueOf()) ? order.createdAt : new Intl.DateTimeFormat("th-TH", { timeZone:"Asia/Bangkok", day:"numeric", month:"long", year:"numeric", hour:"2-digit", minute:"2-digit" }).format(date);
  const details = [["เลขที่", order.id], ["วันที่สั่งซื้อ", fmtDate], ["การชำระเงิน", paid ? "ชำระเงินแล้ว" : "รอชำระเงิน"], ...(paid ? [["สถานะ", orderStatusLabel[order.status] ?? order.status]] : [])];
  details.forEach(([label,value], i) => { text(label, left + 295, 90 + i * 14, 60, 8, false, "#737373"); text(value, left + 356, 90 + i * 14, width - 356, 8, i === 0); });
  rule(158, true);
  text("ผู้สั่งซื้อ", left, 173, 220, 9, true, "#737373");
  text(customer?.name ?? "-", left, 190, 220, 10, true);
  if (customer?.email) text(customer.email, left, 205, 220);
  if (customer?.phone) text(`โทร ${customer.phone}`, left, 219, 220);
  text("ที่อยู่จัดส่ง", left + 260, 173, width - 260, 9, true, "#737373");
  text(order.address, left + 260, 190, width - 260, 9);
  const addressEnd = pdf.y;
  text(`${order.shippingMethod}${order.trackingNumber ? ` · เลขพัสดุ ${order.trackingNumber}` : ""}`, left + 260, addressEnd + 3, width - 260, 9, false, "#525252");
  let y = Math.max(240, pdf.y + 16); rule(y); y += 14;
  const header = () => { rule(y, true); text("ลำดับ",left,y+7,36,8,true); text("รายการสินค้า",left+40,y+7,210,8,true); text("จำนวน",left+265,y+7,40,8,true,"#262626","right"); text("ราคาต่อหน่วย",left+310,y+7,90,8,true,"#262626","right"); text("จำนวนเงิน",left+405,y+7,width-405,8,true,"#262626","right"); y+=25; rule(y,true); y+=6; };
  header();
  order.lines.forEach((item, i) => {
    pdf.font("regular").fontSize(9); const rowHeight = Math.max(56, pdf.heightOfString(item.name,{width:160}) + 26);
    if (y + rowHeight > 710) { pdf.addPage(); y=45; header(); }
    text(String(i+1),left,y+4,34,9); if (pictures[i]) pdf.image(pictures[i]!, left+40, y+4, { fit: [42, 42], align: "center", valign: "center" }); text(item.name,left+90,y+4,160,9); const end=pdf.y;
    text(`รหัสสินค้า ${item.productId}`,left+90,end+1,160,8,false,"#737373");
    text(String(item.quantity),left+265,y+4,40,9,false,"#262626","right"); text(amount(item.price),left+310,y+4,90,9,false,"#262626","right"); text(amount(item.price*item.quantity),left+405,y+4,width-405,9,false,"#262626","right");
    y += rowHeight; rule(y); y+=4;
  });
  if (y > 630) { pdf.addPage(); y=48; }
  y=Math.max(y+22, 670);
  text(`${paid ? "ชำระเงินโดย" : "ช่องทางชำระเงิน"}: ${order.paymentMethod}`,left,y,230,9);
  if (chargeId) text(`รหัสอ้างอิงการชำระเงิน ${chargeId}`,left,y+17,230,8,false,"#737373");
  text(`(${bahtText(order.total)})`,left,y+38,235,9,true);
  const summary=(label:string,value:string,offset:number,bold=false) => { text(label,left+270,y+offset,120,9,bold); text(value,left+390,y+offset,width-390,9,bold,"#262626","right"); };
  summary("รวมค่าสินค้า",amount(order.subtotal),0);
  let offset=18; if (order.discount) { summary(`ส่วนลด${order.discountCode ? ` (${order.discountCode})` : ""}`,`−${amount(order.discount)}`,offset); offset+=18; }
  summary("ค่าจัดส่ง",order.shipping ? amount(order.shipping) : "ฟรี",offset); offset+=20;
  pdf.moveTo(left+270,y+offset-3).lineTo(right,y+offset-3).lineWidth(1).strokeColor("#171717").stroke();
  summary(paid ? "ยอดชำระทั้งสิ้น" : "ยอดที่ต้องชำระ",amount(order.total),offset+3,true);
  pdf.moveTo(left+270,y+offset+20).lineTo(right,y+offset+20).stroke();
  pdf.end(); return done;
}
