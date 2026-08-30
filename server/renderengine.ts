import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const WIDTH = 3337;
const HEIGHT = 1777;
const cacheDir = path.join(process.cwd(), ".cache", "renders");

let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export function cacheKey(q: {
  cartid: string;
  side: string;
  address: string;
  qr_code: string;
}) {
  return createHash("sha1")
    .update([q.cartid, q.side, q.address, q.qr_code].join("|"))
    .digest("hex");
}

export async function renderenginePng(opts: {
  appBase: string;
  cartid: string;
  side: "front" | "back";
  address: string;
  qr_code: string;
}): Promise<Buffer> {
  await mkdir(cacheDir, { recursive: true });
  const key = cacheKey(opts);
  const file = path.join(cacheDir, `${key}.png`);
  try {
    return await readFile(file);
  } catch {
    /* miss */
  }

  return enqueue(async () => {
    try {
      return await readFile(file);
    } catch {
      /* still miss */
    }
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({
      headless: true,
      args: ["--disable-dev-shm-usage", "--no-sandbox", "--disable-gpu"]
    });
    try {
      const page = await browser.newPage({
        viewport: { width: WIDTH, height: HEIGHT },
        deviceScaleFactor: 1
      });
      const u = new URL(`/print/${encodeURIComponent(opts.cartid)}`, opts.appBase);
      u.searchParams.set("side", opts.side);
      if (opts.address) u.searchParams.set("address", opts.address);
      if (opts.qr_code) u.searchParams.set("qr_code", opts.qr_code);
      await page.goto(u.toString(), { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForSelector('.print-postcard[data-print-ready="1"]', { timeout: 45_000 });
      const buf = Buffer.from(
        await page.locator(".print-postcard").screenshot({ type: "png", omitBackground: false })
      );
      await writeFile(file, buf);
      return buf;
    } finally {
      await browser.close().catch(() => undefined);
    }
  });
}
