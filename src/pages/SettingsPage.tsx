import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { OfferSettingsFields, parseDollars } from "../components/OfferSettingsFields";
import { useCampaign } from "../context/CampaignContext";
import { cartEligibilityError } from "../lib/cartEligibility";

export function SettingsPage() {
  const navigate = useNavigate();
  const { offer, setOffer, payload } = useCampaign();
  const [minText, setMinText] = useState(() => String(offer.minimum));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!payload) navigate("/campaign/sync", { replace: true });
  }, [payload, navigate]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!payload) {
      navigate("/campaign/sync");
      return;
    }
    const eligibilityError = cartEligibilityError({
      payload,
      minimum: offer.minimum,
      maxdiscount: offer.maxdiscount
    });
    if (eligibilityError) {
      setError(eligibilityError);
      return;
    }
    setError(null);
    navigate("/campaign/preview");
  };

  if (!payload) return null;

  return (
    <div className="app-main wizard-page">
      <h1 className="page-title">Settings</h1>
      <p className="page-lead">The offer they see, and which leftover carts get a card.</p>
      <form className="card stack" onSubmit={onSubmit}>
        <OfferSettingsFields
          offer={offer}
          minText={minText}
          onChange={setOffer}
          onMinTextChange={(raw) => {
            setMinText(raw);
            if (raw === "" || raw === "." || raw.endsWith(".")) return;
            setOffer({ minimum: parseDollars(raw) });
          }}
          onMinBlur={() => {
            const next = parseDollars(minText);
            setMinText(minText.trim() === "" ? "0" : String(next));
            setOffer({ minimum: next });
          }}
        />
        {error ? <p className="field-error">{error}</p> : null}
        <button className="btn btn-primary btn-block" type="submit">
          Preview card
        </button>
      </form>
    </div>
  );
}
