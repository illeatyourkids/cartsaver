import QRCode from "qrcode";

function looksLikeImageUrl(value: string) {
  if (!/^https?:\/\//i.test(value)) return false;
  return /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(value) || /qr/i.test(value);
}

export async function resolveQrImage(
  qrCode: string,
  fallbackUrl: string,
  ink = "#003B95"
): Promise<string> {
  const value = qrCode.trim();
  if (value && looksLikeImageUrl(value)) return value;
  const dest = value || fallbackUrl || "https://thanks.io";
  const dark = /^#[0-9a-f]{6}$/i.test(ink) ? ink : "#003B95";
  return QRCode.toDataURL(dest, {
    margin: 1,
    width: 512,
    color: { dark, light: "#FFFFFF" }
  });
}
