import { useEffect, useState } from "react";
import { CartBack } from "../templates/CartBack";
import { CartFront } from "../templates/CartFront";
import { PRINT_HEIGHT_PX, PRINT_WIDTH_PX } from "../templates/LobStage";
import type { PostcardView } from "../types/cart";

export function PrintPostcardView({
  cartid,
  side
}: {
  cartid: string;
  side: "front" | "back";
}) {
  const [view, setView] = useState<PostcardView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const address = q.get("address") || "";
    const qr_code = q.get("qr_code") || "";
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/print/${encodeURIComponent(cartid)}?address=${encodeURIComponent(address)}&qr_code=${encodeURIComponent(qr_code)}`
        );
        const data = (await res.json()) as PostcardView & { error?: string };
        if (!res.ok) throw new Error(data.error || "Print load failed");
        if (!cancelled) setView(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Print load failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cartid]);

  useEffect(() => {
    if (!view || error) return;
    let cancelled = false;
    void (async () => {
      try {
        if (document.fonts?.ready) await document.fonts.ready;
        const root = document.querySelector(".print-postcard");
        if (!root) {
          if (!cancelled) setReady(true);
          return;
        }
        const imgs = Array.from(root.querySelectorAll("img"));
        await Promise.all(
          imgs.map(
            (img) =>
              new Promise<void>((resolve) => {
                if (img.complete && img.naturalWidth > 0) return resolve();
                img.onload = () => resolve();
                img.onerror = () => resolve();
              })
          )
        );
        await new Promise((r) => setTimeout(r, 120));
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [view, error, side]);

  if (error) {
    return (
      <div className="print-postcard print-postcard--error" data-print-ready="0">
        {error}
      </div>
    );
  }

  if (!view) {
    return (
      <div
        className="print-postcard"
        data-print-ready="0"
        style={{ width: PRINT_WIDTH_PX, height: PRINT_HEIGHT_PX }}
      />
    );
  }

  return (
    <div
      className="print-postcard"
      data-print-ready={ready ? "1" : "0"}
      data-print-side={side}
      style={{ width: PRINT_WIDTH_PX, height: PRINT_HEIGHT_PX, margin: 0, background: "#fff" }}
    >
      {side === "back" ? <CartBack view={view} print /> : <CartFront view={view} print />}
    </div>
  );
}
