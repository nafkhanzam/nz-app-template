<script lang="ts">
  import { resolve } from "$app/paths";
  import { userState } from "#lib/stores/token.svelte";

  let { children } = $props();

  $effect(() => {
    if (userState.tokenInvalid && !userState.data) {
      // console.log(`goto(resolve("/login"));`)
      window.location.href = resolve("/login") + `?redirect=${encodeURIComponent(location.pathname + location.search + location.hash)}`;
    }
  });
</script>

{#if userState.data}
  {@render children()}
{/if}
