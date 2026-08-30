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
};

export type OfferFields = {
  title: string;
  couponcode: string;
  discount: number;
  minimum: number;
  maxdiscount: number;
  logourl: string;
  brandColor?: string;
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
