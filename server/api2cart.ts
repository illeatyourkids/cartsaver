import { DEFAULT_OFFER, FIXTURE_PAYLOAD } from "./fixture.ts";
import { shouldMailCart } from "./cartsave.ts";
import type { CartItem, CartPayload } from "../src/types/cart.ts";

const API = "https://api.api2cart.com/v1.1";

type RawProduct = {
  product_id?: string;
  name?: string;
  price?: number;
  quantity?: number;
  total_price?: number;
  discount_amount?: number;
};

type RawOrder = {
  id?: string;
  basket_id?: string;
  basket_url?: string;
  customer?: { first_name?: string; last_name?: string; email?: string; id?: string };
  totals?: { total?: number; subtotal?: number; shipping?: number; tax?: number; discount?: number };
  order_products?: RawProduct[];
};

type AccountCart = {
  store_key?: string;
  cart_id?: string;
  url?: string;
  store_url?: string;
  store_name?: string;
};

function apiKey() {
  return process.env.API2CART_API_KEY?.trim() || "";
}

function hostLabel(url: string) {
  try {
    return new URL(url.includes("://") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}

function cartSlugMatches(cartId: string, slug: string) {
  const a = cartId.toLowerCase().replace(/[^a-z0-9]/g, "");
  const b = slug.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!a || !b) return false;
  if (b === "salesforce") return a.includes("salesforce") || a.includes("demandware");
  if (b === "cscart") return a.includes("cscart") || a.includes("cscart");
  return a.includes(b) || b.includes(a);
}

async function a2c(
  method: string,
  storeKey: string,
  extra: Record<string, string> = {}
): Promise<Record<string, unknown> | null> {
  const key = apiKey();
  if (!key || !storeKey) return null;
  const u = new URL(`${API}/${method}`);
  u.searchParams.set("api_key", key);
  u.searchParams.set("store_key", storeKey);
  for (const [k, v] of Object.entries(extra)) u.searchParams.set(k, v);
  const res = await fetch(u);
  return (await res.json()) as Record<string, unknown>;
}

async function listAccountCarts(): Promise<AccountCart[]> {
  const key = apiKey();
  if (!key) return [];
  const u = new URL(`${API}/account.cart.list.json`);
  u.searchParams.set("api_key", key);
  try {
    const res = await fetch(u);
    const json = (await res.json()) as { result?: { carts?: AccountCart[] } };
    return json.result?.carts ?? [];
  } catch {
    return [];
  }
}

export async function listConnectedStores(): Promise<{ url: string; name: string; cartId: string }[]> {
  return (await listAccountCarts())
    .map((c) => {
      const url = (c.url || c.store_url || "").replace(/\/$/, "");
      return {
        url,
        name: c.store_name || hostLabel(url),
        cartId: c.cart_id || ""
      };
    })
    .filter((c) => c.url);
}

type CatalogProduct = {
  id?: string;
  name?: string;
  price?: number;
  images?: Array<{ http_path?: string; url?: string; type?: string }>;
};

function pickImage(
  images?: Array<{ http_path?: string; url?: string; src?: string; type?: string }>
) {
  if (!images?.length) return "";
  const preferred =
    images.find((i) => /BASE|IMAGE_TYPE_BASE|main/i.test(i.type || "")) ||
    images.find((i) => /THUMB|SMALL/i.test(i.type || "")) ||
    images[0];
  return preferred?.http_path || preferred?.url || preferred?.src || "";
}

function isRealImage(url: string) {
  return Boolean(url) && !/placeholder/i.test(url);
}

async function fetchJson(url: string, ms = 5000): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(ms)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function shopifyStorefrontProducts(storeUrl: string): Promise<CartItem[]> {
  const json = (await fetchJson(`${storeUrl}/products.json?limit=8`)) as {
    products?: Array<{
      title?: string;
      images?: Array<{ src?: string }>;
      image?: { src?: string };
      variants?: Array<{ price?: string }>;
    }>;
  } | null;
  if (!json?.products?.length) return [];
  return json.products
    .map((p) => ({
      name: p.title || "Item",
      imageUrl: p.images?.[0]?.src || p.image?.src || "",
      quantity: 1,
      price: Number(p.variants?.[0]?.price || 0)
    }))
    .filter((i) => isRealImage(i.imageUrl))
    .slice(0, 3);
}

async function wooStorefrontProducts(storeUrl: string): Promise<CartItem[]> {
  const json = (await fetchJson(`${storeUrl}/wp-json/wc/store/v1/products?per_page=8`)) as Array<{
    name?: string;
    images?: Array<{ src?: string }>;
    prices?: { price?: string; raw_prices?: { price?: number } };
  }> | null;
  if (!Array.isArray(json) || !json.length) return [];
  return json
    .map((p) => {
      const cents = Number(p.prices?.raw_prices?.price ?? p.prices?.price ?? 0);
      const price = cents > 1000 ? cents / 100 : cents;
      return {
        name: p.name || "Item",
        imageUrl: p.images?.[0]?.src || "",
        quantity: 1,
        price
      };
    })
    .filter((i) => isRealImage(i.imageUrl))
    .slice(0, 3);
}

async function storefrontProducts(storeUrl: string): Promise<CartItem[]> {
  const base = storeUrl.replace(/\/$/, "");
  if (!base) return [];
  const shopify = await shopifyStorefrontProducts(base);
  if (shopify.length) return shopify;
  return wooStorefrontProducts(base);
}

async function productImage(storeKey: string, productId: string): Promise<string> {
  if (!productId) return "/placeholder-item.svg";
  const json = (await a2c("product.info.json", storeKey, {
    id: productId,
    params: "images"
  })) as { result?: { images?: Array<{ http_path?: string; type?: string }> } } | null;
  return pickImage(json?.result?.images) || "/placeholder-item.svg";
}

async function listCatalogProducts(storeKey: string): Promise<CartItem[]> {
  const json = (await a2c("product.list.json", storeKey, {
    count: "20",
    params: "id,name,price,images"
  })) as { result?: { product?: CatalogProduct[] } } | null;
  const products = json?.result?.product ?? [];
  const items: CartItem[] = [];
  for (const p of products) {
    let imageUrl = pickImage(p.images);
    if (!isRealImage(imageUrl) && p.id) {
      imageUrl = await productImage(storeKey, String(p.id));
    }
    if (!isRealImage(imageUrl)) continue;
    items.push({
      name: p.name || "Item",
      imageUrl,
      quantity: 1,
      price: Number(p.price || 0)
    });
    if (items.length >= 3) break;
  }
  return items;
}

async function loadShopProducts(storeKey: string | null, storeUrl: string): Promise<CartItem[]> {
  if (storeKey) {
    const catalog = await listCatalogProducts(storeKey);
    if (catalog.length) return catalog;
  }
  return storefrontProducts(storeUrl);
}

function payloadFromItems(items: CartItem[], storeUrl: string): CartPayload {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartPath = storeUrl ? `${storeUrl.replace(/\/$/, "")}/cart` : FIXTURE_PAYLOAD.basketUrl;
  return {
    customerName: "Customer",
    email: "",
    basketUrl: cartPath,
    items: items.slice(0, 3),
    subtotal,
    itemCount: items.length
  };
}

function orderDiscount(order: RawOrder) {
  const listed = Number(order.totals?.discount || 0);
  const onItems = (order.order_products ?? []).reduce(
    (sum, p) => sum + Number(p.discount_amount || 0),
    0
  );
  return Math.max(listed, onItems);
}

async function previewCartsForStore(storeKey: string | null, storeUrl: string): Promise<{
  source: "api2cart" | "fixture";
  storeKey: string | null;
  carts: CartPayload[];
}> {
  const shopItems = await loadShopProducts(storeKey, storeUrl);

  if (storeKey) {
    const raw = (await a2c("order.abandoned.list.json", storeKey, {
      count: "10",
      params: "force_all"
    })) as {
      return_code?: number;
      result?: { order?: RawOrder[] };
    } | null;
    const orders = raw?.result?.order;
    if (orders?.length) {
      const carts: CartPayload[] = [];
      for (const order of orders) {
        const existingDiscount = Math.round(orderDiscount(order) * 100) / 100;
        const subtotal = Number(order.totals?.subtotal || order.totals?.total || 0);
        if (
          !shouldMailCart({
            payload: { subtotal, existingDiscount },
            minimum: DEFAULT_OFFER.minimum,
            maxdiscount: DEFAULT_OFFER.maxdiscount
          })
        ) {
          continue;
        }
        const products = order.order_products ?? [];
        const items: CartItem[] = [];
        for (const p of products.slice(0, 3)) {
          const imageUrl = await productImage(storeKey, p.product_id || "");
          items.push({
            name: p.name || "Item",
            imageUrl: isRealImage(imageUrl) ? imageUrl : shopItems[items.length]?.imageUrl || imageUrl,
            quantity: p.quantity || 1,
            price: Number(p.price || p.total_price || 0)
          });
        }
        if (!items.length && shopItems.length) items.push(...shopItems.slice(0, 3));
        const first = order.customer?.first_name || "";
        const last = order.customer?.last_name || "";
        carts.push({
          customerName: `${first} ${last}`.trim() || "Customer",
          email: order.customer?.email || "",
          basketUrl: order.basket_url || (storeUrl ? `${storeUrl}/cart` : ""),
          items,
          subtotal,
          itemCount: products.reduce((n, p) => n + (p.quantity || 1), 0) || items.length,
          existingDiscount: existingDiscount || undefined
        });
      }
      if (carts.length) return { source: "api2cart", storeKey, carts };
    }
  }

  if (shopItems.length) {
    return { source: "api2cart", storeKey, carts: [payloadFromItems(shopItems, storeUrl)] };
  }

  return { source: "fixture", storeKey, carts: [FIXTURE_PAYLOAD] };
}

export async function syncShoppingCart(cartSlug: string): Promise<{
  source: "api2cart" | "fixture";
  storeKey: string | null;
  storeUrl: string;
  storeName: string;
  carts: CartPayload[];
}> {
  const accounts = await listAccountCarts();
  const slug = cartSlug.trim().toLowerCase();
  const match =
    accounts.find((c) => cartSlugMatches(c.cart_id || "", slug)) || accounts[0];
  const storeUrl = (match?.url || match?.store_url || "").replace(/\/$/, "");
  const storeName = match?.store_name || (storeUrl ? hostLabel(storeUrl) : "");
  const pulled = await previewCartsForStore(match?.store_key || null, storeUrl);
  return {
    ...pulled,
    storeUrl,
    storeName
  };
}

export async function listAbandonedPayloads(storeUrl = "") {
  const accounts = await listAccountCarts();
  const want = storeUrl.replace(/\/$/, "").toLowerCase();
  const match = want
    ? accounts.find((c) => (c.url || c.store_url || "").replace(/\/$/, "").toLowerCase() === want) ||
      accounts.find((c) => (c.url || c.store_url || "").toLowerCase().includes(want))
    : accounts[0];
  const url = (match?.url || match?.store_url || storeUrl || "").replace(/\/$/, "");
  return previewCartsForStore(match?.store_key || null, url);
}

export async function pingStore() {
  return {
    configured: Boolean(apiKey()),
    stores: await listConnectedStores()
  };
}
