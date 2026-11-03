import { toast } from "#lib";
import { trpc } from "#lib/client.svelte";
import { refresh, token } from "#lib/stores/token.svelte";

export const stopImpersonating = async () => {
  if (!refresh.value) return;
  try {
    const tokens = await trpc.stopImpersonating.mutate({ refreshToken: refresh.value });
    token.value = tokens.accessToken;
    refresh.value = tokens.refreshToken;
    // Full reload so nothing cached for the impersonated user lingers.
    window.location.reload();
  } catch (error) {
    console.error("Error stopping impersonation:", error);
    toast.error("Failed to stop impersonating");
  }
};
