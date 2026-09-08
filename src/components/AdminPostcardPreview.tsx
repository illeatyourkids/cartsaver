import { useEffect, useState } from "react";
import { CartBack } from "../templates/CartBack";
import { CartFront } from "../templates/CartFront";
import type { OfferFields } from "../types/cart";
import type { PostcardView } from "../types/cart";
import type { PublicAccount } from "../types/account";
import { thanksAuthHeaders } from "../lib/thanksToken";

type PreviewSample = {
  source: "recent" | "fixture";
  customerName: string;
  email: string;
  abandonedAt: string | null;
  itemCount: number;
  subtotal: number;
};

type AdminPostcardPreviewProps = {
  token: string;
  account: PublicAccount;
  offer: OfferFields;
  refreshKey?: string | number;
};

function formatMoney(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatAbandonedAt(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "abandoned recently";
  if (hours < 48) return `abandoned ${hours}h ago`;
  return `abandoned ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

export function AdminPostcardPreview({ token, account, offer, refreshKey = 0 }: AdminPostcardPreviewProps) {
  const [view, setView] = useState<PostcardView | null>(null);
  const [sample, setSample] = useState<PreviewSample | null>(null);
  const [filterNote, setFilterNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      void (async () => {
        try {
          const res = await fetch("/api/account/preview", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...thanksAuthHeaders(token) },
            body: JSON.stringify({
              title: offer.title,
              couponcode: offer.couponcode,
              discount: offer.discount,
              minimum: offer.minimum,
              maxdiscount: offer.maxdiscount,
              logourl: offer.logourl,
              brandColor: offer.brandColor
            })
          });
          const data = (await res.json()) as {
            view?: PostcardView;
            sample?: PreviewSample;
            filterNote?: string | null;
            error?: string;
          };
          if (cancelled) return;
          if (!res.ok || !data.view || !data.sample) {
            throw new Error(data.error || "Could not load preview");
          }
          setView(data.view);
          setSample(data.sample);
          setFilterNote(data.filterNote ?? null);
        } catch (err) {
          if (!cancelled) {
            setView(null);
            setSample(null);
            setFilterNote(null);
            setError(err instanceof Error ? err.message : "Could not load preview");
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    token,
    account.id,
    account.storeKey,
    account.cartSlug,
    refreshKey,
    offer.title,
    offer.couponcode,
    offer.discount,
    offer.minimum,
    offer.maxdiscount,
    offer.logourl,
    offer.brandColor
  ]);

  const abandonedLabel = formatAbandonedAt(sample?.abandonedAt ?? null);

  return (
    <div className="card stack admin-preview">
      <div>
        <h2 className="admin-preview__title">Postcard preview</h2>
        <p className="field-sub admin-preview__lead">
          {sample?.source === "recent"
            ? "Using your most recent abandoned cart from the store."
            : "No recent abandoned carts found. Showing a sample order."}
        </p>
      </div>

      {sample ? (
        <div className="admin-preview__sample">
          <p className="admin-preview__sample-label">Sample order</p>
          <p className="admin-preview__sample-value">
            <strong>{sample.customerName || "Customer"}</strong>
            {sample.email ? ` · ${sample.email}` : null}
            {` · ${sample.itemCount} item${sample.itemCount === 1 ? "" : "s"}`}
            {` · ${formatMoney(sample.subtotal)}`}
            {abandonedLabel ? ` · ${abandonedLabel}` : null}
          </p>
        </div>
      ) : null}

      {loading && !view ? <p className="muted">Building preview…</p> : null}
      {error ? <p className="field-error">{error}</p> : null}
      {filterNote ? <p className="field-sub admin-preview__note">{filterNote}</p> : null}

      {view ? (
        <div className="preview-pair admin-preview__pair">
          <CartFront view={view} />
          <CartBack view={view} />
        </div>
      ) : null}
    </div>
  );
}
