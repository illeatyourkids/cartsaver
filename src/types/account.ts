import type { CartSlug } from "../data/cartLogos";

export type PublicAccount = {
  id: string;
  storeKey: string;
  cartSlug: CartSlug;
  cartId: string;
  storeUrl: string;
  storeName: string;
  templateCartId: string | null;
  title: string;
  couponcode: string;
  discount: number;
  minimum: number;
  maxdiscount: number;
  logourl: string;
  brandColor?: string;
  active: boolean;
  createdAt: string;
  activatedAt: string | null;
  lastCronAt: string | null;
};

export type AccountStats = {
  sentToday: number;
  sentThisWeek: number;
  sentThisMonth: number;
  matchRate: number | null;
  matchRateToday: number | null;
  matchRateThisWeek: number | null;
  matchRateThisMonth: number | null;
};
