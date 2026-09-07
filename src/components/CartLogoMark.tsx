import { cartLogoSrc } from "../data/cartLogos";

export function CartLogoMark({
  file,
  name,
  className = ""
}: {
  file: string;
  name: string;
  className?: string;
}) {
  const src = cartLogoSrc(file);

  return (
    <span className={`cart-logo-mark${className ? ` ${className}` : ""}`}>
      <img className="cart-logo-mark__sizer" src={src} alt="" />
      <span
        className="cart-logo-mark__tint"
        role="img"
        aria-label={name}
        style={{
          WebkitMaskImage: `url("${src}")`,
          maskImage: `url("${src}")`
        }}
      />
    </span>
  );
}
