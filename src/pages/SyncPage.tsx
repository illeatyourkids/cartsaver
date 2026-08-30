import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCampaign } from "../context/CampaignContext";
import { cartLogoSrc, SUPPORTED_CARTS, type CartSlug } from "../data/cartLogos";
import type { CartPayload } from "../types/cart";

export function SyncPage() {
  const navigate = useNavigate();
  const { setStoreUrl, setPayload } = useCampaign();
  const [cart, setCart] = useState<CartSlug | "">("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSync = async () => {
    if (!cart) {
      setStatus("Pick a cart to sync.");
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart })
      });
      const data = (await res.json()) as {
        storeUrl?: string;
        storeKey?: string | null;
        carts?: CartPayload[];
        error?: string;
      };
      const first = data.carts?.[0];
      if (!res.ok || !first) throw new Error(data.error || "Could not sync");
      setStoreUrl(data.storeUrl || "");
      setPayload(first, data.storeKey ?? null);
      navigate("/campaign/settings");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not sync");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-main">
      <h1 className="page-title">Sync your cart</h1>
      <p className="page-lead">Hook up the store. We’ll take it from there.</p>
      <div className="card stack">
        <ul className="cart-pick" role="listbox" aria-label="Shopping cart">
          {SUPPORTED_CARTS.map((item) => {
            const selected = cart === item.slug;
            return (
              <li key={item.slug}>
                <button
                  type="button"
                  className={`cart-pick__btn${selected ? " selected" : ""}`}
                  role="option"
                  aria-selected={selected}
                  onClick={() => setCart(item.slug)}
                >
                  <img src={cartLogoSrc(item.file)} alt="" width={24} height={24} />
                  <span>{item.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {status ? <p className="field-error">{status}</p> : null}
        <button className="btn btn-primary btn-block" type="button" disabled={busy} onClick={() => void onSync()}>
          {busy ? "Syncing…" : "Sync"}
        </button>
      </div>
    </div>
  );
}
