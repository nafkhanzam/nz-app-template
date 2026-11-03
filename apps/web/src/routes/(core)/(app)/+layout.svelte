<script lang="ts">
  import { resolve } from "$app/paths";
  import { user } from "#lib/stores/user.svelte";
  import Footer from "./_/Footer.svelte";
  import Navbar from "./_/Navbar.svelte";
  import Sidebar from "./_/Sidebar.svelte";
  import type { SidebarItem } from "./_/lib";
  import { confirmLogout } from "./_/confirm-logout";

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
    { _type: "single", icon: "heroicons:bug-ant", label: "Reports", href: resolve("reports/") },
    { _type: "divider" },
    { _type: "single", icon: "heroicons:user", label: "My Profile", href: resolve("profile/") },
    {
      _type: "single",
      icon: "heroicons:arrow-right-start-on-rectangle",
      label: "Logout",
      href: resolve("logout/"),
      danger: true,
      onclick: confirmLogout,
    },
  ]);
</script>

<!-- Navbar spans the full width above the drawer; its hamburger label toggles #app-drawer. -->
<div class="sticky top-0 z-40 lg:z-60">
  <Navbar />
</div>
<div class="drawer lg:drawer-open">
  <input id="app-drawer" type="checkbox" class="drawer-toggle" />
  <div
    class="drawer-content bg-[color-mix(in_oklab,var(--color-primary)_6%,var(--color-base-100))]"
  >
    <main class="min-h-[calc(100vh-4rem)]">
      {@render children()}
    </main>
    <Footer />
  </div>
  <!-- On desktop the sidebar is sticky below the 4rem navbar instead of from the viewport top. -->
  <div class="drawer-side z-50 lg:top-16 lg:h-[calc(100dvh-4rem)]">
    <Sidebar {items} />
  </div>
</div>
