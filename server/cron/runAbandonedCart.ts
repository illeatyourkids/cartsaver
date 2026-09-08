import { listActiveAccounts, touchAccountCron } from "../accounts.ts";
import { listAbandonedCartsForStore } from "../api2cart.ts";
import { appBase, cartsave, renderengineUrl, shouldMailCart } from "../cartsave.ts";
import { platformForCartId } from "../platforms.ts";
import { wasAbandonedOrderSent, recordSend, cronStats } from "../sends.ts";
import { sendAbandonedCartPostcard } from "../thanks/sendPostcard.ts";
import type { ActiveAccount } from "../types/account.ts";

export type CronItemResult = {
  accountId: string;
  storeName: string;
  orderId: string;
  email: string;
  status: "sent" | "skipped" | "failed";
  reason?: string;
  thanksOrderId?: string;
  cartRecordId?: string;
};

export type CronRunResult = {
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  accounts: number;
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  items: CronItemResult[];
};

function skipReason(account: ActiveAccount, payload: { subtotal: number; existingDiscount?: number; email: string }) {
  if (!payload.email?.trim()) return "No customer email on the abandoned cart.";
  if (!shouldMailCart({ payload, minimum: account.minimum, maxdiscount: account.maxdiscount })) {
    if (payload.subtotal < account.minimum) {
      return `Cart subtotal $${payload.subtotal.toFixed(2)} is below minimum $${account.minimum.toFixed(2)}.`;
    }
    return "Cart already exceeds the max discount threshold.";
  }
  return null;
}

async function processAccount(account: ActiveAccount): Promise<CronItemResult[]> {
  const platform = platformForCartId(account.cartId);
  if (!platform) {
    return [
      {
        accountId: account.id,
        storeName: account.storeName,
        orderId: "",
        email: "",
        status: "failed",
        reason: `Unsupported cart platform: ${account.cartId}`
      }
    ];
  }

  const { candidates, error } = await listAbandonedCartsForStore(
    account.storeKey,
    account.storeUrl,
    platform
  );

  if (error && !candidates.length) {
    return [
      {
        accountId: account.id,
        storeName: account.storeName,
        orderId: "",
        email: "",
        status: "failed",
        reason: error
      }
    ];
  }

  const results: CronItemResult[] = [];
  const seenEmails = new Set<string>();
  const base = appBase();

  for (const candidate of candidates) {
    const { payload, orderId } = candidate;
    const emailKey = payload.email.trim().toLowerCase();

    if (wasAbandonedOrderSent(account.storeKey, orderId)) {
      continue;
    }

    if (emailKey && seenEmails.has(emailKey)) {
      recordSend({
        accountId: account.id,
        storeKey: account.storeKey,
        abandonedOrderId: orderId,
        email: payload.email,
        cartRecordId: "",
        thanksOrderId: null,
        status: "skipped",
        reason: "Newer abandoned cart for this email already queued this run."
      });
      results.push({
        accountId: account.id,
        storeName: account.storeName,
        orderId,
        email: payload.email,
        status: "skipped",
        reason: "Newer abandoned cart for this email already queued this run."
      });
      continue;
    }

    const filterReason = skipReason(account, payload);
    if (filterReason) {
      recordSend({
        accountId: account.id,
        storeKey: account.storeKey,
        abandonedOrderId: orderId,
        email: payload.email,
        cartRecordId: "",
        thanksOrderId: null,
        status: "skipped",
        reason: filterReason
      });
      results.push({
        accountId: account.id,
        storeName: account.storeName,
        orderId,
        email: payload.email,
        status: "skipped",
        reason: filterReason
      });
      continue;
    }

    if (emailKey) seenEmails.add(emailKey);

    try {
      const cart = cartsave({
        title: account.title,
        couponcode: account.couponcode,
        discount: account.discount,
        minimum: account.minimum,
        maxdiscount: account.maxdiscount,
        logourl: account.logourl,
        brandColor: account.brandColor,
        payload,
        storeKey: account.storeKey
      });

      const frontImageUrl = renderengineUrl({ base, cartid: cart.id, side: "front" });
      const backImageUrl = renderengineUrl({ base, cartid: cart.id, side: "back" });

      const send = await sendAbandonedCartPostcard({
        thanksToken: account.thanksToken,
        frontImageUrl,
        backImageUrl,
        recipientName: payload.customerName,
        recipientEmail: payload.email,
        basketUrl: payload.basketUrl,
        metadata: {
          account_id: account.id,
          abandoned_order_id: orderId,
          cart_record_id: cart.id
        }
      });

      if (send.mode === "dry_run") {
        recordSend({
          accountId: account.id,
          storeKey: account.storeKey,
          abandonedOrderId: orderId,
          email: payload.email,
          cartRecordId: cart.id,
          thanksOrderId: send.orderId,
          status: "skipped",
          reason: send.reason
        });
        results.push({
          accountId: account.id,
          storeName: account.storeName,
          orderId,
          email: payload.email,
          status: "skipped",
          reason: send.reason,
          cartRecordId: cart.id
        });
        continue;
      }

      recordSend({
        accountId: account.id,
        storeKey: account.storeKey,
        abandonedOrderId: orderId,
        email: payload.email,
        cartRecordId: cart.id,
        thanksOrderId: send.orderId,
        status: "sent"
      });

      results.push({
        accountId: account.id,
        storeName: account.storeName,
        orderId,
        email: payload.email,
        status: "sent",
        thanksOrderId: send.orderId,
        cartRecordId: cart.id
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Send failed";
      recordSend({
        accountId: account.id,
        storeKey: account.storeKey,
        abandonedOrderId: orderId,
        email: payload.email,
        cartRecordId: "",
        thanksOrderId: null,
        status: "failed",
        reason
      });
      results.push({
        accountId: account.id,
        storeName: account.storeName,
        orderId,
        email: payload.email,
        status: "failed",
        reason
      });
    }
  }

  touchAccountCron(account.id);
  return results;
}

export async function runAbandonedCartCron(opts?: { accountId?: string }): Promise<CronRunResult> {
  const startedAt = new Date().toISOString();
  const accounts = listActiveAccounts().filter((a) => !opts?.accountId || a.id === opts.accountId);
  const items: CronItemResult[] = [];

  for (const account of accounts) {
    items.push(...(await processAccount(account)));
  }

  const finishedAt = new Date().toISOString();
  return {
    ok: true,
    startedAt,
    finishedAt,
    accounts: accounts.length,
    processed: items.length,
    sent: items.filter((i) => i.status === "sent").length,
    skipped: items.filter((i) => i.status === "skipped").length,
    failed: items.filter((i) => i.status === "failed").length,
    items
  };
}

export function cronStatus() {
  return {
    activeAccounts: listActiveAccounts().length,
    stats: cronStats()
  };
}
