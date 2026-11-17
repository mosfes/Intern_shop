import type { Order } from "./types";

export type CustomerShopping = {
  cart: {
    productId: string;
    name: string | null;
    slug: string | null;
    image: string | null;
    price: number | null;
    quantity: number;
    selected: boolean;
    updatedAt: string;
    availability: "available" | "removed" | "unavailable";
  }[];
  orders: {
    id: string;
    chargeId: string | null;
    status: string;
    amount: number;
    createdAt: string;
    order: Order;
  }[];
  page: number;
  totalOrders: number;
  pageSize: number;
};
