import type { MeResponse } from "$lib/shared/jwt";
import { localStore } from "./store.svelte";

export const token = localStore<string | null>("token", null);
export const refresh = localStore<string | null>("refresh", null);
// The admin's own tokens, parked while impersonating another user.
export const impersonator = localStore<{ token: string | null; refresh: string | null } | null>(
  "impersonator",
  null,
);
export const userState = $state<{ data: MeResponse | null; tokenInvalid: boolean }>({
  data: null,
  tokenInvalid: false,
});
