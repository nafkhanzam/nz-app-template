<script lang="ts">
  import { trpc } from "#lib/client.svelte";
  import { user } from "#lib/stores/user.svelte";
  import { createQuery } from "@tanstack/svelte-query";
  import Footer from "./_/Footer.svelte";
  import Navbar from "./_/Navbar.svelte";

  let { children } = $props();

  const maintenanceQ = createQuery(() => ({
    queryKey: ["maintenance"],
    queryFn: () => trpc.maintenance.query(),
    refetchInterval: 60_000,
  }));

  const isAdmin = $derived(user().role === "ADMIN");
  const maintenance = $derived(maintenanceQ.data);
  const blocked = $derived(maintenance?.enabled === true && !isAdmin);
</script>

<Navbar />

{#if maintenance?.enabled && isAdmin}
  <div class="alert alert-warning rounded-none">
    Maintenance mode is on. Only admins can use the app.
  </div>
{/if}

<main class="min-h-screen">
  {#if blocked}
    <div class="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 class="text-4xl font-black">Under maintenance</h1>
      <p class="text-base-content/70">
        {maintenance?.message ?? "We're doing some scheduled work. Please check back soon."}
      </p>
      {#if maintenance?.until}
        <p class="text-sm text-base-content/60">
          Expected back: {new Date(maintenance.until).toLocaleString()}
        </p>
      {/if}
    </div>
  {:else}
    {@render children()}
  {/if}
</main>

<Footer />
