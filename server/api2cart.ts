import type { CartItem, CartPayload } from "../src/types/cart.ts";
import { cartBySlug, type CartSlug } from "../src/data/cartLogos.ts";
import { A2CError, a2cAccount, a2cStore, isA2CConfigured } from "./a2cClient.ts";
import {
  platformForCartId,
  platformForSlug,
  slugForCartId,
  sortOrdersNewestFirst,
  type PlatformDef,
  type RawAbandonedOrder
} from "./platforms.ts";
import { createAuthorizeUrl, normalizeStoreUrl, storeHost } from "./storeOAuth.ts";

type AccountCart = {
  id?: string;
  store_key?: string;
  cart_id?: string;
  url?: string;
  store_url?: string;
  store_name?: string;
  custom_label?: string | null;
};

export type ConnectedStore = {
  storeKey: string;
  cartId: string;
  slug: CartSlug | null;
  url: string;
  name: string;
  label: string;
};

export type StoreCartPull = {
  source: "api2cart" | "none";
  storeKey: string | null;
  carts: CartPayload[];
  error?: string;
  oauthUrl?: string;
};

export type AbandonedCartCandidate = {
  orderId: string;
  abandonedAt: string;
  payload: CartPayload;
};

function money(n: number) {
  return Math.round(n * 100) / 100;
}

function storeUrlDisplay(url: string) {
  try {
    const parsed = new URL(url.includes("://") ? url : `https://${url}`);
    const host = parsed.hostname.replace(/^www\./, "");
    const path = parsed.pathname.replace(/\/$/, "");
    return path && path !== "/" ? `${host}${path}` : host;
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}

export function isDemoApi2CartStore(url: string) {
  try {
    return new URL(url.includes("://") ? url : `https://${url}`).hostname.toLowerCase() === "demo.api2cart.com";
  } catch {
    return /demo\.api2cart\.com/i.test(url);
  }
}

function storeUrlOf(account: AccountCart) {
  return (account.url || account.store_url || "").replace(/\/$/, "");
}

function storeNameOf(account: AccountCart, url: string) {
  const custom = account.store_name?.trim() || account.custom_label?.trim();
  if (custom) return custom;

  const slug = slugForCartId(account.cart_id || "");
  const platformName = slug ? cartBySlug(slug)?.name : null;
  const urlLabel = url ? storeUrlDisplay(url) : "";

  if (platformName && urlLabel) return `${platformName} (${urlLabel})`;
  if (urlLabel) return urlLabel;
  return "Store";
}

function storeLabelOf(account: AccountCart, url: string) {
  const slug = slugForCartId(account.cart_id || "");
  const platformName = slug ? cartBySlug(slug)?.name : null;
  const custom = account.store_name?.trim() || account.custom_label?.trim();
  if (custom) return custom;
  if (platformName && url) return `${platformName} (${storeUrlDisplay(url)})`;
  return storeNameOf(account, url);
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), ms);
    })
  ]);
}

async function listAccountCarts(): Promise<AccountCart[]> {
  if (!isA2CConfigured()) return [];
  try {
    const result = await a2cAccount<{ carts?: AccountCart[]; carts_count?: number }>(
      "account.cart.list.json"
    );
    return result.carts ?? [];
  } catch {
    return [];
  }
}

export { slugForCartId } from "./platforms.ts";

export async function listConnectedStores(): Promise<ConnectedStore[]> {
  return listConnectedStoresFromAccounts(await listAccountCarts());
}

function listConnectedStoresFromAccounts(accounts: AccountCart[]): ConnectedStore[] {
  return accounts
    .map((account) => {
      const url = storeUrlOf(account);
      const storeKey = account.store_key || "";
      const cartId = account.cart_id || "";
      if (!url || !storeKey || isDemoApi2CartStore(url)) return null;
      return {
        storeKey,
        cartId,
        slug: slugForCartId(cartId),
        url,
        name: storeNameOf(account, url),
        label: storeLabelOf(account, url)
      } satisfies ConnectedStore;
    })
    .filter((store): store is ConnectedStore => Boolean(store));
}

function urlsMatch(a: string, b: string) {
  const left = normalizeStoreUrl(a).toLowerCase();
  const right = normalizeStoreUrl(b).toLowerCase();
  if (!left || !right) return false;
  if (left === right) return true;
  const hostA = storeHost(left);
  const hostB = storeHost(right);
  return Boolean(hostA && hostA === hostB);
}

function findAccountForStore(accounts: AccountCart[], slug: CartSlug, storeUrl: string): AccountCart | null {
  const matches = accounts.filter(
    (account) =>
      slugForCartId(account.cart_id || "") === slug && !isDemoApi2CartStore(storeUrlOf(account))
  );
  if (!storeUrl) return null;
  return (
    matches.find((account) => urlsMatch(storeUrlOf(account), storeUrl)) ||
    matches.find((account) => storeHost(storeUrlOf(account)) === storeHost(storeUrl)) ||
    null
  );
}

function bridgeCartId(platform: PlatformDef) {
  return platform.cartIds.find((id) => !/Api$/i.test(id)) || platform.cartIds[0];
}

async function addStoreViaBridge(platform: PlatformDef, storeUrl: string) {
  const cartId = bridgeCartId(platform);
  const bridge = await a2cAccount<{ store_key?: string; bridge?: string }>("cart.bridge.json");
  const storeKey = bridge.store_key?.trim();
  if (!storeKey) {
    throw new A2CError(-1, "Could not start store authorization.");
  }
  const added = await a2cAccount<{ store_key?: string }>("account.cart.add.json", {
    cart_id: cartId,
    store_url: storeUrl,
    store_key: storeKey
  });
  const connectedKey = added.store_key?.trim() || storeKey;
  await a2cStore("cart.info.json", connectedKey);
  return { storeKey: connectedKey, cartId };
}

type ConnectionResult = {
  storeKey: string | null;
  storeUrl: string;
  storeName: string;
  cartId: string;
  cartSlug: CartSlug;
  oauthUrl?: string;
  error?: string;
};

async function connectMerchantStore(cartSlug: string, storeUrlRaw: string): Promise<ConnectionResult> {
  const slug = cartSlug.trim().toLowerCase() as CartSlug;
  const platform = platformForSlug(slug);
  const storeUrl = normalizeStoreUrl(storeUrlRaw);
  if (!platform) {
    return {
      storeKey: null,
      storeUrl,
      storeName: "",
      cartId: "",
      cartSlug: slug,
      error: "Pick a cart platform."
    };
  }
  if (!storeUrl) {
    return {
      storeKey: null,
      storeUrl: "",
      storeName: "",
      cartId: "",
      cartSlug: slug,
      error: "Enter your store URL."
    };
  }

  const accounts = await withTimeout(listAccountCarts(), 2500, []);
  const match = findAccountForStore(accounts, slug, storeUrl);
  if (match?.store_key) {
    const url = storeUrlOf(match) || storeUrl;
    return {
      storeKey: match.store_key,
      storeUrl: url,
      storeName: storeNameOf(match, url),
      cartId: match.cart_id || "",
      cartSlug: slug
    };
  }

  const oauthUrl = createAuthorizeUrl(slug, storeUrl);
  if (oauthUrl) {
    return {
      storeKey: null,
      storeUrl,
      storeName: storeHost(storeUrl) || storeUrl,
      cartId: "",
      cartSlug: slug,
      oauthUrl
    };
  }

  if (slug === "shopify" || slug === "woocommerce") {
    return {
      storeKey: null,
      storeUrl,
      storeName: "",
      cartId: "",
      cartSlug: slug,
      error: "Could not start store authorization."
    };
  }

  try {
    const added = await addStoreViaBridge(platform, storeUrl);
    return {
      storeKey: added.storeKey,
      storeUrl,
      storeName: storeNameOf({ cart_id: added.cartId }, storeUrl),
      cartId: added.cartId,
      cartSlug: slug
    };
  } catch {
    return {
      storeKey: null,
      storeUrl,
      storeName: "",
      cartId: "",
      cartSlug: slug,
      error: "Could not connect that store."
    };
  }
}

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

async function productImage(storeKey: string, productId: string): Promise<string> {
  if (!productId) return "/placeholder-item.svg";
  try {
    const result = await a2cStore<{ images?: Array<{ http_path?: string; type?: string }> }>(
      "product.info.json",
      storeKey,
      { id: productId, params: "images" }
    );
    return pickImage(result.images) || "/placeholder-item.svg";
  } catch {
    return "/placeholder-item.svg";
  }
}

async function listCatalogProducts(storeKey: string): Promise<CartItem[]> {
  try {
    const result = await a2cStore<{
      product?: Array<{
        id?: string;
        name?: string;
        price?: number;
        images?: Array<{ http_path?: string; url?: string; type?: string }>;
      }>;
    }>("product.list.json", storeKey, {
      count: "20",
      params: "id,name,price,images"
    });

    const products = result.product ?? [];
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
        price: money(Number(p.price || 0))
      });
      if (items.length >= 3) break;
    }
    return items;
  } catch {
    return [];
  }
}

function orderDiscount(order: RawAbandonedOrder) {
  const listed = Number(order.totals?.discount || 0);
  const onItems = (order.order_products ?? []).reduce(
    (sum, p) => sum + Number(p.discount_amount || 0),
    0
  );
  return Math.max(listed, onItems);
}

async function mapOrderToPayload(
  order: RawAbandonedOrder,
  storeKey: string,
  storeUrl: string,
  platform: PlatformDef,
  imageFallback: CartItem[]
): Promise<CartPayload | null> {
  const products = order.order_products ?? [];
  if (!products.length) return null;

  const existingDiscount = money(orderDiscount(order));
  const subtotal = platform.orderSubtotal(order);
  const lineItems = products.slice(0, 3);

  const imageUrls = await Promise.all(
    lineItems.map((p) => productImage(storeKey, p.product_id || ""))
  );

  const items: CartItem[] = lineItems.map((p, index) => {
    const imageUrl = imageUrls[index] || "/placeholder-item.svg";
    return {
      name: p.name || "Item",
      imageUrl: isRealImage(imageUrl) ? imageUrl : imageFallback[index]?.imageUrl || imageUrl,
      quantity: p.quantity || 1,
      price: platform.linePrice(p, order)
    };
  });

  if (!items.length) return null;

  const first = order.customer?.first_name || "";
  const last = order.customer?.last_name || "";
  const abandonedAt = order.modified_at?.value || order.created_at?.value || new Date().toISOString();
  return {
    customerName: `${first} ${last}`.trim() || "Customer",
    email: order.customer?.email || "",
    basketUrl: platform.basketUrl(storeUrl, order),
    items,
    subtotal,
    itemCount: products.reduce((n, p) => n + (p.quantity || 1), 0) || items.length,
    existingDiscount: existingDiscount || undefined,
    abandonedOrderId: order.id ? String(order.id) : undefined,
    abandonedAt
  };
}

export async function listAbandonedCartsForStore(
  storeKey: string,
  storeUrl: string,
  platform: PlatformDef
): Promise<{ candidates: AbandonedCartCandidate[]; error?: string }> {
  if (!isA2CConfigured()) {
    return { candidates: [], error: "Store sync is not configured." };
  }

  let orders: RawAbandonedOrder[] = [];
  try {
    const result = await a2cStore<{ order?: RawAbandonedOrder[] }>("order.abandoned.list.json", storeKey, {
      count: "50",
      params: "force_all"
    });
    orders = sortOrdersNewestFirst(result.order ?? []);
  } catch (err) {
    return {
      candidates: [],
      error: err instanceof A2CError ? err.message : "Could not load abandoned carts."
    };
  }

  if (!orders.length) return { candidates: [] };

  const imageFallback = await listCatalogProducts(storeKey);
  const candidates: AbandonedCartCandidate[] = [];

  for (const order of orders) {
    const payload = await mapOrderToPayload(order, storeKey, storeUrl, platform, imageFallback);
    if (!payload?.abandonedOrderId) continue;
    candidates.push({
      orderId: payload.abandonedOrderId,
      abandonedAt: payload.abandonedAt || new Date().toISOString(),
      payload
    });
  }

  return { candidates };
}

async function newestAbandonedCart(
  storeKey: string,
  storeUrl: string,
  platform: PlatformDef
): Promise<StoreCartPull> {
  const { candidates, error } = await listAbandonedCartsForStore(storeKey, storeUrl, platform);
  if (error && !candidates.length) {
    return { source: "none", storeKey, carts: [], error };
  }
  if (!candidates.length) {
    return {
      source: "none",
      storeKey,
      carts: [],
      error: error || "No abandoned carts were found for this store."
    };
  }
  return { source: "api2cart", storeKey, carts: [candidates[0].payload] };
}

export async function syncShoppingCart(
  cartSlug: string,
  storeUrlRaw = ""
): Promise<
  StoreCartPull & {
    storeUrl: string;
    storeName: string;
    cartId: string;
  }
> {
  const connection = await connectMerchantStore(cartSlug, storeUrlRaw);
  if (connection.oauthUrl) {
    return {
      source: "none",
      storeKey: null,
      storeUrl: connection.storeUrl,
      storeName: connection.storeName,
      cartId: "",
      carts: [],
      oauthUrl: connection.oauthUrl
    };
  }
  if (!connection.storeKey) {
    return {
      source: "none",
      storeKey: null,
      storeUrl: connection.storeUrl,
      storeName: connection.storeName,
      cartId: "",
      carts: [],
      error: connection.error || "Could not connect that store."
    };
  }

  const platform = platformForCartId(connection.cartId) || platformForSlug(connection.cartSlug);
  if (!platform) {
    return {
      source: "none",
      storeKey: connection.storeKey,
      storeUrl: connection.storeUrl,
      storeName: connection.storeName,
      cartId: connection.cartId,
      carts: [],
      error: "That cart platform isn't supported yet."
    };
  }

  const pulled = await newestAbandonedCart(connection.storeKey, connection.storeUrl, platform);
  return {
    ...pulled,
    storeUrl: connection.storeUrl,
    storeName: connection.storeName,
    cartId: connection.cartId
  };
}

export async function resolveShoppingCartConnection(
  cartSlug: string,
  storeUrlRaw = ""
): Promise<{
  storeKey: string | null;
  storeUrl: string;
  storeName: string;
  cartId: string;
  cartSlug: CartSlug;
  oauthUrl?: string;
  error?: string;
}> {
  return connectMerchantStore(cartSlug, storeUrlRaw);
}

export async function listAbandonedPayloads(storeUrl = "") {
  const accounts = await listAccountCarts();
  const want = storeUrl.replace(/\/$/, "").toLowerCase();

  const match = want
    ? accounts.find((c) => storeUrlOf(c).toLowerCase() === want) ||
      accounts.find((c) => storeUrlOf(c).toLowerCase().includes(want))
    : accounts[0];

  if (!match?.store_key) {
    return {
      source: "none" as const,
      storeKey: null,
      carts: [] as CartPayload[],
      error: want ? "No connected store matched that URL." : "No connected stores found."
    };
  }

  const url = storeUrlOf(match) || storeUrl.replace(/\/$/, "");
  const platform = platformForCartId(match.cart_id || "");
  if (!platform) {
    return {
      source: "none" as const,
      storeKey: match.store_key,
      carts: [] as CartPayload[],
      error: "Connected store uses an unsupported cart platform."
    };
  }

  return newestAbandonedCart(match.store_key, url, platform);
}

export async function pingStore() {
  const configured = isA2CConfigured();
  let stores: ConnectedStore[] = [];
  let error: string | undefined;

  if (configured) {
    try {
      stores = await listConnectedStores();
    } catch (err) {
      error = err instanceof A2CError ? err.message : "Could not list connected stores.";
    }
  }

  return { configured, stores, error };
}
