<script lang="ts">
  import Icon from "@iconify/svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
</script>

<button
  type="button"
  class="btn btn-ghost btn-circle"
  onclick={() => themeStore.toggle()}
  aria-label="Toggle theme"
>
  {#if themeStore.theme === "dark"}
    <Icon icon="heroicons:moon" class="h-5 w-5" />
  {:else}
    <Icon icon="heroicons:sun" class="h-5 w-5" />
  {/if}
</button>
