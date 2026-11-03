<script lang="ts">
  import { resolve } from "$app/paths";
  import Icon from "@iconify/svelte";
  import favicon from "#lib/assets/favicon.svg";
  import { constants } from "../../../_/constants";
  import { type NavSingle } from "./lib";
  import ThemeToggle from "#lib/components/ThemeToggle.svelte";
  import { user } from "#lib/stores/user.svelte";
  import { confirmLogout } from "./confirm-logout";
  import { stopImpersonating } from "./stop-impersonating";
  import { trpc_ } from "#lib/client.svelte";
  import { createQuery } from "@tanstack/svelte-query";

  // Props
  const { brandName } = constants;

  // Configuration
  const brandHref = "/";

  // Same key as the root MaintenanceGate, so they share one cached, polled request.
  // Only admins get past the gate during maintenance, so this is their reminder.
  const maintenanceQ = createQuery(() => ({
    queryKey: ["maintenance"],
    queryFn: () => trpc_.maintenance.query(),
    refetchInterval: 30_000,
  }));

  // Account dropdown items
  const accountDropdownItems: NavSingle[] = [
    { _type: "single", label: "Profile", href: resolve("profile/"), icon: "heroicons:user" },
    {
      _type: "single",
      label: "Logout",
      href: resolve("logout/"),
      icon: "heroicons:arrow-right-start-on-rectangle",
      danger: true,
      onclick: confirmLogout,
    },
  ];
</script>

<div class="border-b border-base-content/10 bg-base-100 text-base-content shadow-lg">
  <div class="navbar px-4">
    <div class="navbar-start gap-2">
      <label for="app-drawer" aria-label="open sidebar" class="btn btn-ghost btn-square lg:hidden">
        <Icon icon="heroicons:bars-3" class="h-5 w-5" />
      </label>
      <a href={brandHref} class="btn gap-2 px-3 text-xl btn-ghost">
        <img src={favicon} alt="" class="h-6 w-6" />
        {brandName}
      </a>
    </div>

    <div class="navbar-end gap-2">
      {#if maintenanceQ.data?.enabled}
        <a
          href={resolve("settings/")}
          class="badge gap-1 badge-warning"
          title="Maintenance mode is on. Only admins can use the app."
        >
          <Icon icon="heroicons:wrench-screwdriver" class="h-4 w-4" />
          <span class="hidden sm:inline">Maintenance</span>
        </a>
      {/if}

      <!-- Theme toggle button -->
      <ThemeToggle />

      <!-- Account dropdown -->
      <div class="dropdown dropdown-end">
        <div tabindex="0" role="button" class="btn relative btn-ghost">
          {#if user().role !== "USER"}
            <span class="absolute top-0 right-0 badge badge-xs badge-primary">{user().role}</span>
          {/if}
          {#if user().image}
            <div class="avatar">
              <div class="w-6 rounded-full">
                <img src={user().image} alt={user().name} />
              </div>
            </div>
          {:else}
            <Icon icon="heroicons:user-circle" class="h-5 w-5" />
          {/if}
          <div class="hidden sm:inline">
            <span>{user().name}</span>
          </div>
        </div>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <ul
          tabindex="0"
          class="dropdown-content menu z-1 w-52 rounded-box bg-base-100 p-2 text-base-content shadow"
        >
          {#each accountDropdownItems as item (item.label)}
            <li>
              <a
                href={item.href}
                class={item.danger ? "text-error" : ""}
                onclick={(e) => {
                  if (!item.onclick) return;
                  e.preventDefault();
                  item.onclick();
                }}
              >
                {#if item.icon}
                  <Icon icon={item.icon} class="h-4 w-4" />
                {/if}
                {item.label}
              </a>
            </li>
          {/each}
          {#if user().impersonation}
            <li>
              <button onclick={stopImpersonating}>
                <Icon icon="heroicons:arrow-uturn-left" class="h-4 w-4" />
                Stop impersonating
              </button>
            </li>
          {/if}
        </ul>
      </div>
    </div>
  </div>
</div>
