import type { IncomingMessage } from "node:http";

export function thanksTokenFromRequest(req: IncomingMessage, url: URL) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  return (url.searchParams.get("thanksToken") || url.searchParams.get("token") || "").trim();
}
