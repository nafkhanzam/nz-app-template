<script lang="ts">
  import Icon from "@iconify/svelte";
  import { user } from "#lib/stores/user.svelte";
  import Card from "../_/ui/Card.svelte";
  import { trpc } from "#lib/client.svelte";
  import { toast } from "#lib";
  import { onMount } from "svelte";
  import { createOIDCNonce } from "#lib/oidc-nonce";

  const currentUser = $derived(user());

  let providers = $state<{ id: string; name: string; issuer: string; iconUrl?: string }[]>([]);
  let failedIcons = $state<string[]>([]);
  let linkedIssuers = $state<string[]>([]);
  let linkingId = $state<string | null>(null);

  onMount(async () => {
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
</script>

<div class="min-h-screen bg-base-100">
  <div class="container mx-auto px-4 py-8">
    <div class="mb-8">
      <h1 class="mb-2 text-2xl font-bold">Profile</h1>
      <p class="text-sm text-base-content/70">View your account information</p>
    </div>

    <div class="grid gap-6 md:grid-cols-2">
      <Card title="Account Information">
        <div class="flex flex-col items-center gap-4 py-4">
          {#if currentUser.image}
            <div class="avatar">
              <div class="w-24 rounded-full">
                <img src={currentUser.image} alt={currentUser.name} />
              </div>
            </div>
          {:else}
            <div class="avatar placeholder">
              <div
                class="w-24 rounded-full bg-primary text-primary-content flex justify-center items-center"
              >
                <span class="text-3xl">{currentUser.name.charAt(0).toUpperCase()}</span>
              </div>
            </div>
          {/if}
          <div class="text-center">
            <h2 class="text-xl font-bold">{currentUser.name}</h2>
            <p class="text-base-content/70">@{currentUser.username}</p>
            <div class="mt-2">
              <span class="badge {getRoleBadgeClass(currentUser.role)}">
                {getRoleLabel(currentUser.role)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Profile Details">
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-base-200">
              <Icon icon="heroicons:user" class="h-5 w-5 text-primary" />
            </div>
            <div>
              <p class="text-xs text-base-content/60">Full Name</p>
              <p class="font-medium">{currentUser.name}</p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-base-200">
              <Icon icon="heroicons:at-symbol" class="h-5 w-5 text-primary" />
            </div>
            <div>
              <p class="text-xs text-base-content/60">Username</p>
              <p class="font-medium">{currentUser.username}</p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-base-200">
              <Icon icon="heroicons:envelope" class="h-5 w-5 text-primary" />
            </div>
            <div>
              <p class="text-xs text-base-content/60">Email</p>
              <p class="font-medium">{currentUser.email || "-"}</p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-base-200">
              <Icon icon="heroicons:shield-check" class="h-5 w-5 text-primary" />
            </div>
            <div>
              <p class="text-xs text-base-content/60">Role</p>
              <p class="font-medium">{getRoleLabel(currentUser.role)}</p>
            </div>
          </div>
        </div>
      </Card>

      {#if providers.length > 0}
        <Card title="Linked Accounts">
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
        </Card>
      {/if}
    </div>
  </div>
</div>
