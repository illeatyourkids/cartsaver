const API = "https://api.api2cart.com/v1.1";

export type A2CResponse<T = unknown> = {
  return_code?: number;
  return_message?: string;
  result?: T;
};

export class A2CError extends Error {
  code: number;

  constructor(code: number, message: string) {
    super(message);
    this.name = "A2CError";
    this.code = code;
  }
}

function apiKey() {
  return process.env.API2CART_API_KEY?.trim() || "";
}

export function isA2CConfigured() {
  return Boolean(apiKey());
}

function parseJson<T>(raw: Record<string, unknown>): A2CResponse<T> {
  return raw as A2CResponse<T>;
}

function failIfNeeded<T>(json: A2CResponse<T>, context: string): T {
  const code = json.return_code ?? -1;
  if (code !== 0) {
    const detail = json.return_message?.trim();
    throw new A2CError(code, detail || `${context} failed (code ${code}).`);
  }
  return json.result as T;
}

export async function a2cAccount<T>(
  method: string,
  extra: Record<string, string> = {}
): Promise<T> {
  const key = apiKey();
  if (!key) throw new A2CError(-1, "Store sync is not configured.");

  const u = new URL(`${API}/${method}`);
  u.searchParams.set("api_key", key);
  for (const [k, v] of Object.entries(extra)) {
    if (v !== "") u.searchParams.set(k, v);
  }

  let res: Response;
  try {
    res = await fetch(u, { signal: AbortSignal.timeout(15000) });
  } catch {
    throw new A2CError(-1, "Could not reach your store connection.");
  }

  const json = parseJson<T>((await res.json()) as Record<string, unknown>);
  return failIfNeeded(json, method.replace(/\.json$/, ""));
}

export async function a2cStore<T>(
  method: string,
  storeKey: string,
  extra: Record<string, string> = {}
): Promise<T> {
  const key = apiKey();
  if (!key) throw new A2CError(-1, "Store sync is not configured.");
  if (!storeKey) throw new A2CError(-1, "Store key is required.");

  const u = new URL(`${API}/${method}`);
  u.searchParams.set("api_key", key);
  u.searchParams.set("store_key", storeKey);
  for (const [k, v] of Object.entries(extra)) {
    if (v !== "") u.searchParams.set(k, v);
  }

  let res: Response;
  try {
    res = await fetch(u, { signal: AbortSignal.timeout(15000) });
  } catch {
    throw new A2CError(-1, "Could not reach your connected store.");
  }

  const json = parseJson<T>((await res.json()) as Record<string, unknown>);
  return failIfNeeded(json, method.replace(/\.json$/, ""));
}
