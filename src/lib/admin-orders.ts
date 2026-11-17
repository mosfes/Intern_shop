import type { Order, OrderStatus } from "./types";

export const ORDER_STATUSES = ["processing", "shipped", "delivered", "cancelled"] as const satisfies readonly OrderStatus[];
export const isOrderStatus = (value: unknown): value is OrderStatus => ORDER_STATUSES.includes(value as OrderStatus);

export const orderStatusLabel: Record<OrderStatus, string> = {
  processing: "กำลังเตรียมสินค้า",
  shipped: "กำลังจัดส่ง",
  delivered: "จัดส่งสำเร็จ",
  cancelled: "ยกเลิกแล้ว",
};

/**
 * Where an admin may move a paid order. Cancelled is final: refunds happen in the Omise dashboard,
 * so reopening a cancelled order could ship goods that were already refunded.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  processing: ["shipped", "cancelled"],
  shipped: ["processing", "delivered", "cancelled"],
  delivered: ["shipped"],
  cancelled: [],
};

export const MAX_TRACKING_LENGTH = 60;
export const MAX_ADMIN_NOTE_LENGTH = 500;

export class OrderUpdateError extends Error { constructor(message: string, public status = 400) { super(message); } }

export type OrderUpdate = { id: string; status: OrderStatus; trackingNumber: string; adminNote: string };

/** Validates an untrusted PATCH body. `id` is the CheckoutPayment id. */
export function validateOrderUpdate(body: Record<string, unknown>): OrderUpdate {
  const { id, status, trackingNumber = "", adminNote = "" } = body;
  if (typeof id !== "string" || !id || id.length > 100) throw new OrderUpdateError("ไม่พบคำสั่งซื้อ");
  if (!isOrderStatus(status)) throw new OrderUpdateError("สถานะคำสั่งซื้อไม่ถูกต้อง");
  if (typeof trackingNumber !== "string" || typeof adminNote !== "string") throw new OrderUpdateError("ข้อมูลไม่ถูกต้อง");
  const tracking = trackingNumber.trim();
  if (tracking.length > MAX_TRACKING_LENGTH || !/^[A-Za-z0-9 -]*$/.test(tracking)) throw new OrderUpdateError("เลขพัสดุใช้ได้เฉพาะตัวอักษรอังกฤษ ตัวเลข ช่องว่าง และขีด ไม่เกิน 60 ตัว");
  const note = adminNote.trim();
  if (note.length > MAX_ADMIN_NOTE_LENGTH) throw new OrderUpdateError(`บันทึกต้องไม่เกิน ${MAX_ADMIN_NOTE_LENGTH} ตัวอักษร`);
  return { id, status, trackingNumber: tracking, adminNote: note };
}

/** The new order snapshot, or an error when the status change is not allowed. */
export function applyOrderUpdate(order: Order, update: OrderUpdate, now = new Date()): Order {
  const current = isOrderStatus(order.status) ? order.status : "processing";
  if (current === "cancelled" && update.status !== "cancelled") throw new OrderUpdateError("คำสั่งซื้อที่ยกเลิกแล้วเปลี่ยนสถานะไม่ได้", 409);
  if (update.status !== current && !ORDER_TRANSITIONS[current].includes(update.status)) {
    throw new OrderUpdateError(`เปลี่ยนจาก “${orderStatusLabel[current]}” เป็น “${orderStatusLabel[update.status]}” ไม่ได้`, 409);
  }
  const next: Order = { ...order, status: update.status, adminNote: update.adminNote || undefined };
  if (update.trackingNumber) next.trackingNumber = update.trackingNumber;
  else delete next.trackingNumber;
  if (!next.adminNote) delete next.adminNote;
  if (update.status !== current) next.statusUpdatedAt = now.toISOString();
  return next;
}

/** What a customer may see: the internal admin note stays on the server. */
export function customerOrder(order: Order): Order {
  const visible = { ...order };
  delete visible.adminNote;
  return visible;
}

export type AdminOrderRow = {
  id: string;
  chargeId: string | null;
  amount: number;
  createdAt: string;
  updatedAt: string;
  customer: { id: string; name: string | null; email: string | null; phone: string | null };
  order: Order;
};

export type AdminOrderList = {
  orders: AdminOrderRow[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<OrderStatus | "all", number>;
};
