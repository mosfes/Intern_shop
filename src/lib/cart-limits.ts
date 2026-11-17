/** Cart size limits, shared by the browser store, the UI and /api/cart. */
export const MAX_CART_LINES = 200; // different products
export const MAX_LINE_QUANTITY = 50; // pieces of one product

export const CART_LIMIT_MESSAGE = `ตะกร้าเต็ม: ใส่ได้สูงสุด ${MAX_CART_LINES} รายการ และไม่เกิน ${MAX_LINE_QUANTITY} ชิ้นต่อรายการ`;

/** Caps quantity per line and the number of lines (keeps the first ones). */
export function limitCartLines<T extends { quantity: number }>(lines: T[]): T[] {
  return lines.slice(0, MAX_CART_LINES).map((l) => (l.quantity > MAX_LINE_QUANTITY ? { ...l, quantity: MAX_LINE_QUANTITY } : l));
}
