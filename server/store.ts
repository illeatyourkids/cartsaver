import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { CartRecord } from "../src/types/cart.ts";

const root = process.cwd();
const dataDir = path.join(root, ".data");
const file = path.join(dataDir, "carts.json");

type StoreFile = { carts: CartRecord[] };

function load(): StoreFile {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as StoreFile;
  } catch {
    return { carts: [] };
  }
}

function save(data: StoreFile) {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2));
}

export function getCart(id: string): CartRecord | null {
  return load().carts.find((c) => c.id === id) ?? null;
}

export function listCarts(): CartRecord[] {
  return load().carts;
}

export function putCart(cart: CartRecord): CartRecord {
  const data = load();
  const idx = data.carts.findIndex((c) => c.id === cart.id);
  if (idx >= 0) data.carts[idx] = cart;
  else data.carts.unshift(cart);
  save(data);
  return cart;
}

export function markLaunched(id: string): CartRecord | null {
  const cart = getCart(id);
  if (!cart) return null;
  return putCart({ ...cart, launchedAt: new Date().toISOString() });
}
