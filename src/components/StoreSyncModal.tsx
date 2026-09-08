import { useEffect, useState } from "react";
import { CartPlatformPicker } from "./CartPlatformPicker";
import type { CartSlug } from "../data/cartLogos";
import type { PublicAccount } from "../types/account";
import { thanksAuthHeaders } from "../lib/thanksToken";

type StoreSyncModalProps = {
  open: boolean;
  token: string;
  currentSlug: CartSlug;
  onClose: () => void;
  onUpdated: (account: PublicAccount) => void;
};

export function StoreSyncModal({ open, token, currentSlug, onClose, onUpdated }: StoreSyncModalProps) {
  const [cart, setCart] = useState<CartSlug | "">(currentSlug);
  const [storeUrl, setStoreUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCart(currentSlug);
      setStoreUrl("");
      setError(null);
    }
  }, [open, currentSlug]);

  if (!open) return null;

  const onConnect = async () => {
    if (!cart) {
      setError("Pick a cart platform.");
      return;
    }
    if (!storeUrl.trim()) {
      setError("Enter your store URL.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...thanksAuthHeaders(token) },
        body: JSON.stringify({ cart, storeUrl })
      });
      const data = (await res.json()) as { account?: PublicAccount; oauthUrl?: string; error?: string };
      if (data.oauthUrl) {
        window.location.assign(data.oauthUrl);
        return;
      }
      if (!res.ok || !data.account) throw new Error(data.error || "Could not update store");
      onUpdated(data.account);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update store");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal card stack"
        role="dialog"
        aria-modal="true"
        aria-labelledby="store-sync-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <h2 id="store-sync-title" className="modal__title">
            Change store sync
          </h2>
          <button type="button" className="modal__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <p className="field-sub">Pick your platform and connect the store this campaign should pull abandoned carts from.</p>
        <CartPlatformPicker
          value={cart}
          onChange={(slug) => {
            setCart(slug);
            window.requestAnimationFrame(() => {
              document.getElementById("admin-store-url")?.focus();
              document.getElementById("admin-store-url")?.scrollIntoView({ behavior: "smooth", block: "center" });
            });
          }}
          disabled={busy}
        >
          <label className="label" htmlFor="admin-store-url">
            Store URL
          </label>
          <input
            id="admin-store-url"
            className="field"
            value={storeUrl}
            onChange={(e) => setStoreUrl(e.target.value)}
            placeholder="https://yourstore.com"
            inputMode="url"
            autoComplete="url"
            disabled={busy}
          />
          {error ? <p className="field-error">{error}</p> : null}
          <div className="row modal__actions">
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" disabled={busy || !storeUrl.trim()} onClick={() => void onConnect()}>
              {busy ? "Connecting…" : "Connect store"}
            </button>
          </div>
        </CartPlatformPicker>
        {!cart && error ? <p className="field-error">{error}</p> : null}
      </div>
    </div>
  );
}
