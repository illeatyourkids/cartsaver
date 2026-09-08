import { loadEnv } from "vite";
import { runAbandonedCartCron } from "../server/cron/runAbandonedCart.ts";

const env = loadEnv("development", process.cwd(), "");
if (env.API2CART_API_KEY) process.env.API2CART_API_KEY = env.API2CART_API_KEY;
if (env.APP_BASE_URL) process.env.APP_BASE_URL = env.APP_BASE_URL;
if (env.THANKS_IO_API_URL) process.env.THANKS_IO_API_URL = env.THANKS_IO_API_URL;
if (env.THANKS_IO_DRY_RUN) process.env.THANKS_IO_DRY_RUN = env.THANKS_IO_DRY_RUN;
if (env.THANKS_IO_ALLOW_LIVE_SEND) process.env.THANKS_IO_ALLOW_LIVE_SEND = env.THANKS_IO_ALLOW_LIVE_SEND;

const accountId = process.argv[2]?.trim() || undefined;
const result = await runAbandonedCartCron({ accountId });
console.log(JSON.stringify(result, null, 2));
