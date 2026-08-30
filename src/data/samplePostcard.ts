import type { PostcardView } from "../types/cart";

const item = (name: string, imageUrl: string, price: number) => ({
  name,
  imageUrl,
  quantity: 1,
  price
});

export const SAMPLE_POSTCARD: PostcardView = {
  address: "",
  qrHref: "https://www.brooklinen.com/cart",
  qrImageUrl: "/sample/brooklinen-qr.png",
  qrImageUrlBack: "/sample/brooklinen-qr-back.png",
  cart: {
    id: "sample-brooklinen",
    title: "Don't lose your cart. Save 20%, Use Code HOME",
    couponcode: "HOME",
    discount: 20,
    minimum: 0,
    maxdiscount: 25,
    logourl: "/sample/brooklinen-logo.svg",
    storeKey: null,
    salePrice: 342,
    originalPrice: 428,
    createdAt: "",
    payload: {
      customerName: "Alex Morgan",
      email: "alex@example.com",
      basketUrl: "https://www.brooklinen.com/cart",
      items: [
        item("Luxe Sateen sheets", "/sample/item-sheets.jpg", 179),
        item("Waffle bundle", "/sample/item-waffle.jpg", 148),
        item("Bath set", "/sample/item-bath.jpg", 101)
      ],
      subtotal: 428,
      itemCount: 4
    }
  }
};
