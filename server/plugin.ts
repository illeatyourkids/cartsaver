import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { listAbandonedPayloads, listConnectedStores, pingStore, syncShoppingCart } from "./api2cart.ts";
import { appBase, cartsave, renderengineUrl } from "./cartsave.ts";
import { DEFAULT_OFFER, FIXTURE_PAYLOAD } from "./fixture.ts";
import { readJson, sendJson, sendText } from "./http.ts";
import { resolveQrImage } from "./qr.ts";
import { renderenginePng } from "./renderengine.ts";
import { getCart, markLaunched } from "./store.ts";
import type { CartSaveInput } from "../src/types/cart.ts";

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
    const body = await readJson<{ cart?: string }>(req);
    const cart = (body.cart || "").trim();
    if (!cart) {
      sendJson(res, 400, { error: "Pick a cart to sync." });
      return true;
    }
    sendJson(res, 200, await syncShoppingCart(cart));
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
    const cart = cartsave(body);
    const base = appBase();
    sendJson(res, 200, {
      cart,
      front_image_url: renderengineUrl({ base, cartid: cart.id, side: "front" }),
      back_image_url: renderengineUrl({ base, cartid: cart.id, side: "back" })
    });
    return true;
  }

  if (req.method === "POST" && pathname === "/api/launch") {
    const body = await readJson<{ cartid?: string }>(req);
    const cartid = (body.cartid || "").trim();
    const cart = cartid ? markLaunched(cartid) : null;
    if (!cart) {
      sendJson(res, 404, { error: "Save a preview first." });
      return true;
    }
    sendJson(res, 200, { live: true });
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
