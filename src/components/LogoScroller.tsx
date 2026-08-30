import { cartLogoSrc, SUPPORTED_CARTS } from "../data/cartLogos";

export function LogoScroller() {
  return (
    <div className="logo-scroller" aria-label="Works with your cart">
      <div className="logo-scroller__track">
        {[0, 1].map((copy) => (
          <div
            key={copy}
            className="logo-scroller__set"
            aria-hidden={copy === 1}
          >
            {SUPPORTED_CARTS.map((cart) => (
              <span key={`${copy}-${cart.file}`} className="logo-scroller__item">
                <img src={cartLogoSrc(cart.file)} alt="" />
                <span>{cart.name}</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
