import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from "react";
import type { CartPayload, CartRecord, OfferFields } from "../types/cart";

const DEFAULT_OFFER: OfferFields = {
  title: "Don't lose your cart. Save 30%, Use Code CART30",
  couponcode: "CART30",
  discount: 30,
  minimum: 50,
  maxdiscount: 25,
  logourl: "/placeholder-logo.svg"
};

type SavedUrls = {
  front_image_url: string;
  back_image_url: string;
};

type CampaignState = {
  storeUrl: string;
  storeName: string;
  storeKey: string | null;
  cartSlug: string;
  cartId: string;
  offer: OfferFields;
  payload: CartPayload | null;
  cart: CartRecord | null;
  urls: SavedUrls | null;
  setStoreUrl: (v: string) => void;
  setStoreMeta: (meta: { storeUrl: string; storeName: string; cartSlug: string; cartId: string; storeKey: string | null }) => void;
  setOffer: (patch: Partial<OfferFields>) => void;
  setPayload: (p: CartPayload, storeKey?: string | null) => void;
  setSaved: (cart: CartRecord, urls: SavedUrls) => void;
  clearSaved: () => void;
};

const Ctx = createContext<CampaignState | null>(null);

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [storeUrl, setStoreUrl] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeKey, setStoreKey] = useState<string | null>(null);
  const [cartSlug, setCartSlug] = useState("");
  const [cartId, setCartId] = useState("");
  const [offer, setOfferState] = useState<OfferFields>(DEFAULT_OFFER);
  const [payload, setPayloadState] = useState<CartPayload | null>(null);
  const [cart, setCart] = useState<CartRecord | null>(null);
  const [urls, setUrls] = useState<SavedUrls | null>(null);

  const setOffer = useCallback((patch: Partial<OfferFields>) => {
    setOfferState((prev) => ({ ...prev, ...patch }));
    setCart(null);
    setUrls(null);
  }, []);

  const setStoreMeta = useCallback(
    (meta: { storeUrl: string; storeName: string; cartSlug: string; cartId: string; storeKey: string | null }) => {
      setStoreUrl(meta.storeUrl);
      setStoreName(meta.storeName);
      setCartSlug(meta.cartSlug);
      setCartId(meta.cartId);
      setStoreKey(meta.storeKey);
    },
    []
  );

  const setPayload = useCallback((p: CartPayload, key: string | null = null) => {
    setPayloadState(p);
    setStoreKey(key);
    setCart(null);
    setUrls(null);
  }, []);

  const setSaved = useCallback((next: CartRecord, nextUrls: SavedUrls) => {
    setCart(next);
    setUrls(nextUrls);
  }, []);

  const clearSaved = useCallback(() => {
    setCart(null);
    setUrls(null);
  }, []);

  const value = useMemo<CampaignState>(
    () => ({
      storeUrl,
      storeName,
      storeKey,
      cartSlug,
      cartId,
      offer,
      payload,
      cart,
      urls,
      setStoreUrl,
      setStoreMeta,
      setOffer,
      setPayload,
      setSaved,
      clearSaved
    }),
    [storeUrl, storeName, storeKey, cartSlug, cartId, offer, payload, cart, urls, setOffer, setPayload, setSaved, clearSaved, setStoreMeta]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCampaign() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCampaign requires CampaignProvider");
  return ctx;
}
