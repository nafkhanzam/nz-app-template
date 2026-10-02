<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { token, refresh, userState } from "$lib/stores/token.svelte";
  import { toast } from "$lib";

  onMount(() => {
    // Clear tokens
    token.value = null;
    refresh.value = null;

    // Clear user state
    userState.data = null;
    userState.tokenInvalid = false;

    // Show success message
    toast.success("You have been logged out successfully");

    // Redirect to login page
    goto("/login");
  });
</script>

<div class="min-h-screen flex items-center justify-center bg-base-200">
  <div class="card w-full max-w-md bg-base-100 shadow-2xl">
    <div class="card-body text-center">
      <span class="loading loading-spinner loading-lg"></span>
      <p class="mt-4">Logging out...</p>
    </div>
  </div>
</div>
