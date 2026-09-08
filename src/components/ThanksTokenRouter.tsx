import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCampaign } from "../context/CampaignContext";
import {
  getThanksToken,
  persistThanksToken,
  readThanksTokenFromSearch,
  thanksAuthHeaders,
  withThanksToken
} from "../lib/thanksToken";

/** Capture thanksToken from the URL and route returning users to admin when configured. */
export function ThanksTokenRouter() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setOffer } = useCampaign();

  useEffect(() => {
    const fromUrl = readThanksTokenFromSearch(location.search);
    if (fromUrl) {
      persistThanksToken(fromUrl);
      setOffer({ thanksToken: fromUrl });
    }
  }, [location.search, setOffer]);

  useEffect(() => {
    const token = readThanksTokenFromSearch(location.search) || getThanksToken();
    if (!token) return;
    if (location.pathname.startsWith("/admin")) return;
    if (location.pathname.startsWith("/print")) return;

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/account", { headers: thanksAuthHeaders(token) });
        if (cancelled) return;
        if (res.ok && location.pathname === "/") {
          navigate(withThanksToken("/admin", token), { replace: true });
          return;
        }
        if (res.status === 404 && location.pathname === "/") {
          navigate(withThanksToken("/campaign/sync", token), { replace: true });
        }
      } catch {
        /* wizard still works offline from cache */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search, navigate]);

  return null;
}
