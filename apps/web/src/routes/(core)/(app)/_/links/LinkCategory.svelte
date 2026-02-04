<script lang="ts">
  import Icon from "@iconify/svelte";
  import LinkCard from "./LinkCard.svelte";

  interface LinkItem {
    title: string;
    url: string;
  }

  interface Props {
    name: string;
    icon: string;
    color: string;
    links: LinkItem[];
  }

  let { name, icon, color, links }: Props = $props();
</script>

<div>
  <div class="mb-4 flex items-center gap-3">
    <div class="rounded-lg p-2 {color} text-base-100">
      <Icon {icon} class="h-6 w-6" />
    </div>
    <h2 class="text-lg font-semibold">{name}</h2>
  </div>

  <div class="grid gap-4 md:grid-cols-2">
    {#each links as link (link.url)}
      <LinkCard {...link} />
    {/each}
  </div>
</div>
