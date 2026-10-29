<script lang="ts">
  import { resolve } from "$app/paths";
  import { user } from "#lib/stores/user.svelte";
  import Footer from "./_/Footer.svelte";
  import Navbar from "./_/Navbar.svelte";
  import Sidebar from "./_/Sidebar.svelte";
  import type { SidebarItem } from "./_/lib";

  let { children } = $props();

  const currentUser = $derived(user());

  const items: SidebarItem[] = $derived([
    { _type: "single", icon: "heroicons:home", label: "Dashboard", href: "/" },
    { _type: "single", icon: "heroicons:document-text", label: "Posts", href: resolve("posts/") },
    ...(currentUser.role === "ADMIN"
      ? ([
          { _type: "divider" },
          { _type: "single", icon: "heroicons:users", label: "Users", href: resolve("users/") },
          {
            _type: "single",
            icon: "heroicons:cog-6-tooth",
            label: "Settings",
            href: resolve("settings/"),
          },
        ] as const)
      : []),
    { _type: "divider" },
    { _type: "single", icon: "heroicons:user", label: "My Profile", href: resolve("profile/") },
  ]);
</script>

<div class="drawer lg:drawer-open">
  <input id="app-drawer" type="checkbox" class="drawer-toggle" />
  <div
    class="drawer-content bg-[color-mix(in_oklab,var(--color-primary)_6%,var(--color-base-100))]"
  >
    <div class="sticky top-0 z-40">
      <Navbar />
    </div>
    <main class="min-h-screen">
      {@render children()}
    </main>
    <Footer />
  </div>
  <div class="drawer-side z-50 lg:shadow-xl">
    <Sidebar {items} />
  </div>
</div>
