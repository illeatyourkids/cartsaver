const STORAGE_KEY = "thanksToken";

export function readThanksTokenFromSearch(search: string) {
  const params = new URLSearchParams(search);
  return (params.get("thanksToken") || params.get("token") || "").trim();
}

export function persistThanksToken(token: string) {
  if (token) sessionStorage.setItem(STORAGE_KEY, token);
}

export function getThanksToken() {
  return sessionStorage.getItem(STORAGE_KEY)?.trim() || "";
}

export function thanksAuthHeaders(token?: string): HeadersInit {
  const value = (token || getThanksToken()).trim();
  if (!value) return {};
  return { Authorization: `Bearer ${value}` };
}

export function withThanksToken(path: string, token?: string) {
  const value = (token || getThanksToken()).trim();
  if (!value) return path;
  const url = new URL(path, window.location.origin);
  url.searchParams.set("thanksToken", value);
  return `${url.pathname}${url.search}`;
}
