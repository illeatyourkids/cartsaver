import type { CartSlug } from "../src/data/cartLogos.ts";

export type RawDate = { value?: string; format?: string };

export type RawAbandonedProduct = {
  product_id?: string;
  name?: string;
  price?: number;
  price_inc_tax?: number;
  quantity?: number;
  total_price?: number;
  discount_amount?: number | null;
};

export type RawAbandonedOrder = {
  id?: string;
  basket_id?: string | null;
  basket_url?: string | null;
  created_at?: RawDate;
  modified_at?: RawDate;
  customer?: { first_name?: string; last_name?: string; email?: string; id?: string };
  totals?: { total?: number; subtotal?: number; shipping?: number; tax?: number; discount?: number };
  order_products?: RawAbandonedProduct[];
};

export type PlatformDef = {
  slug: CartSlug;
  /** Api2Cart `cart_id` values from account.cart.add / account.cart.list */
  cartIds: string[];
  basketUrl: (storeUrl: string, order: RawAbandonedOrder) => string;
  linePrice: (product: RawAbandonedProduct, order: RawAbandonedOrder) => number;
  orderSubtotal: (order: RawAbandonedOrder) => number;
};

function money(n: number) {
  return Math.round(n * 100) / 100;
}

function baseUrl(storeUrl: string) {
  return storeUrl.replace(/\/$/, "");
}

function directBasketUrl(order: RawAbandonedOrder) {
  return order.basket_url?.trim() || "";
}

function sumLineTotals(order: RawAbandonedOrder) {
  return (order.order_products ?? []).reduce(
    (sum, product) => sum + Number(product.total_price || product.price || 0) * (product.quantity || 1),
    0
  );
}

function defaultSubtotal(order: RawAbandonedOrder) {
  return money(Number(order.totals?.subtotal || order.totals?.total || sumLineTotals(order) || 0));
}

function defaultLinePrice(product: RawAbandonedProduct) {
  const unit = Number(product.price_inc_tax ?? product.price ?? product.total_price ?? 0);
  const qty = product.quantity || 1;
  const total = Number(product.total_price || 0);
  if (total > 0 && qty > 0) return money(total / qty);
  return money(unit);
}

function wooLinePrice(product: RawAbandonedProduct, order: RawAbandonedOrder) {
  const subtotal = defaultSubtotal(order);
  let price = defaultLinePrice(product);
  if (price > 100 && subtotal > 0 && price > subtotal * 2 && Number.isInteger(price)) {
    price = money(price / 100);
  }
  return price;
}

export const PLATFORMS: PlatformDef[] = [
  {
    slug: "shopify",
    cartIds: ["Shopify"],
    basketUrl(storeUrl, order) {
      const direct = directBasketUrl(order);
      if (direct) return direct;
      const base = baseUrl(storeUrl);
      if (order.basket_id) return `${base}/${order.basket_id}/checkouts/recover`;
      return `${base}/cart`;
    },
    linePrice: defaultLinePrice,
    orderSubtotal: defaultSubtotal
  },
  {
    slug: "woocommerce",
    cartIds: ["Woocommerce", "WoocommerceApi"],
    basketUrl(storeUrl, order) {
      const direct = directBasketUrl(order);
      if (direct) return direct;
      const base = baseUrl(storeUrl);
      if (order.basket_id) return `${base}/cart/?recover_cart=${encodeURIComponent(order.basket_id)}`;
      return `${base}/cart/`;
    },
    linePrice: wooLinePrice,
    orderSubtotal: defaultSubtotal
  },
  {
    slug: "magento",
    cartIds: ["Magento2Api", "Magento1212"],
    basketUrl(storeUrl, order) {
      const direct = directBasketUrl(order);
      if (direct) return direct;
      return `${baseUrl(storeUrl)}/checkout/cart/`;
    },
    linePrice: defaultLinePrice,
    orderSubtotal: defaultSubtotal
  },
  {
    slug: "prestashop",
    cartIds: ["PrestashopApi", "Prestashop"],
    basketUrl(storeUrl, order) {
      const direct = directBasketUrl(order);
      if (direct) return direct;
      return `${baseUrl(storeUrl)}/order`;
    },
    linePrice: defaultLinePrice,
    orderSubtotal: defaultSubtotal
  },
  {
    slug: "shopware",
    cartIds: ["ShopwareApi", "Shopware"],
    basketUrl(storeUrl, order) {
      const direct = directBasketUrl(order);
      if (direct) return direct;
      return `${baseUrl(storeUrl)}/checkout/cart`;
    },
    linePrice: defaultLinePrice,
    orderSubtotal: defaultSubtotal
  },
  {
    slug: "opencart",
    cartIds: ["Opencart14", "Opencart15", "Opencart3", "Opencart4"],
    basketUrl(storeUrl, order) {
      const direct = directBasketUrl(order);
      if (direct) return direct;
      return `${baseUrl(storeUrl)}/index.php?route=checkout/cart`;
    },
    linePrice: defaultLinePrice,
    orderSubtotal: defaultSubtotal
  },
  {
    slug: "cscart",
    cartIds: ["Cscart"],
    basketUrl(storeUrl, order) {
      const direct = directBasketUrl(order);
      if (direct) return direct;
      return `${baseUrl(storeUrl)}/cart/`;
    },
    linePrice: defaultLinePrice,
    orderSubtotal: defaultSubtotal
  },
  {
    slug: "xcart",
    cartIds: ["Xcart"],
    basketUrl(storeUrl, order) {
      const direct = directBasketUrl(order);
      if (direct) return direct;
      return `${baseUrl(storeUrl)}/cart.php`;
    },
    linePrice: defaultLinePrice,
    orderSubtotal: defaultSubtotal
  },
  {
    slug: "zencart",
    cartIds: ["Zencart137", "Zencart"],
    basketUrl(storeUrl, order) {
      const direct = directBasketUrl(order);
      if (direct) return direct;
      return `${baseUrl(storeUrl)}/index.php?main_page=shopping_cart`;
    },
    linePrice: defaultLinePrice,
    orderSubtotal: defaultSubtotal
  },
  {
    slug: "salesforce",
    cartIds: ["Demandware"],
    basketUrl(storeUrl, order) {
      const direct = directBasketUrl(order);
      if (direct) return direct;
      const base = baseUrl(storeUrl);
      if (order.basket_id) return `${base}/Cart-${order.basket_id}`;
      return `${base}/cart`;
    },
    linePrice: defaultLinePrice,
    orderSubtotal: defaultSubtotal
  },
  {
    slug: "oscommerce",
    cartIds: ["Oscommerce22ms2", "Oscommerce"],
    basketUrl(storeUrl, order) {
      const direct = directBasketUrl(order);
      if (direct) return direct;
      return `${baseUrl(storeUrl)}/shopping_cart.php`;
    },
    linePrice: defaultLinePrice,
    orderSubtotal: defaultSubtotal
  }
];

const byCartId = new Map<string, PlatformDef>();
const bySlug = new Map<CartSlug, PlatformDef>();

for (const platform of PLATFORMS) {
  bySlug.set(platform.slug, platform);
  for (const cartId of platform.cartIds) {
    byCartId.set(cartId.toLowerCase(), platform);
  }
}

export function platformForCartId(cartId: string): PlatformDef | null {
  const exact = byCartId.get(cartId.trim().toLowerCase());
  if (exact) return exact;

  const normalized = cartId.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!normalized) return null;

  for (const platform of PLATFORMS) {
    if (platform.slug === "salesforce") {
      if (normalized.includes("salesforce") || normalized.includes("demandware")) return platform;
      continue;
    }
    const needle = platform.slug.replace(/[^a-z0-9]/g, "");
    if (normalized.includes(needle)) return platform;
  }
  return null;
}

export function platformForSlug(slug: CartSlug): PlatformDef | null {
  return bySlug.get(slug) ?? null;
}

export function slugForCartId(cartId: string): CartSlug | null {
  return platformForCartId(cartId)?.slug ?? null;
}

export function orderTimestamp(order: RawAbandonedOrder) {
  const raw = order.modified_at?.value || order.created_at?.value || "";
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function sortOrdersNewestFirst(orders: RawAbandonedOrder[]) {
  return [...orders].sort((a, b) => {
    const byTime = orderTimestamp(b) - orderTimestamp(a);
    if (byTime !== 0) return byTime;
    return Number(b.id || 0) - Number(a.id || 0);
  });
}
