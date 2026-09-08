import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import type { CronSendRecord } from "./types/account.ts";

const file = path.join(process.cwd(), ".data", "sends.json");

type StoreFile = { sends: CronSendRecord[] };

function load(): StoreFile {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as StoreFile;
  } catch {
    return { sends: [] };
  }
}

function save(data: StoreFile) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2));
}

export function wasAbandonedOrderSent(storeKey: string, abandonedOrderId: string) {
  return load().sends.some(
    (s) => s.storeKey === storeKey && s.abandonedOrderId === abandonedOrderId && s.status === "sent"
  );
}

export function recordSend(input: Omit<CronSendRecord, "id" | "sentAt">) {
  const data = load();
  const row: CronSendRecord = {
    ...input,
    id: randomBytes(8).toString("hex"),
    sentAt: new Date().toISOString()
  };
  data.sends.unshift(row);
  if (data.sends.length > 5000) data.sends.length = 5000;
  save(data);
  return row;
}

export function listRecentSends(limit = 50) {
  return load().sends.slice(0, limit);
}

function startOfLocalDay(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function startOfLocalWeek(now = new Date()) {
  const day = now.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
}

function startOfLocalMonth(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

function attemptedSend(row: CronSendRecord) {
  return row.status === "sent" || row.status === "failed";
}

function periodTotals(rows: CronSendRecord[], start: number) {
  let sent = 0;
  let attempted = 0;
  for (const row of rows) {
    const at = Date.parse(row.sentAt);
    if (!Number.isFinite(at) || at < start) continue;
    if (!attemptedSend(row)) continue;
    attempted += 1;
    if (row.status === "sent") sent += 1;
  }
  return {
    sent,
    matchRate: attempted === 0 ? null : Math.round((sent / attempted) * 100)
  };
}

export function statsForAccount(accountId: string) {
  const rows = load().sends.filter((s) => s.accountId === accountId);
  const now = new Date();
  const today = periodTotals(rows, startOfLocalDay(now));
  const week = periodTotals(rows, startOfLocalWeek(now));
  const month = periodTotals(rows, startOfLocalMonth(now));
  const all = periodTotals(rows, 0);

  return {
    sentToday: today.sent,
    sentThisWeek: week.sent,
    sentThisMonth: month.sent,
    matchRate: all.matchRate,
    matchRateToday: today.matchRate,
    matchRateThisWeek: week.matchRate,
    matchRateThisMonth: month.matchRate
  };
}

export function cronStats() {
  const sends = load().sends;
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const recent = sends.filter((s) => Date.parse(s.sentAt) >= since);
  return {
    total: sends.length,
    last24h: recent.length,
    sent24h: recent.filter((s) => s.status === "sent").length,
    skipped24h: recent.filter((s) => s.status === "skipped").length,
    failed24h: recent.filter((s) => s.status === "failed").length,
    lastRun: sends[0]?.sentAt ?? null
  };
}
