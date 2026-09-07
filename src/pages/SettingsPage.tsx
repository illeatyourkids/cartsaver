import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { LogoCropper } from "../components/LogoCropper";
import { useCampaign } from "../context/CampaignContext";

function parseDollars(raw: string) {
  const n = Number(raw.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { offer, setOffer, payload } = useCampaign();
  const [minText, setMinText] = useState(() => String(offer.minimum));

  useEffect(() => {
    if (!payload) navigate("/campaign/sync", { replace: true });
  }, [payload, navigate]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!payload) {
      navigate("/campaign/sync");
      return;
    }
    navigate("/campaign/preview");
  };

  if (!payload) return null;

  return (
    <div className="app-main wizard-page">
      <h1 className="page-title">Settings</h1>
      <p className="page-lead">The offer they see, and which leftover carts get a card.</p>
      <form className="card stack" onSubmit={onSubmit}>
        <div>
          <label className="label" htmlFor="title">
            Headline
          </label>
          <p className="field-sub" id="title-help">
            The main line on the front of the postcard. Make it the reason to come back.
          </p>
          <input
            id="title"
            className="field"
            value={offer.title}
            onChange={(e) => setOffer({ title: e.target.value })}
            placeholder="Don't lose your cart. Save 30%, Use Code CART30"
            aria-describedby="title-help"
          />
        </div>
        <div className="grid-2">
          <div>
            <label className="label" htmlFor="couponcode">
              Coupon code
            </label>
            <p className="field-sub" id="coupon-help">
              Printed on the card. They enter this at checkout to get the discount (if we can’t do it automatically).
            </p>
            <input
              id="couponcode"
              className="field"
              value={offer.couponcode}
              onChange={(e) => setOffer({ couponcode: e.target.value })}
              placeholder="CART30"
              aria-describedby="coupon-help"
            />
          </div>
          <div>
            <label className="label" htmlFor="discount">
              Discount %
            </label>
            <p className="field-sub" id="discount-help">
              Percent off the leftover cart. The postcard shows the new price next to the old one.
            </p>
            <div className="field-affix">
              <input
                id="discount"
                className="field"
                type="number"
                min={0}
                max={100}
                value={offer.discount}
                onChange={(e) => setOffer({ discount: Number(e.target.value) })}
                aria-describedby="discount-help"
              />
              <span className="field-affix__mark field-affix__mark--end" aria-hidden>
                %
              </span>
            </div>
          </div>
        </div>
        <div className="grid-2">
          <div>
            <label className="label" htmlFor="minimum">
              Min Cart Value ($)
            </label>
            <p className="field-sub" id="minimum-help">
              Skip carts below this dollar amount. Only the leftovers worth chasing get a postcard.
            </p>
            <div className="field-affix">
              <span className="field-affix__mark field-affix__mark--start" aria-hidden>
                $
              </span>
              <input
                id="minimum"
                className="field"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={minText}
                onChange={(e) => {
                  const raw = e.target.value;
                  setMinText(raw);
                  if (raw === "" || raw === "." || raw.endsWith(".")) return;
                  setOffer({ minimum: parseDollars(raw) });
                }}
                onBlur={() => {
                  const next = parseDollars(minText);
                  setMinText(minText.trim() === "" ? "0" : String(next));
                  setOffer({ minimum: next });
                }}
                aria-describedby="minimum-help"
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="maxdiscount">
              Max Discount (%)
            </label>
            <p className="field-sub" id="maxdiscount-help">
              Don’t send a postcard if the leftover cart is already over this percent off.
            </p>
            <div className="field-affix">
              <input
                id="maxdiscount"
                className="field"
                type="number"
                min={0}
                max={100}
                value={offer.maxdiscount}
                onChange={(e) => setOffer({ maxdiscount: Number(e.target.value) })}
                aria-describedby="maxdiscount-help"
              />
              <span className="field-affix__mark field-affix__mark--end" aria-hidden>
                %
              </span>
            </div>
          </div>
        </div>
        <div>
          <span className="label" id="logo-label">
            Logo
          </span>
          <p className="field-sub" id="logo-help">
            Your store mark on the front and back. Crop it to fit the postcard frame.
          </p>
          <LogoCropper
            value={offer.logourl}
            knownColor={offer.brandColor}
            onChange={(logourl, brandColor) => setOffer({ logourl, brandColor })}
          />
        </div>
        <button className="btn btn-primary btn-block" type="submit">
          Preview card
        </button>
      </form>
    </div>
  );
}
