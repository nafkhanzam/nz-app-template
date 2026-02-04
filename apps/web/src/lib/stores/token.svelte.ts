import type { MeResponse } from "$lib/shared/jwt";
import { localStore } from "./store.svelte";

export const token = localStore<string | null>("token", null);
export const refresh = localStore<string | null>("refresh", null);
export const userState = $state<{ data: MeResponse | null; tokenInvalid: boolean }>({
  data: null,
  tokenInvalid: false,
});
