<script lang="ts">
  import { toast } from "#lib";
  import { token, refresh } from "#lib/stores/token.svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import Icon from "@iconify/svelte";
  import { trpc_ } from "#lib/client.svelte";
  import { onMount } from "svelte";
  import LandingBackground from "#lib/components/LandingBackground.svelte";
  import PageTitle from "../_/PageTitle.svelte";
  import { constants } from "../_/constants";
  import { createOIDCNonce } from "#lib/oidc-nonce";

  let username = $state("");
  let password = $state("");
  let isLoading = $state(false);
  let isOIDCLoading = $state(false);
  let providers = $state<{ id: string; name: string; iconUrl?: string }[]>([]);
  let failedIcons = $state<string[]>([]);
  const rawRedirect = page.url.searchParams.get("redirect");

  const handlePasswordLogin = async () => {
    if (!username.trim() || !password.trim()) {
      toast.error("Please enter both username and password");
      return;
    }

    isLoading = true;
    try {
      const res = await trpc_.login.mutate({
        username: username.trim(),
        password,
      });
      token.value = res.accessToken;
      refresh.value = res.refreshToken;
      toast.success("Login successful!");
      goto(rawRedirect || "/");
    } catch (error: any) {
      toast.error(error.message || "Login failed");
    } finally {
      isLoading = false;
    }
  };

  onMount(async () => {
    // TEMP: hardcoded dummy providers for previewing the UI. Remove this block.
    // {
    //   providers = [
    //     { id: "google", name: "Google", iconUrl: "https://www.google.com/favicon.ico" },
    //     { id: "github", name: "GitHub", iconUrl: "https://github.com/favicon.ico" },
    //     { id: "its", name: "Institut Teknologi Sepuluh Nopember" },
    //     { id: "broken", name: "Broken Icon", iconUrl: "https://invalid.invalid/icon.png" },
    //   ];
    //   return;
    // }
    try {
      providers = await trpc_.oidcProviders.query();
    } catch (error: any) {
      toast.error(error.message || "Failed to load SSO providers");
    }
  });

  const handleOIDCLogin = async (providerId: string) => {
    isOIDCLoading = true;
    try {
      const res = await trpc_.oidcInitiateLogin.query({
        providerId,
        nonce: createOIDCNonce(),
        redirectUrl: rawRedirect || "/",
      });
      // Redirect to OIDC provider's login page
      window.location.href = res.authUrl;
    } catch (error: any) {
      toast.error(error.message || "OIDC login failed");
      isOIDCLoading = false;
    }
  };

  const { brandName } = constants;

  const busy = $derived(isLoading || isOIDCLoading);
</script>

<PageTitle title="Login" />

<LandingBackground>
  <div
    class="relative mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-6 py-12 lg:grid-cols-2"
  >
    <!-- Hero -->
    <section class="text-center lg:text-left">
      <div
        class="mb-6 inline-flex items-center gap-2 rounded-full border border-base-content/10 bg-base-100/60 px-4 py-1.5 text-sm font-medium backdrop-blur"
      >
        <Icon icon="heroicons:academic-cap" class="h-4 w-4 text-secondary" />
        {brandName}
      </div>
      <h1 class="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
        Welcome <span
          class="bg-linear-to-r from-primary via-accent to-secondary bg-clip-text text-transparent"
          >back</span
        >
      </h1>
      <p class="mx-auto mt-4 max-w-md text-lg text-base-content/70 lg:mx-0">
        Sign in to continue to {brandName}.
      </p>
      <ul class="mt-8 hidden flex-col gap-3 text-base-content/80 lg:flex">
        {#if providers.length > 0}
          <li class="flex items-center gap-3">
            <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
              <Icon icon="mdi:shield-account" class="h-5 w-5 text-primary" />
            </span>
            Single sign-on
          </li>
        {/if}
        <li class="flex items-center gap-3">
          <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/15">
            <Icon icon="heroicons:key" class="h-5 w-5 text-secondary" />
          </span>
          {providers.length > 0 ? "Or use" : "Sign in with"} your username and password
        </li>
      </ul>
    </section>

    <!-- Login card -->
    <section class="mx-auto w-full max-w-md">
      <div
        class="rounded-3xl border border-base-content/10 bg-base-100/80 p-8 shadow-2xl backdrop-blur-xl"
      >
        <h2 class="text-2xl font-bold">Sign in</h2>
        <p class="mt-1 mb-6 text-sm text-base-content/60">
          {providers.length > 0
            ? "Choose how you want to continue"
            : "Enter your username and password"}
        </p>

        {#if providers.length > 0}
          <div class="flex flex-col gap-3">
            {#each providers as provider (provider.id)}
              <button
                class="btn h-12 w-full justify-start gap-3 border-base-content/15 bg-base-100 text-base font-medium shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
                onclick={() => handleOIDCLogin(provider.id)}
                disabled={busy}
              >
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  {#if provider.iconUrl && !failedIcons.includes(provider.id)}
                    <img
                      src={provider.iconUrl}
                      alt=""
                      class="h-5 w-5 object-contain"
                      onerror={() => failedIcons.push(provider.id)}
                    />
                  {:else}
                    <Icon icon="mdi:shield-account" width="20" height="20" class="text-primary" />
                  {/if}
                </span>
                <span class="flex-1 text-left">{provider.name}</span>
                {#if isOIDCLoading}
                  <span class="loading loading-sm loading-spinner"></span>
                {:else}
                  <Icon icon="heroicons:arrow-right" class="h-4 w-4 opacity-50" />
                {/if}
              </button>
            {/each}
          </div>

          <div class="divider my-6 text-xs text-base-content/50 uppercase">or</div>
        {/if}

        <form
          class="flex flex-col gap-4"
          onsubmit={(e) => {
            e.preventDefault();
            handlePasswordLogin();
          }}
        >
          <label class="floating-label">
            <span>Username</span>
            <input
              id="username"
              type="text"
              autocomplete="username"
              placeholder="Username"
              class="input-bordered input h-12 w-full"
              bind:value={username}
              disabled={busy}
            />
          </label>

          <label class="floating-label">
            <span>Password</span>
            <input
              id="password"
              type="password"
              autocomplete="current-password"
              placeholder="Password"
              class="input-bordered input h-12 w-full"
              bind:value={password}
              disabled={busy}
            />
          </label>

          <button
            type="submit"
            class="btn h-12 text-base btn-primary"
            disabled={busy || !username.trim() || !password.trim()}
          >
            {#if isLoading}
              <span class="loading loading-spinner"></span>
              Signing in...
            {:else}
              Sign in
            {/if}
          </button>
        </form>
      </div>
    </section>
  </div>

  <p class="relative px-6 pb-6 text-center text-sm text-base-content/60">
    © {new Date().getFullYear()}
    {brandName}. All rights reserved.
  </p>
</LandingBackground>
