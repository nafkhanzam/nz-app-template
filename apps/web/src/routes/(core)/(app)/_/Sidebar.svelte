<script lang="ts">
  import { page } from "$app/state";
  import Icon from "@iconify/svelte";
  import { themeStore } from "#lib/stores/theme.svelte";
  import { user } from "#lib/stores/user.svelte";
  import type { SidebarItem } from "./lib";
  import { stopImpersonating } from "./stop-impersonating";

  const { items }: { items: SidebarItem[] } = $props();

  const isDanger = (item: SidebarItem) => item._type === "single" && item.danger;
  const mainItems = $derived(items.filter((item) => !isDanger(item)));
  const dangerItems = $derived(items.filter(isDanger));

  function isActive(href: string): boolean {
    return href === "/" ? page.url.pathname === "/" : page.url.pathname.startsWith(href);
  }
</script>

<label for="app-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
<ul class="menu min-h-full w-64 border-r border-base-content/10 bg-base-100 p-4 text-base-content">
  {@render entries(mainItems)}
  <li class="mb-1">
    <button onclick={() => themeStore.toggle()}>
      <Icon
        icon={themeStore.theme === "dark" ? "heroicons:moon" : "heroicons:sun"}
        class="h-5 w-5"
      />
      {themeStore.theme === "dark" ? "Dark" : "Light"} theme
    </button>
  </li>
  {#if user().impersonation}
    <li class="mb-1">
      <button onclick={stopImpersonating}>
        <Icon icon="heroicons:arrow-uturn-left" class="h-5 w-5" />
        Stop impersonating
      </button>
    </li>
  {/if}
  <!-- Danger items (logout) are pinned to the very bottom. -->
  <div class="mt-auto"></div>
  {@render entries(dangerItems)}
</ul>

{#snippet entries(list: SidebarItem[])}
  {#each list as item, i (item._type === "divider" ? `divider-${i}` : item.href)}
    {#if item._type === "single"}
      <li class="mb-1">
        <a
          href={item.href}
          onclick={(e) => {
            if (!item.onclick) return;
            e.preventDefault();
            item.onclick();
          }}
          class={isActive(item.href)
            ? "bg-primary text-primary-content"
            : item.danger
              ? "text-error"
              : ""}
        >
          {#if item.icon}
            <Icon icon={item.icon} class="h-5 w-5" />
          {/if}
          {item.label}
        </a>
      </li>
    {:else}
      <div class="divider my-1"></div>
    {/if}
  {/each}
{/snippet}
