import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCampaign } from "../context/CampaignContext";
import { CartBack } from "../templates/CartBack";
import { CartFront } from "../templates/CartFront";
import type { CartRecord, PostcardView } from "../types/cart";

export function PreviewPage() {
  const navigate = useNavigate();
  const { offer, payload, storeKey, cart, urls, setSaved } = useCampaign();
  const [view, setView] = useState<PostcardView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [live, setLive] = useState(Boolean(cart?.launchedAt));

  useEffect(() => {
    if (!payload) navigate("/campaign/sync", { replace: true });
  }, [payload, navigate]);

  useEffect(() => {
    if (!payload) return;
    let cancelled = false;
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        let next = cart;
        let nextUrls = urls;
        if (!next || !nextUrls) {
          const res = await fetch("/api/carts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...offer, payload, storeKey })
          });
          const data = (await res.json()) as {
            cart?: CartRecord;
            front_image_url?: string;
            back_image_url?: string;
            error?: string;
          };
          if (!res.ok || !data.cart || !data.front_image_url || !data.back_image_url) {
            throw new Error(data.error || "Save failed");
          }
          next = data.cart;
          nextUrls = {
            front_image_url: data.front_image_url,
            back_image_url: data.back_image_url
          };
          if (cancelled) return;
          setSaved(next, nextUrls);
        }
        const print = await fetch(
          `/api/print/${encodeURIComponent(next.id)}?address=${encodeURIComponent("123 Main St")}&qr_code=${encodeURIComponent(next.payload.basketUrl)}`
        );
        const printData = (await print.json()) as PostcardView & { error?: string };
        if (!print.ok) throw new Error(printData.error || "Preview failed");
        if (!cancelled) {
          setView(printData);
          setLive(Boolean(next.launchedAt));
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Save failed");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // cart/urls are written by this effect; don't re-run when they land
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, offer, storeKey, setSaved]);

  const onLaunch = async () => {
    if (!cart || live) return;
    setLaunching(true);
    setError(null);
    try {
      const res = await fetch("/api/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartid: cart.id })
      });
      const data = (await res.json()) as { live?: boolean; error?: string };
      if (!res.ok || !data.live) throw new Error(data.error || "Could not launch");
      setLive(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not launch");
    } finally {
      setLaunching(false);
    }
  };

  if (!payload) return null;

  return (
    <div className="app-main wide preview-page">
      <h1 className="page-title">Preview</h1>
      <p className="page-lead">Front and back, with products from the shop.</p>
      {busy && !view ? <p className="muted">Building preview…</p> : null}
      {error ? <p className="field-error">{error}</p> : null}
      {view ? (
        <div className="preview-pair">
          <CartFront view={view} />
          <CartBack view={view} />
        </div>
      ) : null}
      <div className="row preview-actions">
        <Link className="btn btn-secondary" to="/campaign/settings">
          Back
        </Link>
        {live ? (
          <p className="preview-live">Your campaign is live.</p>
        ) : (
          <button
            className="btn btn-primary"
            type="button"
            disabled={!cart || busy || launching}
            onClick={() => void onLaunch()}
          >
            {launching ? "Launching…" : "Launch"}
          </button>
        )}
      </div>
    </div>
  );
}
