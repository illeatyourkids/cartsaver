import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { OfferSettingsFields, parseDollars } from "../components/OfferSettingsFields";
import { CartLogoMark } from "../components/CartLogoMark";
import { AdminPostcardPreview } from "../components/AdminPostcardPreview";
import { StoreSyncModal } from "../components/StoreSyncModal";
import { cartBySlug } from "../data/cartLogos";
import type { OfferFields } from "../types/cart";
import type { AccountStats, PublicAccount } from "../types/account";
import { getThanksToken, readThanksTokenFromSearch, thanksAuthHeaders, withThanksToken } from "../lib/thanksToken";

function formatMatchRate(rate: number | null) {
  return rate == null ? "—" : `${rate}%`;
}

function formatMatchSub(rate: number | null) {
  return rate == null ? "—" : `${rate}% match`;
}

function accountToOffer(account: PublicAccount): OfferFields {
  return {
    title: account.title,
    couponcode: account.couponcode,
    discount: account.discount,
    minimum: account.minimum,
    maxdiscount: account.maxdiscount,
    logourl: account.logourl,
    brandColor: account.brandColor
  };
}

export function AdminPage() {
  const location = useLocation();
  const token = getThanksToken() || readThanksTokenFromSearch(location.search);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [account, setAccount] = useState<PublicAccount | null>(null);
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [offer, setOffer] = useState<OfferFields | null>(null);
  const [active, setActive] = useState(false);
  const [minText, setMinText] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [storeSyncOpen, setStoreSyncOpen] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("Open this page from thanks.io so your account token is included.");
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/account", { headers: thanksAuthHeaders(token) });
        const data = (await res.json()) as {
          account?: PublicAccount;
          stats?: AccountStats;
          error?: string;
        };
        if (cancelled) return;
        if (res.status === 404) {
          setMissing(true);
          return;
        }
        if (!res.ok || !data.account) {
          throw new Error(data.error || "Could not load campaign");
        }
        setAccount(data.account);
        setStats(data.stats ?? null);
        setOffer(accountToOffer(data.account));
        setActive(data.account.active);
        setMinText(String(data.account.minimum));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load campaign");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !offer) return;
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...thanksAuthHeaders(token) },
        body: JSON.stringify({
          active,
          title: offer.title,
          couponcode: offer.couponcode,
          discount: offer.discount,
          minimum: offer.minimum,
          maxdiscount: offer.maxdiscount,
          logourl: offer.logourl,
          brandColor: offer.brandColor
        })
      });
      const data = (await res.json()) as { account?: PublicAccount; stats?: AccountStats; error?: string };
      if (!res.ok || !data.account) throw new Error(data.error || "Could not save");
      setAccount(data.account);
      setStats(data.stats ?? null);
      setOffer(accountToOffer(data.account));
      setActive(data.account.active);
      setStatus("Saved.");
      setPreviewKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="app-main wizard-page">
        <p className="muted">Loading campaign…</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="app-main wizard-page">
        <h1 className="page-title">Campaign admin</h1>
        <p className="field-error">{error}</p>
      </div>
    );
  }

  if (missing) {
    return (
      <div className="app-main wizard-page">
        <h1 className="page-title">Set up abandoned cart mail</h1>
        <p className="page-lead">Connect your store and launch your first campaign.</p>
        <Link className="btn btn-primary" to={withThanksToken("/campaign/sync", token)}>
          Start setup
        </Link>
      </div>
    );
  }

  if (!account || !offer) {
    return (
      <div className="app-main wizard-page">
        <h1 className="page-title">Campaign admin</h1>
        <p className="field-error">{error || "Could not load campaign."}</p>
      </div>
    );
  }

  const platform = cartBySlug(account.cartSlug);

  return (
    <div className="app-main wizard-page admin-page">
      <h1 className="page-title">Campaign admin</h1>
      <p className="page-lead">{account.storeName}</p>

      <div className="card stack admin-panel">
        <div className="admin-status">
          <div className="admin-status__meta">
            <p className="admin-status__store" title={account.storeUrl}>
              {account.storeUrl}
            </p>
            <div className="admin-status__platform-wrap">
              <span className="admin-status__platform">
                {platform ? (
                  <CartLogoMark file={platform.file} name={platform.name} className="admin-status__logo" />
                ) : (
                  account.cartSlug
                )}
              </span>
              <button
                type="button"
                className="admin-status__platform-edit"
                aria-label="Change store sync"
                onClick={() => setStoreSyncOpen(true)}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
          <div className="admin-status__metrics">
            <div className="admin-metric">
              <p className="label">Email match</p>
              <p className="admin-metric__value">{formatMatchRate(stats?.matchRate ?? null)}</p>
            </div>
            <div className="admin-metric">
              <p className="label">Today</p>
              <p className="admin-metric__value">{stats?.sentToday ?? 0}</p>
              <p className="admin-metric__sub">{formatMatchSub(stats?.matchRateToday ?? null)}</p>
            </div>
            <div className="admin-metric">
              <p className="label">This week</p>
              <p className="admin-metric__value">{stats?.sentThisWeek ?? 0}</p>
              <p className="admin-metric__sub">{formatMatchSub(stats?.matchRateThisWeek ?? null)}</p>
            </div>
            <div className="admin-metric">
              <p className="label">This month</p>
              <p className="admin-metric__value">{stats?.sentThisMonth ?? 0}</p>
              <p className="admin-metric__sub">{formatMatchSub(stats?.matchRateThisMonth ?? null)}</p>
            </div>
          </div>
        </div>

        <div className="admin-toggle">
          <div className="admin-toggle__row">
            <div>
              <p className="label admin-toggle__label">Campaign active</p>
              <p className="field-sub admin-toggle__hint">
                {active
                  ? "New abandoned carts that pass your filters will get a postcard."
                  : "Paused. No new postcards will be sent."}
              </p>
            </div>
            <label className="toggle" aria-label="Campaign active">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              <span className="toggle__track" aria-hidden />
            </label>
          </div>
        </div>

        <form className="stack" onSubmit={(e) => void onSave(e)}>
          <OfferSettingsFields
            offer={offer}
            minText={minText}
            idPrefix="admin"
            onChange={(patch) => setOffer((prev) => (prev ? { ...prev, ...patch } : prev))}
            onMinTextChange={(raw) => {
              setMinText(raw);
              if (raw === "" || raw === "." || raw.endsWith(".")) return;
              setOffer((prev) => (prev ? { ...prev, minimum: parseDollars(raw) } : prev));
            }}
            onMinBlur={() => {
              const next = parseDollars(minText);
              setMinText(minText.trim() === "" ? "0" : String(next));
              setOffer((prev) => (prev ? { ...prev, minimum: next } : prev));
            }}
          />
          {error ? <p className="field-error">{error}</p> : null}
          {status ? <p className="field-sub">{status}</p> : null}
          <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>

      <AdminPostcardPreview token={token} account={account} offer={offer} refreshKey={previewKey} />

      {token ? (
        <StoreSyncModal
          open={storeSyncOpen}
          token={token}
          currentSlug={account.cartSlug}
          onClose={() => setStoreSyncOpen(false)}
          onUpdated={(next) => {
            setAccount(next);
            setStatus("Store sync updated.");
            setPreviewKey((k) => k + 1);
          }}
        />
      ) : null}
    </div>
  );
}
