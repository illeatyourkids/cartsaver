import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { CartSlug } from "../src/data/cartLogos.ts";
import { a2cAccount, a2cStore } from "./a2cClient.ts";
import { appBase } from "./cartsave.ts";

type PendingAuth = {
  slug: CartSlug;
  storeUrl: string;
  shop: string;
  at: number;
};

const pending = new Map<string, PendingAuth>();
const TTL_MS = 15 * 60 * 1000;

/** Scopes from Api2Cart's Shopify method table for cart.info, product.*, and order.abandoned.list */
const SHOPIFY_SCOPES = [
  "read_products",
  "read_orders",
  "read_customers",
  "read_inventory",
  "read_locations",
  "read_shipping",
  "read_locales"
].join(",");

function prune() {
  const cutoff = Date.now() - TTL_MS;
  for (const [key, row] of pending) {
    if (row.at < cutoff) pending.delete(key);
  }
}

export function normalizeStoreUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    parsed.hash = "";
    parsed.search = "";
    const path = parsed.pathname.replace(/\/$/, "");
    return `${parsed.protocol}//${parsed.host}${path === "/" ? "" : path}`;
  } catch {
    return "";
  }
}

export function storeHost(storeUrl: string) {
  try {
    return new URL(normalizeStoreUrl(storeUrl) || `https://${storeUrl}`).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function remember(slug: CartSlug, storeUrl: string, shop: string) {
  prune();
  const state = randomBytes(16).toString("hex");
  pending.set(state, { slug, storeUrl, shop, at: Date.now() });
  return state;
}

export function takePending(state: string) {
  prune();
  const row = pending.get(state);
  if (!row) return null;
  pending.delete(state);
  return row;
}

function shopifyApp() {
  const clientId = process.env.SHOPIFY_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET?.trim() || "";
  return { clientId, clientSecret };
}

function shopifyShopHost(raw: string) {
  const host = storeHost(raw).toLowerCase();
  if (!host) return "";
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(host) && !host.includes(".")) return "";
  return host;
}

/**
 * Shopify Authorization Code Flow as documented by Api2Cart:
 * https://{store}/admin/oauth/authorize?client_id=&scope=&redirect_uri=&state=
 */
export function createShopifyAuthorizeUrl(storeUrl: string) {
  const { clientId } = shopifyApp();
  const shop = shopifyShopHost(storeUrl);
  if (!clientId || !shop) return null;
  const normalized = `https://${shop}`;
  const state = remember("shopify", normalized, shop);
  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", SHOPIFY_SCOPES);
  url.searchParams.set("redirect_uri", `${appBase()}/api/connect/shopify/callback`);
  url.searchParams.set("state", state);
  return url.toString();
}

/**
 * WooCommerce REST API authorization. The resulting consumer key/secret are
 * the `wc_consumer_key` / `wc_consumer_secret` params for account.cart.add
 * with cart_id=WoocommerceApi.
 */
export function createWooAuthorizeUrl(storeUrl: string) {
  const normalized = normalizeStoreUrl(storeUrl);
  const shop = storeHost(normalized);
  if (!normalized || !shop) return null;
  const state = remember("woocommerce", normalized, shop);
  const url = new URL(`${normalized}/wc-auth/v1/authorize`);
  url.searchParams.set("app_name", "Cart Mailer");
  url.searchParams.set("scope", "read");
  url.searchParams.set("user_id", state);
  url.searchParams.set(
    "return_url",
    `${appBase()}/campaign/sync?cart=woocommerce&storeUrl=${encodeURIComponent(normalized)}`
  );
  url.searchParams.set("callback_url", `${appBase()}/api/connect/woocommerce/callback`);
  return url.toString();
}

export function createAuthorizeUrl(slug: CartSlug, storeUrl: string) {
  if (slug === "woocommerce") return createWooAuthorizeUrl(storeUrl);
  if (slug === "shopify") return createShopifyAuthorizeUrl(storeUrl);
  return null;
}

function verifyShopifyHmac(query: URLSearchParams, secret: string) {
  const hmac = query.get("hmac")?.trim();
  if (!hmac || !/^[0-9a-f]+$/i.test(hmac)) return false;
  const message = [...query.entries()]
    .filter(([key]) => key !== "hmac" && key !== "signature")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const digest = createHmac("sha256", secret).update(message).digest("hex");
  const left = Buffer.from(digest, "utf8");
  const right = Buffer.from(hmac, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

async function confirmStore(storeKey: string) {
  await a2cStore("cart.info.json", storeKey);
}

export async function finishShopifyOAuth(query: URLSearchParams) {
  const { clientId, clientSecret } = shopifyApp();
  if (!clientId || !clientSecret) {
    throw new Error("Could not finish store authorization.");
  }
  if (!verifyShopifyHmac(query, clientSecret)) {
    throw new Error("Could not finish store authorization.");
  }
  const code = query.get("code")?.trim() || "";
  const state = query.get("state")?.trim() || "";
  const shopParam = shopifyShopHost(query.get("shop") || "");
  const pendingAuth = takePending(state);
  if (!pendingAuth || !code || !shopParam) {
    throw new Error("Store authorization expired. Try connecting again.");
  }
  const shop = shopParam || pendingAuth.shop;
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code
    })
  });
  const tokenJson = (await tokenRes.json().catch(() => ({}))) as { access_token?: string };
  const access = tokenJson.access_token?.trim();
  if (!access) {
    throw new Error("Could not finish store authorization.");
  }
  const storeUrl = `https://${shop}`;
  const added = await a2cAccount<{ store_key?: string }>("account.cart.add.json", {
    cart_id: "Shopify",
    store_url: storeUrl,
    shopify_access_token: access,
    shopify_client_id: clientId,
    shopify_shared_secret: clientSecret
  });
  const storeKey = added.store_key?.trim();
  if (!storeKey) {
    throw new Error("Could not connect that store.");
  }
  await confirmStore(storeKey);
  return {
    storeKey,
    storeUrl,
    cartId: "Shopify",
    cartSlug: "shopify" as const
  };
}

export async function finishWooOAuth(body: {
  user_id?: string;
  consumer_key?: string;
  consumer_secret?: string;
}) {
  const state = (body.user_id || "").trim();
  const pendingAuth = takePending(state);
  if (!pendingAuth) {
    throw new Error("Store authorization expired. Try connecting again.");
  }
  const key = body.consumer_key?.trim();
  const secret = body.consumer_secret?.trim();
  if (!key || !secret) {
    throw new Error("Could not finish store authorization.");
  }
  const added = await a2cAccount<{ store_key?: string }>("account.cart.add.json", {
    cart_id: "WoocommerceApi",
    store_url: pendingAuth.storeUrl,
    wc_consumer_key: key,
    wc_consumer_secret: secret
  });
  const storeKey = added.store_key?.trim();
  if (!storeKey) {
    throw new Error("Could not connect that store.");
  }
  await confirmStore(storeKey);
  return {
    storeKey,
    storeUrl: pendingAuth.storeUrl,
    cartId: "WoocommerceApi",
    cartSlug: "woocommerce" as const
  };
}
