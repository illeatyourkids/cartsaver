import { SUPPORTED_CARTS } from "../data/cartLogos";
import { CartLogoMark } from "./CartLogoMark";

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
              <CartLogoMark key={`${copy}-${cart.file}`} file={cart.file} name={cart.name} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
