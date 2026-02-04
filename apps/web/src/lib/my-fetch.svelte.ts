import { trpc_ } from "./client.svelte";
import { refresh, token, userState } from "./stores/token.svelte";

// Mutex for token refresh to prevent race conditions
let refreshPromise: Promise<boolean> | null = null;

export class AuthError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = "AuthError";
  }
}

async function doRefreshToken(): Promise<boolean> {
  if (!refresh.value) {
    return false;
  }
  try {
    const { accessToken, refreshToken } = await trpc_.refresh.mutate({
      refreshToken: refresh.value,
    });
    token.value = accessToken;
    refresh.value = refreshToken;
    return true;
  } catch (error) {
    console.error("Token refresh failed:", error);
    return false;
  }
}

async function refreshTokenWithMutex(): Promise<boolean> {
  // If a refresh is already in progress, wait for it
  if (refreshPromise) {
    return refreshPromise;
  }

  // Start a new refresh
  refreshPromise = doRefreshToken().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

function clearAuthState(err?: unknown): AuthError {
  token.value = null;
  refresh.value = null;
  userState.tokenInvalid = true;
  return new AuthError("Token expired.", err);
}

export const myFetchNoRefresh = async (
  url: URL | RequestInfo,
  options?: RequestInit,
): Promise<Response> => {
  options = options ?? {};
  options.headers = {
    ...options.headers,
  };
  if (token.value) {
    options.headers = {
      ...options.headers,
      Authorization: token.value,
    };
  }
  const res = await fetch(url, options);
  return res;
};

export const myFetch = async (
  url: URL | RequestInfo,
  options?: RequestInit,
  refreshed = false,
): Promise<Response> => {
  const res = await myFetchNoRefresh(url, options);
  if (res.status === 401 && !refreshed) {
    const success = await refreshTokenWithMutex();
    if (success) {
      // Retry original request with new token
      return myFetch(url, options, true);
    }
    throw clearAuthState();
  }
  return res;
};
