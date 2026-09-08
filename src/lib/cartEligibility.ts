export function money(n: number) {
  return Math.round(n * 100) / 100;
}

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

export function cartEligibilityError(input: {
  payload: { subtotal: number; existingDiscount?: number };
  minimum: number;
  maxdiscount: number;
}) {
  const original = money(input.payload.subtotal);
  const minimum = Number(input.minimum) || 0;
  if (original < minimum) {
    return `This cart is $${original.toFixed(2)}. Raise the minimum or sync a higher-value abandoned cart.`;
  }
  const already = existingDiscountPercent(input.payload);
  const maxPct = Number(input.maxdiscount) || 0;
  if (maxPct > 0 && already >= maxPct) {
    return `This cart is already ${already.toFixed(0)}% off. Increase max discount or sync a different cart.`;
  }
  return null;
}
