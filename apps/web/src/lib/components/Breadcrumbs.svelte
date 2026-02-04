<script lang="ts">
  import Icon from "@iconify/svelte";

  interface BreadcrumbItem {
    label: string;
    href?: string;
    icon: string;
  }

  interface Props {
    items: BreadcrumbItem[];
  }

  let { items }: Props = $props();
</script>

<div class="breadcrumbs mb-6 text-sm">
  <ul class="flex-wrap">
    {#each items as item (item.label)}
      <li>
        {#if item.href}
          <a href={item.href}>
            <Icon icon={item.icon} class="h-4 w-4" />
            {item.label}
          </a>
        {:else}
          <span class="inline-flex items-center gap-2">
            <Icon icon={item.icon} class="h-4 w-4" />
            {item.label}
          </span>
        {/if}
      </li>
    {/each}
  </ul>
</div>
