import { randomBytes } from "node:crypto";
import type { CartRecord, CartSaveInput } from "../src/types/cart.ts";
import { putCart } from "./store.ts";

function money(n: number) {
  return Math.round(n * 100) / 100;
}

/** Dollars already off this leftover cart. */
export function cartDiscount(payload: { existingDiscount?: number }) {
  return money(payload.existingDiscount || 0);
}

export function existingDiscountPercent(payload: {
  subtotal: number;
  existingDiscount?: number;
}) {
  const original = money(payload.subtotal);
  if (original <= 0) return 0;
  return (cartDiscount(payload) / original) * 100;
}

export function shouldMailCart(input: {
  payload: { subtotal: number; existingDiscount?: number };
  minimum: number;
  maxdiscount: number;
}) {
  const original = money(input.payload.subtotal);
  if (original < (Number(input.minimum) || 0)) return false;
  const already = existingDiscountPercent(input.payload);
  const maxPct = Number(input.maxdiscount) || 0;
  if (maxPct > 0 && already >= maxPct) return false;
  return true;
}

export function pricedOffer(input: CartSaveInput) {
  const original = money(input.payload.subtotal);
  if (!shouldMailCart(input)) {
    return { originalPrice: original, salePrice: original };
  }
  const savings = money(original * (input.discount / 100));
  return { originalPrice: original, salePrice: money(Math.max(0, original - savings)) };
}

export function cartsave(input: CartSaveInput): CartRecord {
  const prices = pricedOffer(input);
  const record: CartRecord = {
    id: randomBytes(6).toString("hex"),
    title: input.title.trim(),
    couponcode: input.couponcode.trim(),
    discount: Number(input.discount) || 0,
    minimum: Number(input.minimum) || 0,
    maxdiscount: Number(input.maxdiscount) || 0,
    logourl: input.logourl.trim(),
    brandColor: input.brandColor?.trim() || undefined,
    payload: {
      ...input.payload,
      items: input.payload.items.slice(0, 3),
      itemCount: input.payload.itemCount || input.payload.items.length
    },
    ...prices,
    storeKey: input.storeKey ?? null,
    createdAt: new Date().toISOString()
  };
  return putCart(record);
}

export function renderengineUrl(opts: {
  base: string;
  cartid: string;
  side: "front" | "back";
}) {
  const u = new URL("/renderengine", opts.base.replace(/\/$/, ""));
  u.searchParams.set("cartid", opts.cartid);
  u.searchParams.set("side", opts.side);
  u.searchParams.set("address", "~ADDRESS~");
  u.searchParams.set("qr_code", "~QR_CODE~");
  return u.toString();
}

export function appBase() {
  return (process.env.APP_BASE_URL || "http://localhost:5175").replace(/\/$/, "");
}
