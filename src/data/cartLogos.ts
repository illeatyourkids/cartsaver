export const SUPPORTED_CARTS = [
  { name: "Shopify", file: "shopify.svg", slug: "shopify" },
  { name: "WooCommerce", file: "woocommerce.svg", slug: "woocommerce" },
  { name: "Magento", file: "magento.svg", slug: "magento" },
  { name: "PrestaShop", file: "prestashop.svg", slug: "prestashop" },
  { name: "Shopware", file: "shopware.svg", slug: "shopware" },
  { name: "OpenCart", file: "opencart.svg", slug: "opencart" },
  { name: "CS-Cart", file: "cscart.svg", slug: "cscart" },
  { name: "X-Cart", file: "xcart.svg", slug: "xcart" },
  { name: "Zen Cart", file: "zencart.svg", slug: "zencart" },
  { name: "Salesforce Commerce Cloud", file: "salesforce.svg", slug: "salesforce" },
  { name: "osCommerce", file: "oscommerce.svg", slug: "oscommerce" }
] as const;

export type CartSlug = (typeof SUPPORTED_CARTS)[number]["slug"];

export function cartLogoSrc(file: string) {
  return `/cart-logos/${file}`;
}
