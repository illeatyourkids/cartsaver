import type { PostcardView } from "../types/cart";
import { LobStage } from "./LobStage";

function CartIcon() {
  return (
    <svg className="cart-back__icon" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM7.2 14h9.5c.8 0 1.5-.5 1.7-1.3L21 6H6.2L5.3 4H2v2h2l3.6 7.6L6.2 16c-.1.3-.2.6-.2 1 0 1.1.9 2 2 2h12v-2H8.4c-.1 0-.2-.1-.2-.2L8.8 14z"
      />
    </svg>
  );
}

export function CartBack({
  view,
  print = false,
  showLabel = !print,
  layout = print ? "print" : "preview"
}: {
  view: PostcardView;
  print?: boolean;
  showLabel?: boolean;
  layout?: "print" | "preview" | "sample";
}) {
  const { cart } = view;
  const items = cart.payload.items.slice(0, 3);
  const count = cart.payload.itemCount || items.length;
  const qr = view.qrImageUrlBack || view.qrImageUrl;
  const sample = layout === "sample";

  return (
    <LobStage
      label={showLabel ? "Back" : undefined}
      className={`cart-back${sample ? " cart-back--sample" : ""}`}
      print={print}
      ink={cart.brandColor}
    >
      <div className="cart-back__bar" />
      <div className="cart-back__mail-safe" aria-hidden />

      <section className="cart-back__strip">
        {items.map((item, i) => (
          <div key={`${item.name}-${i}`} className="cart-thumb cart-thumb--wide">
            {item.imageUrl ? <img src={item.imageUrl} alt="" /> : null}
          </div>
        ))}
      </section>

      <div className="cart-back__brand">
        {cart.logourl ? (
          <img
            src={cart.logourl}
            alt=""
            className={`cart-back__logo${/placeholder/.test(cart.logourl) ? " cart-back__logo--plate" : ""}`}
          />
        ) : (
          <div className="cart-back__logo cart-back__logo--empty" />
        )}
        <p className="cart-back__url">{cart.payload.basketUrl}</p>
      </div>
      <div className="cart-qr cart-qr--back">
        {qr ? <img src={qr} alt="" /> : <div className="cart-qr__ph" />}
      </div>
      <div className="cart-back__offer">
        <p className="cart-back__code">Code: {cart.couponcode}</p>
        <div className="cart-back__badge-wrap">
          <CartIcon />
          <span className="cart-back__badge">{count}</span>
        </div>
      </div>
    </LobStage>
  );
}
