/** Category slug — categories come from the API, so any string is possible. */
export type CategorySlug = string;

/** A default specification row a category pre-fills in the product form. */
export interface CategorySpecField {
  label: string;
  /** Placeholder shown to the admin, e.g. "AM5 หรือ LGA1700". */
  example: string;
  /** Short explanation of what to enter, e.g. "ยาว x กว้าง x สูง (มม.)". */
  hint?: string;
  /** Read by the PC builder compatibility check — keep the label unchanged. */
  compatibility?: boolean;
  /** Read by the PC builder power advice — keep the label unchanged. */
  powerAdvice?: boolean;
}

export interface Category {
  slug: CategorySlug;
  name: string;
  nameTh: string;
  description: string;
  image: string;
  /** Admin-only: default spec rows for new products. Not sent to the storefront. */
  specFields?: CategorySpecField[];
}

export interface Specification {
  label: string;
  value: string;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  title: string;
  body: string;
  verified: boolean;
}

export type ProductTag = "best-seller" | "new" | "recommended" | "flash-sale" | "special-offer";

export interface Product {
  id: string;
  source?: "mockapi" | "tidb";
  slug: string;
  name: string;
  brand: string;
  category: CategorySlug;
  price: number;
  flashSale?: import("./flash-sale").ProductFlashSale;
  originalPrice: number;
  /** Percentage discount, derived from price / originalPrice */
  discount: number;
  images: string[];
  description: string;
  highlights: string[];
  shortSpecs: string[];
  specifications: Specification[];
  rating: number;
  reviewCount: number;
  reviews: Review[];
  stock: number;
  tags: ProductTag[];
  warranty: string;
}

export interface CartLine {
  productId: string;
  quantity: number;
  /** Ticked in the cart = included in checkout. Missing means ticked. */
  selected?: boolean;
}

export interface OrderLine {
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
}

export type OrderStatus = "processing" | "shipped" | "delivered" | "cancelled";

export interface Order {
  id: string;
  createdAt: string;
  status: OrderStatus;
  /** Payment state returned by the customer orders API. */
  paymentStatus?: "pending" | "successful";
  /** Payment identifier used to resume a pending payment. */
  chargeId?: string;
  lines: OrderLine[];
  subtotal: number;
  shipping: number;
  /** Baht taken off by a discount code (absent on older orders). */
  discount?: number;
  discountCode?: string;
  total: number;
  shippingMethod: string;
  paymentMethod: string;
  address: string;
  /** Set by an admin when the parcel is handed to the carrier. */
  trackingNumber?: string;
  /** When an admin last changed `status`. */
  statusUpdatedAt?: string;
  /** Internal note for admins; removed before the order is sent to the customer. */
  adminNote?: string;
  /**
   * Internal: stock was taken when this order was paid. Orders paid before stock was tracked lack it, so cancelling
   * them must not put back stock that was never taken. Removed before the order is sent to the customer.
   */
  stockTaken?: boolean;
}

export interface DemoUser {
  role?: "admin" | "customer";
  googleId?: string;
  picture?: string | null;
  name: string;
  email: string;
  phone?: string;
}
