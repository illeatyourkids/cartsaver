import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import type { ActiveAccount, AccountUpsert } from "./types/account.ts";

const file = path.join(process.cwd(), ".data", "accounts.json");

type StoreFile = { accounts: ActiveAccount[] };

function load(): StoreFile {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as StoreFile;
  } catch {
    return { accounts: [] };
  }
}

function save(data: StoreFile) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2));
}

export function listAccounts(): ActiveAccount[] {
  return load().accounts;
}

export function listActiveAccounts(): ActiveAccount[] {
  return load().accounts.filter((a) => a.active);
}

export function getAccount(id: string): ActiveAccount | null {
  return load().accounts.find((a) => a.id === id) ?? null;
}

export function getAccountByStoreKey(storeKey: string): ActiveAccount | null {
  return load().accounts.find((a) => a.storeKey === storeKey) ?? null;
}

export function getAccountByThanksToken(token: string): ActiveAccount | null {
  const want = token.trim();
  if (!want) return null;
  return load().accounts.find((a) => a.thanksToken === want) ?? null;
}

export type PublicAccount = Omit<ActiveAccount, "thanksToken">;

export function toPublicAccount(account: ActiveAccount): PublicAccount {
  const { thanksToken: _token, ...rest } = account;
  return rest;
}

export type AccountSettingsPatch = {
  active?: boolean;
  title?: string;
  couponcode?: string;
  discount?: number;
  minimum?: number;
  maxdiscount?: number;
  logourl?: string;
  brandColor?: string;
  storeKey?: string;
  cartSlug?: ActiveAccount["cartSlug"];
  cartId?: string;
  storeUrl?: string;
  storeName?: string;
};

export function updateAccountByThanksToken(
  token: string,
  patch: AccountSettingsPatch
): ActiveAccount | null {
  const data = load();
  const idx = data.accounts.findIndex((a) => a.thanksToken === token.trim());
  if (idx < 0) return null;

  const existing = data.accounts[idx];
  const now = new Date().toISOString();
  const turningOn = patch.active === true && !existing.active;

  const next: ActiveAccount = {
    ...existing,
    title: patch.title !== undefined ? patch.title.trim() : existing.title,
    couponcode: patch.couponcode !== undefined ? patch.couponcode.trim() : existing.couponcode,
    discount: patch.discount !== undefined ? Number(patch.discount) || 0 : existing.discount,
    minimum: patch.minimum !== undefined ? Number(patch.minimum) || 0 : existing.minimum,
    maxdiscount: patch.maxdiscount !== undefined ? Number(patch.maxdiscount) || 0 : existing.maxdiscount,
    logourl: patch.logourl !== undefined ? patch.logourl.trim() : existing.logourl,
    brandColor:
      patch.brandColor !== undefined ? patch.brandColor.trim() || undefined : existing.brandColor,
    storeKey: patch.storeKey !== undefined ? patch.storeKey : existing.storeKey,
    cartSlug: patch.cartSlug !== undefined ? patch.cartSlug : existing.cartSlug,
    cartId: patch.cartId !== undefined ? patch.cartId : existing.cartId,
    storeUrl: patch.storeUrl !== undefined ? patch.storeUrl : existing.storeUrl,
    storeName: patch.storeName !== undefined ? patch.storeName.trim() : existing.storeName,
    active: patch.active !== undefined ? patch.active : existing.active,
    activatedAt: turningOn ? now : patch.active === false ? existing.activatedAt : existing.activatedAt
  };

  data.accounts[idx] = next;
  save(data);
  return next;
}

export function upsertAccount(input: AccountUpsert): ActiveAccount {
  const data = load();
  const now = new Date().toISOString();
  const existing = input.id
    ? data.accounts.find((a) => a.id === input.id)
    : data.accounts.find((a) => a.thanksToken === input.thanksToken.trim()) ||
      data.accounts.find((a) => a.storeKey === input.storeKey);

  const next: ActiveAccount = {
    id: existing?.id || input.id || randomBytes(8).toString("hex"),
    thanksToken: input.thanksToken.trim(),
    storeKey: input.storeKey,
    cartSlug: input.cartSlug,
    cartId: input.cartId,
    storeUrl: input.storeUrl,
    storeName: input.storeName,
    templateCartId: input.templateCartId,
    title: input.title.trim(),
    couponcode: input.couponcode.trim(),
    discount: Number(input.discount) || 0,
    minimum: Number(input.minimum) || 0,
    maxdiscount: Number(input.maxdiscount) || 0,
    logourl: input.logourl.trim(),
    brandColor: input.brandColor?.trim() || undefined,
    active: input.active ?? existing?.active ?? true,
    createdAt: existing?.createdAt || now,
    activatedAt: input.active === false ? existing?.activatedAt ?? null : now,
    lastCronAt: existing?.lastCronAt ?? null
  };

  const idx = data.accounts.findIndex((a) => a.id === next.id);
  if (idx >= 0) data.accounts[idx] = next;
  else data.accounts.unshift(next);
  save(data);
  return next;
}

export function touchAccountCron(id: string): ActiveAccount | null {
  const data = load();
  const idx = data.accounts.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  data.accounts[idx] = {
    ...data.accounts[idx],
    lastCronAt: new Date().toISOString()
  };
  save(data);
  return data.accounts[idx];
}

export function deactivateAccount(id: string): ActiveAccount | null {
  const data = load();
  const idx = data.accounts.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  data.accounts[idx] = { ...data.accounts[idx], active: false };
  save(data);
  return data.accounts[idx];
}
