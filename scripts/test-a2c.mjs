import { loadEnv } from "vite";
import { listConnectedStores, syncShoppingCart } from "../server/api2cart.ts";

const env = loadEnv("development", process.cwd(), "");
if (env.API2CART_API_KEY) process.env.API2CART_API_KEY = env.API2CART_API_KEY;

const stores = await listConnectedStores();
console.log("Connected stores:", stores);

if (stores[0]?.slug) {
  const result = await syncShoppingCart(stores[0].slug);
  console.log("Sync result:", {
    source: result.source,
    storeUrl: result.storeUrl,
    storeName: result.storeName,
    cartId: result.cartId,
    cartCount: result.carts.length,
    latestCart: result.carts[0]
      ? {
          customerName: result.carts[0].customerName,
          email: result.carts[0].email,
          subtotal: result.carts[0].subtotal,
          basketUrl: result.carts[0].basketUrl,
          items: result.carts[0].items.map((i) => ({ name: i.name, price: i.price, imageUrl: i.imageUrl }))
        }
      : null,
    error: result.error
  });
}
