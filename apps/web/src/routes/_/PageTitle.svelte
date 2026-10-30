<script lang="ts">
  import { constants } from "./constants";

  const { title }: { title: string } = $props();
</script>

<svelte:head>
  <title>{title} | {constants.brandName}</title>
</svelte:head>
