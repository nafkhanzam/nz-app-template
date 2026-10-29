const KEY = "oidc_nonce";

/** Create a nonce bound to this browser session; echoed back via OIDC `state`. */
export const createOIDCNonce = (): string => {
  const nonce = crypto.randomUUID();
  sessionStorage.setItem(KEY, nonce);
  return nonce;
};

/** Returns true only if `nonce` matches the stored one. Always clears it (single use). */
export const consumeOIDCNonce = (nonce: string): boolean => {
  const stored = sessionStorage.getItem(KEY);
  sessionStorage.removeItem(KEY);
  return stored !== null && stored === nonce;
};
