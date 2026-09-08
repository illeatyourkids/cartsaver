import type { OfferFields } from "../../src/types/cart.ts";
import type { CartSlug } from "../../src/data/cartLogos.ts";

export type ActiveAccount = OfferFields & {
  id: string;
  /** Thanks.io user bearer token. Billing happens on their account */
  thanksToken: string;
  storeKey: string;
  cartSlug: CartSlug;
  cartId: string;
  storeUrl: string;
  storeName: string;
  templateCartId: string | null;
  active: boolean;
  createdAt: string;
  activatedAt: string | null;
  lastCronAt: string | null;
};

export type AccountUpsert = Omit<
  ActiveAccount,
  "id" | "createdAt" | "activatedAt" | "lastCronAt" | "active"
> & {
  id?: string;
  active?: boolean;
};

export type CronSendRecord = {
  id: string;
  accountId: string;
  storeKey: string;
  abandonedOrderId: string;
  email: string;
  cartRecordId: string;
  thanksOrderId: string | null;
  status: "sent" | "skipped" | "failed";
  reason?: string;
  sentAt: string;
};
