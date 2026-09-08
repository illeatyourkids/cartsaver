import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { listAbandonedPayloads, listConnectedStores, pingStore, resolveShoppingCartConnection, syncShoppingCart } from "./api2cart.ts";
import { upsertAccount, listActiveAccounts, getAccountByThanksToken, updateAccountByThanksToken, toPublicAccount } from "./accounts.ts";
import { buildAccountPreview } from "./accountPreview.ts";
import { thanksTokenFromRequest } from "./auth/thanksToken.ts";
import { appBase, cartsave, renderengineUrl, validateCartSave } from "./cartsave.ts";
import { cronStatus, runAbandonedCartCron } from "./cron/runAbandonedCart.ts";
import { DEFAULT_OFFER, FIXTURE_PAYLOAD } from "./fixture.ts";
import { readBody, readJson, sendJson, sendText } from "./http.ts";
import { resolveQrImage } from "./qr.ts";
import { finishShopifyOAuth, finishWooOAuth } from "./storeOAuth.ts";
import { renderenginePng } from "./renderengine.ts";
import { getCart, markLaunched } from "./store.ts";
import { statsForAccount } from "./sends.ts";
import type { CartSaveInput } from "../src/types/cart.ts";

import type { CartSlug } from "../src/data/cartLogos.ts";

function cronAuthorized(req: IncomingMessage) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true;
  const header = req.headers.authorization || "";
  return header === `Bearer ${secret}`;
}

function urlOf(req: IncomingMessage) {
  return new URL(req.url || "/", "http://localhost");
}

async function handleApi(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = urlOf(req);
  const { pathname } = url;

  if (req.method === "GET" && pathname === "/api/health") {
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (req.method === "GET" && pathname === "/api/store/status") {
    sendJson(res, 200, await pingStore());
    return true;
  }

  if (req.method === "GET" && pathname === "/api/stores") {
    sendJson(res, 200, { stores: await listConnectedStores() });
    return true;
  }

  if (req.method === "POST" && pathname === "/api/sync") {
    const body = await readJson<{ cart?: string; storeUrl?: string }>(req);
    const cart = (body.cart || "").trim();
    if (!cart) {
      sendJson(res, 400, { error: "Pick a cart to sync." });
      return true;
    }
    const result = await syncShoppingCart(cart, body.storeUrl || "");
    if (result.oauthUrl) {
      sendJson(res, 200, { oauthUrl: result.oauthUrl, storeUrl: result.storeUrl });
      return true;
    }
    if (!result.carts.length) {
      sendJson(res, 422, {
        error: result.error || "No abandoned carts were found for this store.",
        source: result.source,
        storeUrl: result.storeUrl,
        storeName: result.storeName,
        carts: []
      });
      return true;
    }
    sendJson(res, 200, result);
    return true;
  }

  if (req.method === "GET" && pathname === "/api/connect/shopify/callback") {
    try {
      const connected = await finishShopifyOAuth(url.searchParams);
      res.statusCode = 302;
      res.setHeader(
        "Location",
        `${appBase()}/campaign/sync?cart=shopify&storeUrl=${encodeURIComponent(connected.storeUrl)}`
      );
      res.end();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not connect that store.";
      res.statusCode = 302;
      res.setHeader(
        "Location",
        `${appBase()}/campaign/sync?cart=shopify&error=${encodeURIComponent(message)}`
      );
      res.end();
    }
    return true;
  }

  if (req.method === "POST" && pathname === "/api/connect/woocommerce/callback") {
    const raw = await readBody(req);
    let payload: { user_id?: string; consumer_key?: string; consumer_secret?: string } = {};
    try {
      payload = JSON.parse(raw) as typeof payload;
    } catch {
      payload = Object.fromEntries(new URLSearchParams(raw)) as typeof payload;
    }
    try {
      await finishWooOAuth(payload);
      sendJson(res, 200, { ok: true });
    } catch (err) {
      sendJson(res, 400, { error: err instanceof Error ? err.message : "Could not connect that store." });
    }
    return true;
  }

  if (req.method === "GET" && pathname === "/api/abandoned") {
    sendJson(res, 200, await listAbandonedPayloads(url.searchParams.get("storeUrl") || ""));
    return true;
  }

  if (req.method === "GET" && pathname === "/api/qr") {
    const qrImageUrl = await resolveQrImage(
      url.searchParams.get("qr_code") || "",
      url.searchParams.get("fallback") || ""
    );
    sendJson(res, 200, { qrImageUrl });
    return true;
  }

  if (req.method === "GET" && pathname === "/api/defaults") {
    sendJson(res, 200, { offer: DEFAULT_OFFER, payload: FIXTURE_PAYLOAD });
    return true;
  }

  const cartMatch = pathname.match(/^\/api\/carts\/([^/]+)$/);
  if (req.method === "GET" && cartMatch) {
    const cart = getCart(decodeURIComponent(cartMatch[1]));
    if (!cart) {
      sendJson(res, 404, { error: "cart not found" });
      return true;
    }
    sendJson(res, 200, cart);
    return true;
  }

  const printMatch = pathname.match(/^\/api\/print\/([^/]+)$/);
  if (req.method === "GET" && printMatch) {
    const cart = getCart(decodeURIComponent(printMatch[1]));
    if (!cart) {
      sendJson(res, 404, { error: "cart not found" });
      return true;
    }
    const qr_code = url.searchParams.get("qr_code") || "";
    const qrImageUrl = await resolveQrImage(qr_code, cart.payload.basketUrl, cart.brandColor);
    sendJson(res, 200, {
      cart,
      address: url.searchParams.get("address") || "",
      qrImageUrl,
      qrHref: qr_code || cart.payload.basketUrl
    });
    return true;
  }

  if (req.method === "POST" && pathname === "/api/carts") {
    const body = await readJson<CartSaveInput>(req);
    const validationError = validateCartSave(body);
    if (validationError) {
      sendJson(res, 422, { error: validationError });
      return true;
    }
    const cart = cartsave(body);
    const base = appBase();
    sendJson(res, 200, {
      cart,
      front_image_url: renderengineUrl({ base, cartid: cart.id, side: "front" }),
      back_image_url: renderengineUrl({ base, cartid: cart.id, side: "back" })
    });
    return true;
  }

  if (req.method === "GET" && pathname === "/api/account") {
    const token = thanksTokenFromRequest(req, url);
    if (!token) {
      sendJson(res, 401, { error: "thanksToken is required." });
      return true;
    }
    const account = getAccountByThanksToken(token);
    if (!account) {
      sendJson(res, 404, { error: "Campaign not set up yet." });
      return true;
    }
    sendJson(res, 200, {
      account: toPublicAccount(account),
      stats: statsForAccount(account.id)
    });
    return true;
  }

  if (req.method === "PATCH" && pathname === "/api/account") {
    const token = thanksTokenFromRequest(req, url);
    if (!token) {
      sendJson(res, 401, { error: "thanksToken is required." });
      return true;
    }
    const body = await readJson<{
      active?: boolean;
      title?: string;
      couponcode?: string;
      discount?: number;
      minimum?: number;
      maxdiscount?: number;
      logourl?: string;
      brandColor?: string;
    }>(req);
    const updated = updateAccountByThanksToken(token, body);
    if (!updated) {
      sendJson(res, 404, { error: "Campaign not set up yet." });
      return true;
    }
    sendJson(res, 200, {
      account: toPublicAccount(updated),
      stats: statsForAccount(updated.id)
    });
    return true;
  }

  if (req.method === "POST" && pathname === "/api/account/sync") {
    const token = thanksTokenFromRequest(req, url);
    if (!token) {
      sendJson(res, 401, { error: "thanksToken is required." });
      return true;
    }
    const existing = getAccountByThanksToken(token);
    if (!existing) {
      sendJson(res, 404, { error: "Campaign not set up yet." });
      return true;
    }
    const body = await readJson<{ cart?: string; storeUrl?: string }>(req);
    const cart = (body.cart || "").trim();
    if (!cart) {
      sendJson(res, 400, { error: "Pick a cart to sync." });
      return true;
    }
    const connection = await resolveShoppingCartConnection(cart, body.storeUrl || existing.storeUrl);
    if (connection.oauthUrl) {
      sendJson(res, 200, { oauthUrl: connection.oauthUrl });
      return true;
    }
    if (!connection.storeKey) {
      sendJson(res, 422, { error: connection.error || "Could not connect that store." });
      return true;
    }
    const updated = updateAccountByThanksToken(token, {
      storeKey: connection.storeKey,
      cartSlug: connection.cartSlug,
      cartId: connection.cartId,
      storeUrl: connection.storeUrl,
      storeName: connection.storeName
    });
    if (!updated) {
      sendJson(res, 404, { error: "Campaign not set up yet." });
      return true;
    }
    sendJson(res, 200, {
      account: toPublicAccount(updated),
      stats: statsForAccount(updated.id)
    });
    return true;
  }

  if (req.method === "POST" && pathname === "/api/account/preview") {
    const token = thanksTokenFromRequest(req, url);
    if (!token) {
      sendJson(res, 401, { error: "thanksToken is required." });
      return true;
    }
    const account = getAccountByThanksToken(token);
    if (!account) {
      sendJson(res, 404, { error: "Campaign not set up yet." });
      return true;
    }
    const body = await readJson<{
      title?: string;
      couponcode?: string;
      discount?: number;
      minimum?: number;
      maxdiscount?: number;
      logourl?: string;
      brandColor?: string;
    }>(req);
    const preview = await buildAccountPreview(account, {
      title: body.title ?? account.title,
      couponcode: body.couponcode ?? account.couponcode,
      discount: body.discount ?? account.discount,
      minimum: body.minimum ?? account.minimum,
      maxdiscount: body.maxdiscount ?? account.maxdiscount,
      logourl: body.logourl ?? account.logourl,
      brandColor: body.brandColor ?? account.brandColor
    });
    sendJson(res, 200, preview);
    return true;
  }

  if (req.method === "GET" && pathname === "/api/cron/status") {
    sendJson(res, 200, {
      ...cronStatus(),
      accounts: listActiveAccounts().map((a) => ({
        id: a.id,
        storeName: a.storeName,
        storeUrl: a.storeUrl,
        cartSlug: a.cartSlug,
        active: a.active,
        lastCronAt: a.lastCronAt
      }))
    });
    return true;
  }

  if (req.method === "POST" && pathname === "/api/cron/run") {
    if (!cronAuthorized(req)) {
      sendJson(res, 401, { error: "Unauthorized" });
      return true;
    }
    const body = (await readJson<{ accountId?: string }>(req).catch(() => ({}))) as {
      accountId?: string;
    };
    sendJson(res, 200, await runAbandonedCartCron({ accountId: body.accountId?.trim() || undefined }));
    return true;
  }

  if (req.method === "POST" && pathname === "/api/launch") {
    const body = await readJson<{
      cartid?: string;
      thanksToken?: string;
      storeUrl?: string;
      storeName?: string;
      cartSlug?: string;
      cartId?: string;
    }>(req);
    const cartid = (body.cartid || "").trim();
    const cart = cartid ? getCart(cartid) : null;
    if (!cart) {
      sendJson(res, 404, { error: "Save a preview first." });
      return true;
    }
    const validationError = validateCartSave({
      title: cart.title,
      couponcode: cart.couponcode,
      discount: cart.discount,
      minimum: cart.minimum,
      maxdiscount: cart.maxdiscount,
      logourl: cart.logourl,
      brandColor: cart.brandColor,
      payload: cart.payload,
      storeKey: cart.storeKey
    });
    if (validationError) {
      sendJson(res, 422, { error: validationError });
      return true;
    }

    const thanksToken = (body.thanksToken || process.env.THANKS_DEFAULT_USER_TOKEN || "").trim();
    const storeKey = cart.storeKey?.trim();
    const storeUrl = (body.storeUrl || "").trim();
    const cartSlug = (body.cartSlug || "").trim() as CartSlug;
    const cartId = (body.cartId || "").trim();

    if (!thanksToken) {
      sendJson(res, 422, { error: "A thanks.io user token is required to turn on abandoned cart mail." });
      return true;
    }
    if (!storeKey || !storeUrl || !cartSlug || !cartId) {
      sendJson(res, 422, { error: "Store connection details are missing. Sync your cart again." });
      return true;
    }

    const live = markLaunched(cartid);
    if (!live) {
      sendJson(res, 404, { error: "Save a preview first." });
      return true;
    }

    const account = upsertAccount({
      thanksToken,
      storeKey,
      cartSlug,
      cartId,
      storeUrl,
      storeName: (body.storeName || storeUrl).trim(),
      templateCartId: cartid,
      title: cart.title,
      couponcode: cart.couponcode,
      discount: cart.discount,
      minimum: cart.minimum,
      maxdiscount: cart.maxdiscount,
      logourl: cart.logourl,
      brandColor: cart.brandColor,
      active: true
    });

    sendJson(res, 200, { live: true, accountId: account.id });
    return true;
  }

  if (req.method === "GET" && pathname === "/renderengine") {
    const cartid = url.searchParams.get("cartid") || "";
    const side = url.searchParams.get("side") === "back" ? "back" : "front";
    const address = url.searchParams.get("address") || "";
    const qr_code = url.searchParams.get("qr_code") || "";
    if (!cartid) {
      sendText(res, 400, "cartid is required");
      return true;
    }
    if (!getCart(cartid)) {
      sendText(res, 404, "cart not found");
      return true;
    }
    try {
      const png = await renderenginePng({
        appBase: appBase(),
        cartid,
        side,
        address,
        qr_code
      });
      res.statusCode = 200;
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=120");
      res.end(png);
    } catch (e) {
      sendText(res, 500, e instanceof Error ? e.message : "render failed");
    }
    return true;
  }

  return false;
}

export function cartApiPlugin(): Plugin {
  return {
    name: "cartsave-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const handled = await handleApi(req, res);
          if (!handled) next();
        } catch (e) {
          if (!res.headersSent) {
            sendJson(res, 500, { error: e instanceof Error ? e.message : "server error" });
          }
        }
      });
    }
  };
}
