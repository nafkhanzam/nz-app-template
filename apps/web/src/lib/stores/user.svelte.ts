import type { MeResponse } from "$lib/shared/jwt";
import { userState } from "./token.svelte";

export const user = (): MeResponse =>
  userState.data as MeResponse;
