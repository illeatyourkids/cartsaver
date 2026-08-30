import type { PostcardView } from "../types/cart";
import { LobStage } from "./LobStage";

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function CartFront({
  view,
  print = false,
  showLabel = !print
}: {
  view: PostcardView;
  print?: boolean;
  showLabel?: boolean;
}) {
  const { cart } = view;
  const items = cart.payload.items.slice(0, 3);

  return (
    <LobStage label={showLabel ? "Front" : undefined} className="cart-front" print={print} ink={cart.brandColor}>
      <div className="cart-front__logo-wrap">
        {cart.logourl ? <img src={cart.logourl} alt="" className="cart-front__logo" /> : (
          <span className="cart-front__logo cart-front__logo--empty" />
        )}
      </div>
      <h1 className="cart-front__title">{cart.title}</h1>

      <section className="cart-front__box">
        <p className="cart-front__label">Your saved cart:</p>
        <div className="cart-front__row">
          <div className="cart-front__thumbs">
            {items.map((item, i) => (
              <div key={`${item.name}-${i}`} className="cart-thumb">
                {item.imageUrl ? <img src={item.imageUrl} alt="" /> : null}
              </div>
            ))}
          </div>
          <div className="cart-front__prices">
            <strong className="cart-front__sale">{money(cart.salePrice)}</strong>
            <span className="cart-front__was">{money(cart.originalPrice)}</span>
          </div>
        </div>
      </section>

      <div className="cart-front__footer" />
      <div className="cart-qr cart-qr--front">
        {view.qrImageUrl ? <img src={view.qrImageUrl} alt="" /> : <div className="cart-qr__ph" />}
      </div>
      <p className="cart-front__cta">Scan to instantly complete your cart</p>
      <p className="cart-front__url">{cart.payload.basketUrl}</p>
    </LobStage>
  );
}
