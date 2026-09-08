import { randomBytes } from "node:crypto";
import { listAbandonedCartsForStore } from "./api2cart.ts";
import { cartEligibilityError, pricedOffer } from "./cartsave.ts";
import { FIXTURE_PAYLOAD } from "./fixture.ts";
import { platformForCartId, platformForSlug } from "./platforms.ts";
import { resolveQrImage } from "./qr.ts";
import type { ActiveAccount } from "./types/account.ts";
import type { CartPayload, CartRecord, PostcardView } from "../src/types/cart.ts";

export type AccountPreviewOffer = Pick<
  ActiveAccount,
  "title" | "couponcode" | "discount" | "minimum" | "maxdiscount" | "logourl" | "brandColor"
>;

export type PreviewSample = {
  source: "recent" | "fixture";
  customerName: string;
  email: string;
  abandonedAt: string | null;
  itemCount: number;
  subtotal: number;
};

export type AccountPreviewResult = {
  view: PostcardView;
  sample: PreviewSample;
  filterNote: string | null;
};

export async function buildPostcardPreview(
  offer: AccountPreviewOffer,
  payload: CartPayload,
  storeKey: string | null,
  sample: PreviewSample
): Promise<AccountPreviewResult> {
  const input = {
    title: offer.title,
    couponcode: offer.couponcode,
    discount: offer.discount,
    minimum: offer.minimum,
    maxdiscount: offer.maxdiscount,
    logourl: offer.logourl,
    brandColor: offer.brandColor,
    payload,
    storeKey
  };

  const prices = pricedOffer(input);
  const cart: CartRecord = {
    id: `preview-${randomBytes(4).toString("hex")}`,
    title: input.title.trim(),
    couponcode: input.couponcode.trim(),
    discount: Number(input.discount) || 0,
    minimum: Number(input.minimum) || 0,
    maxdiscount: Number(input.maxdiscount) || 0,
    logourl: input.logourl.trim(),
    brandColor: input.brandColor?.trim() || undefined,
    payload: {
      ...payload,
      items: payload.items.slice(0, 3),
      itemCount: payload.itemCount || payload.items.length
    },
    ...prices,
    storeKey,
    createdAt: new Date().toISOString()
  };

  const qrImageUrl = await resolveQrImage(
    cart.payload.basketUrl,
    cart.payload.basketUrl,
    cart.brandColor
  );

  return {
    view: {
      cart,
      address: "123 Main St",
      qrImageUrl,
      qrHref: cart.payload.basketUrl
    },
    sample,
    filterNote: cartEligibilityError(input)
  };
}

export async function buildAccountPreview(
  account: ActiveAccount,
  offer: AccountPreviewOffer = account
): Promise<AccountPreviewResult> {
  const platform = platformForCartId(account.cartId) || platformForSlug(account.cartSlug);
  let payload: CartPayload;
  let source: PreviewSample["source"] = "fixture";
  let abandonedAt: string | null = null;

  if (platform && account.storeKey) {
    const { candidates } = await listAbandonedCartsForStore(
      account.storeKey,
      account.storeUrl,
      platform
    );
    if (candidates[0]) {
      payload = candidates[0].payload;
      source = "recent";
      abandonedAt = candidates[0].abandonedAt;
    } else {
      payload = {
        ...FIXTURE_PAYLOAD,
        basketUrl: platform.basketUrl(account.storeUrl, {})
      };
    }
  } else {
    payload = {
      ...FIXTURE_PAYLOAD,
      basketUrl: account.storeUrl || FIXTURE_PAYLOAD.basketUrl
    };
  }

  return buildPostcardPreview(
    offer,
    payload,
    account.storeKey,
    {
      source,
      customerName: payload.customerName,
      email: payload.email,
      abandonedAt,
      itemCount: payload.itemCount,
      subtotal: payload.subtotal
    }
  );
}
