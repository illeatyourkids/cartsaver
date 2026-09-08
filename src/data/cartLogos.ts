export const SUPPORTED_CARTS = [
  { name: "Shopify", file: "shopify.png", slug: "shopify" },
  { name: "WooCommerce", file: "woocommerce.png", slug: "woocommerce" },
  { name: "Magento", file: "magento.png", slug: "magento" },
  { name: "PrestaShop", file: "prestashop.png", slug: "prestashop" },
  { name: "Shopware", file: "shopware.png", slug: "shopware" },
  { name: "OpenCart", file: "opencart.png", slug: "opencart" },
  { name: "CS-Cart", file: "cscart.png", slug: "cscart" },
  { name: "X-Cart", file: "xcart.png", slug: "xcart" },
  { name: "Zen Cart", file: "zencart.png", slug: "zencart" },
  { name: "Salesforce Commerce Cloud", file: "salesforce.png", slug: "salesforce" },
  { name: "osCommerce", file: "oscommerce.png", slug: "oscommerce" }
] as const;

export type CartSlug = (typeof SUPPORTED_CARTS)[number]["slug"];

export function cartLogoSrc(file: string) {
  return `/cart-logos/${file}`;
}

export function cartBySlug(slug: string) {
  return SUPPORTED_CARTS.find((cart) => cart.slug === slug) ?? null;
}
