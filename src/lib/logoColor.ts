export const DEFAULT_CARD_INK = "#003b95";

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

function parseHex(hex: string): [number, number, number] | null {
  const m = hex.replace("#", "").trim();
  if (m.length === 3) {
    return [parseInt(m[0] + m[0], 16), parseInt(m[1] + m[1], 16), parseInt(m[2] + m[2], 16)];
  }
  if (m.length !== 6 || /[^0-9a-f]/i.test(m)) return null;
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}

function toHex(r: number, g: number, b: number) {
  return (
    "#" +
    [r, g, b]
      .map((n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0"))
      .join("")
  );
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
  ];
}

export function mixHex(a: string, b: string, t: number) {
  const A = parseHex(a);
  const B = parseHex(b);
  if (!A || !B) return a;
  return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}

export function inkFromSample(hex: string) {
  const rgb = parseHex(hex);
  if (!rgb) return DEFAULT_CARD_INK;
  const { h, s, l } = rgbToHsl(...rgb);
  const [r, g, b] = hslToRgb(h, clamp(s, 0.38, 0.88), clamp(l, 0.16, 0.38));
  return toHex(r, g, b);
}

export function cardPalette(ink = DEFAULT_CARD_INK) {
  const safe = parseHex(ink) ? ink : DEFAULT_CARD_INK;
  return {
    ink: safe,
    wash: mixHex(safe, "#ffffff", 0.88),
    line: mixHex(safe, "#ffffff", 0.74),
    onInk: mixHex(safe, "#ffffff", 0.52)
  };
}

export function cardThemeVars(ink?: string | null): Record<string, string> {
  const p = cardPalette(ink || DEFAULT_CARD_INK);
  return {
    "--card-ink": p.ink,
    "--card-wash": p.wash,
    "--card-line": p.line,
    "--card-on-ink": p.onInk
  };
}

export function primaryColorFromImage(img: CanvasImageSource & { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number }): string | null {
  const w = img.naturalWidth || img.width || 0;
  const h = img.naturalHeight || img.height || 0;
  if (!w || !h) return null;
  const canvas = document.createElement("canvas");
  const max = 96;
  const scale = Math.min(1, max / Math.max(w, h));
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  try {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  } catch {
    return null;
  }
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  } catch {
    return null;
  }

  const buckets = new Map<number, { w: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 40) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const hsl = rgbToHsl(r, g, b);
    if (hsl.s < 0.18 || hsl.l > 0.92 || hsl.l < 0.08) continue;
    const key = Math.round(hsl.h / 10) % 36;
    const weight = hsl.s * (1 - Math.abs(hsl.l - 0.42)) * (a / 255);
    const cur = buckets.get(key) || { w: 0, r: 0, g: 0, b: 0 };
    cur.w += weight;
    cur.r += r * weight;
    cur.g += g * weight;
    cur.b += b * weight;
    buckets.set(key, cur);
  }

  let best: { w: number; r: number; g: number; b: number } | null = null;
  for (const v of buckets.values()) {
    if (!best || v.w > best.w) best = v;
  }
  if (!best || best.w < 0.5) return null;
  return inkFromSample(toHex(best.r / best.w, best.g / best.w, best.b / best.w));
}
