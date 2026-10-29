<script lang="ts">
  import Icon from "@iconify/svelte";
  import { user } from "#lib/stores/user.svelte";
  import { trpc } from "#lib/client.svelte";
  import { toast } from "#lib";
  import { onMount } from "svelte";
  import type { Snippet } from "svelte";
  import { createOIDCNonce } from "#lib/oidc-nonce";

  const currentUser = $derived(user());

  let providers = $state<{ id: string; name: string; issuer: string; iconUrl?: string }[]>([]);
  let failedIcons = $state<string[]>([]);
  let linkedIssuers = $state<string[]>([]);
  let linkingId = $state<string | null>(null);

  let hasPassword = $state<boolean | null>(null);
  let newPassword = $state("");
  let confirmPassword = $state("");
  let savingPassword = $state(false);

  const passwordMismatch = $derived(confirmPassword !== "" && newPassword !== confirmPassword);
  const passwordTooShort = $derived(newPassword !== "" && newPassword.length < 8);
  const canSavePassword = $derived(
    newPassword.length >= 8 && newPassword === confirmPassword && !savingPassword,
  );

  let oldPassword = $state("");
  let changedPassword = $state("");
  let confirmChanged = $state("");
  let changingPassword = $state(false);

  const changedTooShort = $derived(changedPassword !== "" && changedPassword.length < 8);
  const changedMismatch = $derived(confirmChanged !== "" && changedPassword !== confirmChanged);
  const canChangePassword = $derived(
    oldPassword !== "" &&
      changedPassword.length >= 8 &&
      changedPassword === confirmChanged &&
      !changingPassword,
  );

  const changePassword = async () => {
    changingPassword = true;
    try {
      await trpc.changePassword.mutate({ oldPassword, newPassword: changedPassword });
      oldPassword = "";
      changedPassword = "";
      confirmChanged = "";
      toast.success("Password changed");
    } catch (error: any) {
      toast.error(error.message || "Failed to change password");
    } finally {
      changingPassword = false;
    }
  };

  const savePassword = async () => {
    savingPassword = true;
    try {
      await trpc.setPassword.mutate({ password: newPassword });
      hasPassword = true;
      newPassword = "";
      confirmPassword = "";
      toast.success("Password saved");
    } catch (error: any) {
      toast.error(error.message || "Failed to save password");
    } finally {
      savingPassword = false;
    }
  };

  onMount(async () => {
    trpc.passwordStatus
      .query()
      .then((res: { hasPassword: boolean }) => (hasPassword = res.hasPassword))
      .catch(() => (hasPassword = null));
    try {
      const [list, identities] = await Promise.all([
        trpc.oidcProviders.query(),
        trpc.oidcUserInfo.query(),
      ]);
      providers = list;
      linkedIssuers = identities.map((i: { issuer: string }) => i.issuer);
    } catch (error: any) {
      toast.error(error.message || "Failed to load linked accounts");
    }
  });

  const linkProvider = async (providerId: string) => {
    linkingId = providerId;
    try {
      const res = await trpc.oidcInitiateLogin.query({
        providerId,
        nonce: createOIDCNonce(),
        link: true,
        redirectUrl: "/profile/",
      });
      window.location.href = res.authUrl;
    } catch (error: any) {
      toast.error(error.message || "Failed to start account linking");
      linkingId = null;
    }
  };

  function getRoleBadgeClass(role: string) {
    switch (role) {
      case "ADMIN":
        return "badge-error";
      case "USER":
        return "badge-primary";
      default:
        return "badge-ghost";
    }
  }

  function getRoleLabel(role: string) {
    switch (role) {
      case "ADMIN":
        return "Admin";
      case "USER":
        return "User";
      default:
        return role;
    }
  }

  const details = $derived([
    { icon: "heroicons:user", label: "Full Name", value: currentUser.name },
    { icon: "heroicons:at-symbol", label: "Username", value: currentUser.username },
    { icon: "heroicons:envelope", label: "Email", value: currentUser.email || "-" },
    { icon: "heroicons:shield-check", label: "Role", value: getRoleLabel(currentUser.role) },
  ]);
</script>

{#snippet panel(title: string, icon: string, body: Snippet)}
  <section class="rounded-3xl border border-base-content/10 bg-base-100 p-6 shadow-2xl">
    <h2 class="mb-5 flex items-center gap-3 text-lg font-bold">
      <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
        <Icon {icon} class="h-5 w-5 text-primary" />
      </span>
      {title}
    </h2>
    {@render body()}
  </section>
{/snippet}

<div class="min-h-full">
  <div class="container mx-auto max-w-5xl px-4 py-8">
    <!-- Hero -->
    <div
      class="mb-8 flex flex-col items-center gap-6 rounded-3xl border border-base-content/10 bg-base-100 p-8 shadow-2xl sm:flex-row sm:items-center"
    >
      <div class="avatar {currentUser.image ? '' : 'avatar-placeholder'}">
        <div
          class="w-28 rounded-full bg-linear-to-br from-primary to-accent text-primary-content ring-4 ring-primary/30 ring-offset-2 ring-offset-base-100"
        >
          {#if currentUser.image}
            <img src={currentUser.image} alt={currentUser.name} />
          {:else}
            <span class="text-4xl font-black">{currentUser.name.charAt(0).toUpperCase()}</span>
          {/if}
        </div>
      </div>
      <div class="text-center sm:text-left">
        <h1 class="text-3xl font-black tracking-tight sm:text-4xl">{currentUser.name}</h1>
        <p class="mt-1 text-base-content/70">@{currentUser.username}</p>
        <span class="badge mt-3 {getRoleBadgeClass(currentUser.role)}">
          {getRoleLabel(currentUser.role)}
        </span>
      </div>
    </div>

    <div class="grid gap-6 md:grid-cols-2">
      {#snippet detailsBody()}
        <div class="space-y-4">
          {#each details as d (d.label)}
            <div class="flex items-center gap-3">
              <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/15">
                <Icon icon={d.icon} class="h-5 w-5 text-secondary" />
              </span>
              <div class="min-w-0">
                <p class="text-xs text-base-content/60">{d.label}</p>
                <p class="truncate font-medium">{d.value}</p>
              </div>
            </div>
          {/each}
        </div>
      {/snippet}
      {@render panel("Profile Details", "heroicons:identification", detailsBody)}

      {#if hasPassword === false}
        {#snippet passwordBody()}
          <form
            class="flex flex-col gap-4"
            onsubmit={(e) => (e.preventDefault(), canSavePassword && savePassword())}
          >
            <p class="text-sm text-base-content/70">
              You signed in with a linked account. Set a password to also log in with your username
              (@{currentUser.username}).
            </p>
            <label class="floating-label">
              <span>New password</span>
              <input
                type="password"
                class="input-bordered input h-12 w-full"
                placeholder="New password (min. 8 characters)"
                autocomplete="new-password"
                bind:value={newPassword}
              />
            </label>
            <label class="floating-label">
              <span>Confirm password</span>
              <input
                type="password"
                class="input-bordered input h-12 w-full {passwordMismatch ? 'input-error' : ''}"
                placeholder="Confirm password"
                autocomplete="new-password"
                bind:value={confirmPassword}
              />
            </label>
            {#if passwordTooShort}
              <p class="-mt-2 text-xs text-error">Password must be at least 8 characters</p>
            {/if}
            {#if passwordMismatch}
              <p class="-mt-2 text-xs text-error">Passwords do not match</p>
            {/if}
            <button
              type="submit"
              class="btn h-12 text-base btn-primary"
              disabled={!canSavePassword}
            >
              {#if savingPassword}
                <span class="loading loading-spinner"></span>
                Saving...
              {:else}
                <Icon icon="heroicons:key" class="h-5 w-5" />
                Save
              {/if}
            </button>
          </form>
        {/snippet}
        {@render panel("Set Up Password", "heroicons:key", passwordBody)}
      {/if}

      {#if hasPassword === true}
        {#snippet changeBody()}
          <form
            class="flex flex-col gap-4"
            onsubmit={(e) => (e.preventDefault(), canChangePassword && changePassword())}
          >
            <label class="floating-label">
              <span>Current password</span>
              <input
                type="password"
                class="input-bordered input h-12 w-full"
                placeholder="Current password"
                autocomplete="current-password"
                bind:value={oldPassword}
              />
            </label>
            <label class="floating-label">
              <span>New password (min. 8 characters)</span>
              <input
                type="password"
                class="input-bordered input h-12 w-full"
                placeholder="New password (min. 8 characters)"
                autocomplete="new-password"
                bind:value={changedPassword}
              />
            </label>
            <label class="floating-label">
              <span>Confirm new password</span>
              <input
                type="password"
                class="input-bordered input h-12 w-full {changedMismatch ? 'input-error' : ''}"
                placeholder="Confirm new password"
                autocomplete="new-password"
                bind:value={confirmChanged}
              />
            </label>
            {#if changedTooShort}
              <p class="-mt-2 text-xs text-error">Password must be at least 8 characters</p>
            {/if}
            {#if changedMismatch}
              <p class="-mt-2 text-xs text-error">Passwords do not match</p>
            {/if}
            <button
              type="submit"
              class="btn h-12 text-base btn-primary"
              disabled={!canChangePassword}
            >
              {#if changingPassword}
                <span class="loading loading-spinner"></span>
                Saving...
              {:else}
                <Icon icon="heroicons:key" class="h-5 w-5" />
                Change password
              {/if}
            </button>
          </form>
        {/snippet}
        {@render panel("Change Password", "heroicons:lock-closed", changeBody)}
      {/if}

      {#if providers.length > 0}
        {#snippet linkedBody()}
          <div class="space-y-3">
            {#each providers as provider (provider.id)}
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  {#if provider.iconUrl && !failedIcons.includes(provider.id)}
                    <img
                      src={provider.iconUrl}
                      alt=""
                      class="h-5 w-5 object-contain"
                      onerror={() => failedIcons.push(provider.id)}
                    />
                  {:else}
                    <Icon icon="mdi:shield-account" class="h-5 w-5 text-primary" />
                  {/if}
                  <span class="font-medium">{provider.name}</span>
                </div>
                {#if linkedIssuers.includes(provider.issuer)}
                  <span class="badge badge-success">Linked</span>
                {:else}
                  <button
                    class="btn btn-outline btn-sm"
                    onclick={() => linkProvider(provider.id)}
                    disabled={linkingId !== null}
                  >
                    {linkingId === provider.id ? "Redirecting..." : "Link"}
                  </button>
                {/if}
              </div>
            {/each}
          </div>
        {/snippet}
        {@render panel("Linked Accounts", "mdi:shield-account", linkedBody)}
      {/if}
    </div>
  </div>
</div>
