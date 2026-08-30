# Abandoned Cart Wizard

Abandoned-cart 6×11 postcard wizard for thanks.io.

`cartsave` stores the cart and offer on a `cartid`. thanks.io fetches `/renderengine` at print time and passes live `address` and `qr_code`.

```
/renderengine?cartid=…&side=front&address=~ADDRESS~&qr_code=~QR_CODE~
```

```bash
npm install
npx playwright install chromium
npm run dev
```

Open http://localhost:5175
