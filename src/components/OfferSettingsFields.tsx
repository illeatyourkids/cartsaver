import { LogoCropper } from "./LogoCropper";
import type { OfferFields } from "../types/cart";

function parseDollars(raw: string) {
  const n = Number(raw.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

type OfferSettingsFieldsProps = {
  offer: OfferFields;
  minText: string;
  onMinTextChange: (value: string) => void;
  onMinBlur: () => void;
  onChange: (patch: Partial<OfferFields>) => void;
  idPrefix?: string;
};

export function OfferSettingsFields({
  offer,
  minText,
  onMinTextChange,
  onMinBlur,
  onChange,
  idPrefix = ""
}: OfferSettingsFieldsProps) {
  const id = (name: string) => (idPrefix ? `${idPrefix}-${name}` : name);

  return (
    <>
      <div>
        <label className="label" htmlFor={id("title")}>
          Headline
        </label>
        <p className="field-sub" id={id("title-help")}>
          The main line on the front of the postcard. Make it the reason to come back.
        </p>
        <input
          id={id("title")}
          className="field"
          value={offer.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Don't lose your cart. Save 30%, Use Code CART30"
          aria-describedby={id("title-help")}
        />
      </div>
      <div className="grid-2">
        <div>
          <label className="label" htmlFor={id("couponcode")}>
            Coupon code
          </label>
          <p className="field-sub" id={id("coupon-help")}>
            Printed on the card. They enter this at checkout to get the discount.
          </p>
          <input
            id={id("couponcode")}
            className="field"
            value={offer.couponcode}
            onChange={(e) => onChange({ couponcode: e.target.value })}
            placeholder="CART30"
            aria-describedby={id("coupon-help")}
          />
        </div>
        <div>
          <label className="label" htmlFor={id("discount")}>
            Discount %
          </label>
          <p className="field-sub" id={id("discount-help")}>
            Percent off the leftover cart. The postcard shows the new price next to the old one.
          </p>
          <div className="field-affix">
            <input
              id={id("discount")}
              className="field"
              type="number"
              min={0}
              max={100}
              value={offer.discount}
              onChange={(e) => onChange({ discount: Number(e.target.value) })}
              aria-describedby={id("discount-help")}
            />
            <span className="field-affix__mark field-affix__mark--end" aria-hidden>
              %
            </span>
          </div>
        </div>
      </div>
      <div className="grid-2">
        <div>
          <label className="label" htmlFor={id("minimum")}>
            Min Cart Value ($)
          </label>
          <p className="field-sub" id={id("minimum-help")}>
            Skip carts below this dollar amount. Only the leftovers worth chasing get a postcard.
          </p>
          <div className="field-affix">
            <span className="field-affix__mark field-affix__mark--start" aria-hidden>
              $
            </span>
            <input
              id={id("minimum")}
              className="field"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={minText}
              onChange={(e) => onMinTextChange(e.target.value)}
              onBlur={onMinBlur}
              aria-describedby={id("minimum-help")}
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor={id("maxdiscount")}>
            Max Discount (%)
          </label>
          <p className="field-sub" id={id("maxdiscount-help")}>
            Don’t send a postcard if the leftover cart is already over this percent off.
          </p>
          <div className="field-affix">
            <input
              id={id("maxdiscount")}
              className="field"
              type="number"
              min={0}
              max={100}
              value={offer.maxdiscount}
              onChange={(e) => onChange({ maxdiscount: Number(e.target.value) })}
              aria-describedby={id("maxdiscount-help")}
            />
            <span className="field-affix__mark field-affix__mark--end" aria-hidden>
              %
            </span>
          </div>
        </div>
      </div>
      <div>
        <span className="label" id={id("logo-label")}>
          Logo
        </span>
        <p className="field-sub" id={id("logo-help")}>
          Your store mark on the front and back. Crop it to fit the postcard frame.
        </p>
        <LogoCropper
          value={offer.logourl}
          knownColor={offer.brandColor}
          onChange={(logourl, brandColor) => onChange({ logourl, brandColor })}
        />
      </div>
    </>
  );
}

export { parseDollars };
