import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { cartApiPlugin } from "./server/plugin.ts";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  if (env.API2CART_API_KEY) process.env.API2CART_API_KEY = env.API2CART_API_KEY;
  if (env.APP_BASE_URL) process.env.APP_BASE_URL = env.APP_BASE_URL;

  return {
    plugins: [react(), cartApiPlugin()],
    server: {
      port: 5175,
      strictPort: true
    }
  };
});
