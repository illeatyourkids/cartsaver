const THANKS_API =
  process.env.THANKS_IO_API_URL?.trim().replace(/\/$/, "") || "https://api.thanks.io/api/v2";

export type ThanksSendResult =
  | { mode: "live"; orderId: string; raw: Record<string, unknown> }
  | { mode: "dry_run"; orderId: string; payload: Record<string, unknown>; reason: string };

function dryRunEnabled() {
  return (
    process.env.THANKS_IO_DRY_RUN === "1" ||
    process.env.THANKS_IO_DRY_RUN === "true" ||
    !process.env.THANKS_IO_ALLOW_LIVE_SEND
  );
}

export function buildAbandonedCartPostcardPayload(opts: {
  frontImageUrl: string;
  backImageUrl: string;
  recipientName: string;
  recipientEmail: string;
  basketUrl: string;
  metadata?: Record<string, string>;
}): Record<string, unknown> {
  return {
    size: "6x11",
    front_image_url: opts.frontImageUrl,
    use_custom_background: true,
    custom_background_image: opts.backImageUrl,
    message: " ",
    omit_return_address: true,
    qrcode_url: opts.basketUrl,
    recipients: [
      {
        name: opts.recipientName || "Current Resident",
        email: opts.recipientEmail.trim()
      }
    ],
    metadata: opts.metadata
  };
}

export async function sendAbandonedCartPostcard(opts: {
  thanksToken: string;
  frontImageUrl: string;
  backImageUrl: string;
  recipientName: string;
  recipientEmail: string;
  basketUrl: string;
  metadata?: Record<string, string>;
}): Promise<ThanksSendResult> {
  const payload = buildAbandonedCartPostcardPayload(opts);
  const token = opts.thanksToken.trim();

  if (!token) {
    return {
      mode: "dry_run",
      orderId: `dry_no_token_${Date.now().toString(36)}`,
      payload,
      reason: "thanksToken is required to send mail"
    };
  }

  if (dryRunEnabled()) {
    return {
      mode: "dry_run",
      orderId: `dry_${Date.now().toString(36)}`,
      payload,
      reason: process.env.THANKS_IO_ALLOW_LIVE_SEND
        ? "THANKS_IO_DRY_RUN=1"
        : "Set THANKS_IO_ALLOW_LIVE_SEND=1 to place live orders"
    };
  }

  const res = await fetch(`${THANKS_API}/send/postcard`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(payload)
  });

  const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      (typeof raw.message === "string" && raw.message) ||
      (typeof raw.error === "string" && raw.error) ||
      `thanks.io send/postcard HTTP ${res.status}`;
    throw new Error(msg);
  }

  const orderId =
    raw.id != null
      ? String(raw.id)
      : raw.order_id != null
        ? String(raw.order_id)
        : `thanks_${Date.now().toString(36)}`;

  return { mode: "live", orderId, raw };
}
