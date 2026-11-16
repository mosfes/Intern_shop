/** Category slug — categories come from the API, so any string is possible. */
export type CategorySlug = string;

export interface Category {
  slug: CategorySlug;
  name: string;
  nameTh: string;
  description: string;
  image: string;
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
  slug: string;
  name: string;
  brand: string;
  category: CategorySlug;
  price: number;
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
}

export interface OrderLine {
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
}

export type OrderStatus = "processing" | "shipped" | "delivered";

export interface Order {
  id: string;
  createdAt: string;
  status: OrderStatus;
  lines: OrderLine[];
  subtotal: number;
  shipping: number;
  total: number;
  shippingMethod: string;
  paymentMethod: string;
  address: string;
}

export interface DemoUser {
  name: string;
  email: string;
  phone?: string;
}
