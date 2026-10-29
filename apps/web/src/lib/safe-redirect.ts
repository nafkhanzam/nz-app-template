import { trpc_ } from "./client.svelte";

let originsPromise: Promise<string[]> | null = null;

const getAllowedOrigins = () => {
  originsPromise ??= trpc_.allowedRedirectOrigins.query().catch(() => {
    originsPromise = null;
    return [];
  });
  return originsPromise;
};

/**
 * Allows same-origin absolute paths ("/x") and absolute http(s) URLs whose origin
 * is whitelisted in AppConfig. Everything else ("//host", "/\\host", other origins,
 * javascript: ...) falls back.
 */
export const safeRedirect = async (
  value: string | null | undefined,
  fallback = "/",
): Promise<string> => {
  if (!value) {
    return fallback;
  }
  if (value.startsWith("/")) {
    return value.startsWith("//") || value.startsWith("/\\") ? fallback : value;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return fallback;
    }
    return (await getAllowedOrigins()).includes(url.origin) ? value : fallback;
  } catch {
    return fallback;
  }
};
