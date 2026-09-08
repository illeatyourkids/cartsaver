# Cart Mailer

Abandoned-cart 6×11 postcard system for thanks.io. [cartmailer.com](https://cartmailer.com)

## What this is

1. **Wizard**: thanks.io users connect a store, set offer/filters, preview the postcard, and launch.
2. **Cron**: an hourly job scans every **active** connected store, finds **new** abandoned carts, resolves the shopper’s **mailing address from email** via thanks.io, applies your filters, and sends a postcard through the thanks.io API.

Billing lives entirely in thanks.io. This app only renders postcard PNGs and calls send.

## Render engine

thanks.io fetches live artwork at print time:

```
/renderengine?cartid=…&side=front&address=~ADDRESS~&qr_code=~QR_CODE~
```

## Setup

```bash
npm install
npx playwright install chromium
cp .env.example .env
npm run dev
```

Open http://localhost:5175

### Required env

| Variable | Purpose |
|---|---|
| `API2CART_API_KEY` | Pull abandoned carts from connected stores |
| `APP_BASE_URL` | Public URL thanks.io uses to fetch `/renderengine` PNGs |
| `SHOPIFY_CLIENT_ID` / `SHOPIFY_CLIENT_SECRET` | Shopify app for Shopify Authorization Code Flow |

### Cron / send env

| Variable | Purpose |
|---|---|
| `THANKS_DEFAULT_USER_TOKEN` | Optional dev fallback when launch omits a user token |
| `THANKS_IO_API_URL` | thanks.io API base (default production) |
| `THANKS_IO_ALLOW_LIVE_SEND=1` | Required to place real orders |
| `THANKS_IO_DRY_RUN=1` | Log payloads without sending |
| `CRON_SECRET` | Protects `POST /api/cron/run` |

## Admin panel

After setup, thanks.io users return with their API token:

```
/admin?thanksToken=USER_BEARER_TOKEN
```

Or open the app root with the same query param. Returning users go straight to admin; new users start the wizard.

The admin panel lets them:

- Turn the campaign **on/off**
- Update offer settings (headline, coupon, filters, logo)
- See store connection and recent send stats

Auth: `Authorization: Bearer <thanksToken>` or `?thanksToken=` on API calls.

## Hourly cron

```bash
npm run cron:abandoned
# or one account:
npm run cron:abandoned -- <accountId>
```

Schedule externally (cron, systemd, Railway, etc.) every hour:

```bash
0 * * * * cd /path/to/cart && npm run cron:abandoned >> /var/log/abandoned-cart.log 2>&1
```

Manual trigger while dev server is running:

```bash
curl -X POST http://localhost:5175/api/cron/run
```

Status:

```bash
curl http://localhost:5175/api/cron/status
```

## Connect stores

The wizard connects stores the way [Api2Cart documents](https://api2cart.com/docs/): `account.cart.add` after the merchant authorizes their own store.

- **Shopify**: [Authorization Code Flow](https://api2cart.com/connect-shopify-api2cart/), then `account.cart.add` with `shopify_access_token`. Requires a Shopify app (`SHOPIFY_CLIENT_ID` / `SHOPIFY_CLIENT_SECRET`) and the callback `APP_BASE_URL/api/connect/shopify/callback`.
- **WooCommerce**: WooCommerce REST auth (`/wc-auth/v1/authorize`), then `account.cart.add` with `WoocommerceApi`, `wc_consumer_key`, and `wc_consumer_secret`.
- **Magento, OpenCart, PrestaShop, and other open-source carts**: Connection Bridge (`cart.bridge` → `account.cart.add` with `store_key`). API-based Magento 2 / PrestaShop / Shopware connections use those platforms’ API credentials when the store is already connected that way.

## Cron flow (per active account)

1. Load abandoned carts from Api2Cart (newest first, all platforms supported in `server/platforms.ts`).
2. Skip orders already mailed (`store_key + abandoned_order_id` dedup in `.data/sends.json`).
3. Skip if no email, below minimum cart value, or over max existing discount.
4. Skip duplicate emails in the same run (keep the newest cart for that email).
5. Save a `cartid` render template for that abandonment.
6. `POST /send/postcard` to thanks.io with:
   - `front_image_url` / `custom_background_image` → `/renderengine` URLs with merge tags
   - recipient `{ name, email }` only → thanks.io looks up the street address
7. Record send result locally.

## Launch → activate cron

`POST /api/launch` stores an **active account** in `.data/accounts.json` with:

- thanks.io user bearer token
- Api2Cart `store_key` + platform
- offer settings (headline, coupon, discount, min/max filters, logo)

After launch, the hourly cron picks up that account automatically.
