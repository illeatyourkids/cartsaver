export type CartItem = {
  name: string;
  imageUrl: string;
  quantity: number;
  price: number;
};

export type CartPayload = {
  customerName: string;
  email: string;
  basketUrl: string;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  existingDiscount?: number;
  /** Api2Cart abandoned order id, used for cron dedup */
  abandonedOrderId?: string;
  abandonedAt?: string;
};

export type OfferFields = {
  title: string;
  couponcode: string;
  discount: number;
  minimum: number;
  maxdiscount: number;
  logourl: string;
  brandColor?: string;
  /** Thanks.io user bearer token, passed on launch to activate hourly cron */
  thanksToken?: string;
};

export type CartRecord = OfferFields & {
  id: string;
  payload: CartPayload;
  storeKey: string | null;
  salePrice: number;
  originalPrice: number;
  createdAt: string;
  launchedAt?: string;
};

export type CartSaveInput = OfferFields & {
  payload: CartPayload;
  storeKey?: string | null;
};

export type PostcardView = {
  cart: CartRecord;
  address: string;
  qrImageUrl: string;
  qrImageUrlBack?: string;
  qrHref: string;
};
