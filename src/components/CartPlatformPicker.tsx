import type { ReactNode } from "react";
import { CartLogoMark } from "./CartLogoMark";
import { SUPPORTED_CARTS, type CartSlug } from "../data/cartLogos";

type CartPlatformPickerProps = {
  value: CartSlug | "";
  onChange: (slug: CartSlug) => void;
  disabled?: boolean;
  children?: ReactNode;
};

export function CartPlatformPicker({ value, onChange, disabled, children }: CartPlatformPickerProps) {
  const nodes: ReactNode[] = [];

  SUPPORTED_CARTS.forEach((item, index) => {
    const selected = value === item.slug;
    nodes.push(
      <li key={item.slug}>
        <button
          type="button"
          className={`cart-pick__btn${selected ? " selected" : ""}`}
          role="option"
          aria-selected={selected}
          aria-label={item.name}
          disabled={disabled}
          onClick={() => onChange(item.slug)}
        >
          <CartLogoMark file={item.file} name={item.name} className="cart-pick__logo" />
        </button>
      </li>
    );

    const endOfRow = index % 2 === 1 || index === SUPPORTED_CARTS.length - 1;
    if (!endOfRow || !children || !value) return;

    const left = SUPPORTED_CARTS[index % 2 === 1 ? index - 1 : index];
    const right = index % 2 === 1 ? item : null;
    const selectedInRow = value === left.slug || (right != null && value === right.slug);
    if (!selectedInRow) return;

    nodes.push(
      <li key="store-connect" className="cart-pick__connect">
        {children}
      </li>
    );
  });

  return (
    <ul className="cart-pick" role="listbox" aria-label="Shopping cart">
      {nodes}
    </ul>
  );
}
