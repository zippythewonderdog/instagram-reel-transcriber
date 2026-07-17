import { AppError } from "../types";

const ALLOWED_HOSTS = new Set([
  "instagram.com",
  "www.instagram.com",
  "m.instagram.com"
]);

export function validateInstagramUrl(value: string): string {
  let parsed: URL;

  try {
    parsed = new URL(value.trim());
  } catch {
    throw new AppError("Enter a valid Instagram URL.", 400, "INVALID_URL");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new AppError("Instagram URL must use http or https.", 400, "INVALID_URL");
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new AppError("Only public Instagram URLs are supported.", 400, "UNSUPPORTED_URL");
  }

  const isLikelyMediaPath = /^\/(reel|reels|p|tv)\//i.test(parsed.pathname);
  if (!isLikelyMediaPath) {
    throw new AppError("Paste a public Instagram Reel, post, or video URL.", 400, "UNSUPPORTED_URL");
  }

  return parsed.toString();
}
