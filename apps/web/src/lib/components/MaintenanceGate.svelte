<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { trpc_ } from "#lib/client.svelte";
  import Loading from "#lib/components/Loading.svelte";
  import LandingBackground from "#lib/components/LandingBackground.svelte";
  import { token, userState } from "#lib/stores/token.svelte";
  import { createQuery } from "@tanstack/svelte-query";
  import Icon from "@iconify/svelte";
  import type { Snippet } from "svelte";
  import { constants } from "../../routes/_/constants";

  let { children }: { children: Snippet } = $props();

  const { brandName } = constants;

  // Polled so the page lifts by itself once maintenance ends.
  const maintenanceQ = createQuery(() => ({
    queryKey: ["maintenance"],
    queryFn: () => trpc_.maintenance.query(),
    refetchInterval: 30_000,
  }));

  const maintenance = $derived(maintenanceQ.data);
  // Admins stay in (to switch it off). The login screen is also behind the page;
  // admins reach it through the page's "Admin login" link (?admin). /auth stays open
  // for the OIDC callback.
  const isAdmin = $derived(userState.data?.role === "ADMIN");
  const onAuthRoute = $derived(
    /^\/auth(\/|$)/.test(page.url.pathname) ||
      (/^\/login(\/|$)/.test(page.url.pathname) && page.url.searchParams.has("admin")),
  );
  // Signed in but the profile (so the role) hasn't arrived yet.
  const profileLoading = $derived(!!token.value && !userState.data && !userState.tokenInvalid);
  const exempt = $derived(isAdmin || onAuthRoute);
  // A failed check (e.g. backend down) falls through to the app, which shows its own errors.
  const loading = $derived(
    !exempt && (maintenanceQ.isPending || (profileLoading && maintenance?.enabled === true)),
  );
  const blocked = $derived(maintenance?.enabled === true && !exempt && !profileLoading);
</script>

{#if loading}
  <div class="flex min-h-screen items-center justify-center">
    <Loading />
  </div>
{:else if blocked && maintenance?.enabled}
  <LandingBackground>
    <div
      class="relative mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 py-12"
    >
      <div
        class="mb-6 inline-flex items-center gap-2 rounded-full border border-base-content/10 bg-base-100/60 px-4 py-1.5 text-sm font-medium backdrop-blur"
      >
        <Icon icon="heroicons:academic-cap" class="h-4 w-4 text-secondary" />
        {brandName}
      </div>

      <div
        class="w-full rounded-3xl border border-base-content/10 bg-base-100/80 p-8 text-center shadow-2xl backdrop-blur-xl"
      >
        <span
          class="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15"
        >
          <Icon icon="mdi:wrench-clock" class="h-8 w-8 text-primary" />
        </span>
        <h1 class="text-3xl font-black tracking-tight sm:text-4xl">
          Under <span
            class="bg-linear-to-r from-primary via-accent to-secondary bg-clip-text text-transparent"
            >maintenance</span
          >
        </h1>
        <p class="mt-4 whitespace-pre-line text-base-content/70">
          {maintenance.message ?? "We're doing some scheduled work. Please check back soon."}
        </p>
        {#if maintenance.until}
          <p
            class="mt-5 inline-flex items-center gap-2 rounded-full bg-base-content/5 px-4 py-1.5 text-sm text-base-content/70"
          >
            <Icon icon="heroicons:clock" class="h-4 w-4" />
            Expected back: {new Date(maintenance.until).toLocaleString()}
          </p>
        {/if}
        <div class="mt-6">
          <a href="{resolve('/login')}?admin" class="btn btn-ghost btn-sm">Admin login</a>
        </div>
      </div>
    </div>

    <p class="relative px-6 pb-6 text-center text-sm text-base-content/60">
      © {new Date().getFullYear()}
      {brandName}. All rights reserved.
    </p>
  </LandingBackground>
{:else}
  {@render children()}
{/if}
