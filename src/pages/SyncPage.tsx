import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCampaign } from "../context/CampaignContext";
import { CartPlatformPicker } from "../components/CartPlatformPicker";
import { cartBySlug, type CartSlug } from "../data/cartLogos";
import type { CartPayload } from "../types/cart";

export function SyncPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setStoreMeta, setPayload } = useCampaign();
  const search = new URLSearchParams(location.search);
  const [cart, setCart] = useState<CartSlug | "">((search.get("cart") as CartSlug) || "");
  const [storeUrl, setStoreUrl] = useState(search.get("storeUrl") || "");
  const [status, setStatus] = useState<string | null>(search.get("error"));
  const [busy, setBusy] = useState(false);

  const connectStore = async (slug: CartSlug, url: string) => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart: slug, storeUrl: url })
      });
      const data = (await res.json()) as {
        oauthUrl?: string;
        storeUrl?: string;
        storeKey?: string | null;
        storeName?: string;
        cartId?: string;
        carts?: CartPayload[];
        error?: string;
      };
      if (data.oauthUrl) {
        window.location.assign(data.oauthUrl);
        return;
      }
      const first = data.carts?.[0];
      if (!res.ok || !first) {
        throw new Error(data.error || "Could not sync");
      }
      setStoreMeta({
        storeUrl: data.storeUrl || url,
        storeName: data.storeName || "",
        cartSlug: slug,
        cartId: data.cartId || "",
        storeKey: data.storeKey ?? null
      });
      setPayload(first, data.storeKey ?? null);
      navigate("/campaign/settings", { replace: true });
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not sync");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const returningCart = search.get("cart") as CartSlug | null;
    const returningUrl = search.get("storeUrl") || "";
    if (!returningCart || !returningUrl || search.get("error")) return;
    void connectStore(returningCart, returningUrl);
    // Run once when returning from store authorization.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSync = () => {
    if (!cart) {
      setStatus("Pick a cart to sync.");
      return;
    }
    if (!storeUrl.trim()) {
      setStatus("Enter your store URL.");
      return;
    }
    void connectStore(cart, storeUrl);
  };

  const platformName = cart ? cartBySlug(cart)?.name : null;

  return (
    <div className="app-main wizard-page">
      <h1 className="page-title">Sync your cart</h1>
      <p className="page-lead">Pick your platform and connect the store you want to mail for.</p>
      <div className="card stack">
        <CartPlatformPicker
          value={cart}
          onChange={(slug) => {
            setCart(slug);
            window.requestAnimationFrame(() => {
              document.getElementById("store-url")?.focus();
              document.getElementById("store-url")?.scrollIntoView({ behavior: "smooth", block: "center" });
            });
          }}
          disabled={busy}
        >
          <label className="label" htmlFor="store-url">
            Store URL
          </label>
          <p className="field-sub" id="store-url-help">
            {cart === "shopify" || cart === "woocommerce"
              ? `We’ll send you to ${platformName} to authorize access.`
              : `Enter the URL of your ${platformName} store.`}
          </p>
          <input
            id="store-url"
            className="field"
            value={storeUrl}
            onChange={(e) => setStoreUrl(e.target.value)}
            placeholder="https://yourstore.com"
            inputMode="url"
            autoComplete="url"
            aria-describedby="store-url-help"
            disabled={busy}
          />
          {status ? <p className="field-error">{status}</p> : null}
          <button
            className="btn btn-primary btn-block"
            type="button"
            disabled={busy || !storeUrl.trim()}
            onClick={onSync}
          >
            {busy ? "Connecting…" : "Connect store"}
          </button>
        </CartPlatformPicker>
        {!cart && status ? <p className="field-error">{status}</p> : null}
      </div>
    </div>
  );
}
