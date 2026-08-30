import type { CartPayload } from "../src/types/cart.ts";

const item = (name: string, price: number, imageUrl: string) => ({
  name,
  imageUrl,
  quantity: 1,
  price
});

export const FIXTURE_PAYLOAD: CartPayload = {
  customerName: "Alex Morgan",
  email: "alex@example.com",
  basketUrl: "https://www.brooklinen.com/cart",
  items: [
    item("Luxe Sateen sheets", 179, "/sample/item-sheets.jpg"),
    item("Waffle bundle", 148, "/sample/item-waffle.jpg"),
    item("Bath set", 101, "/sample/item-bath.jpg")
  ],
  subtotal: 428,
  itemCount: 4
};

export const DEFAULT_OFFER = {
  title: "Don't lose your cart. Save 30%, Use Code CART30",
  couponcode: "CART30",
  discount: 30,
  minimum: 50,
  maxdiscount: 25,
  logourl: "/placeholder-logo.svg"
};
