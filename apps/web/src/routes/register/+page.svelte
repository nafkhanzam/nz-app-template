<script lang="ts">
  import { toast } from "#lib";
  import { trpc } from "#lib/client.svelte";
  import { token, refresh } from "#lib/stores/token.svelte";
  import { goto } from "$app/navigation";
  import Icon from "@iconify/svelte";
  import LandingBackground from "#lib/components/LandingBackground.svelte";
  import { constants } from "../_/constants";

  let name = $state("");
  let username = $state("");
  let password = $state("");
  let confirmPassword = $state("");
  let isLoading = $state(false);

  const handleRegister = async () => {
    if (!name.trim() || !username.trim() || !password.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }

    isLoading = true;
    try {
      const res = await trpc.register.mutate({
        name: name.trim(),
        username: username.trim(),
        password,
      });
      token.value = res.accessToken;
      refresh.value = res.refreshToken;
      toast.success("Account created successfully!");
      goto("/");
    } catch (error: any) {
      toast.error(error.message || "Registration failed");
    } finally {
      isLoading = false;
    }
  };

  const { brandName } = constants;
</script>

<LandingBackground>
  <div class="relative mx-auto flex w-full max-w-md flex-1 items-center px-6 py-12">
    <div
      class="w-full rounded-3xl border border-base-content/10 bg-base-100/80 p-8 shadow-2xl backdrop-blur-xl"
    >
      <div
        class="mb-4 inline-flex items-center gap-2 rounded-full border border-base-content/10 bg-base-100/60 px-3 py-1 text-xs font-medium"
      >
        <Icon icon="heroicons:academic-cap" class="h-4 w-4 text-secondary" />
        {brandName}
      </div>
      <h1 class="text-2xl font-bold">Create account</h1>
      <p class="mt-1 mb-6 text-sm text-base-content/60">Join us today</p>

      <form
        class="flex flex-col gap-4"
        onsubmit={(e) => {
          e.preventDefault();
          handleRegister();
        }}
      >
        <label class="floating-label">
          <span>Full Name</span>
          <input
            type="text"
            autocomplete="name"
            placeholder="Full Name"
            class="input-bordered input h-12 w-full"
            bind:value={name}
            disabled={isLoading}
          />
        </label>
        <label class="floating-label">
          <span>Full Name</span>
          <input
            type="text"
            autocomplete="name"
            placeholder="Full Name"
            class="input-bordered input h-12 w-full"
            bind:value={name}
            disabled={isLoading}
          />
        </label>
        <label class="floating-label">
          <span>Username</span>
          <input
            type="text"
            autocomplete="username"
            placeholder="Username"
            class="input-bordered input h-12 w-full"
            bind:value={username}
            disabled={isLoading}
          />
        </label>
        <label class="floating-label">
          <span>Password</span>
          <input
            type="password"
            autocomplete="new-password"
            placeholder="Password"
            class="input-bordered input h-12 w-full"
            bind:value={password}
            disabled={isLoading}
          />
        </label>
        <label class="floating-label">
          <span>Confirm Password</span>
          <input
            type="password"
            autocomplete="new-password"
            placeholder="Confirm Password"
            class="input-bordered input h-12 w-full"
            bind:value={confirmPassword}
            disabled={isLoading}
          />
        </label>

        <button
          type="submit"
          class="btn h-12 text-base btn-primary"
          disabled={isLoading ||
            !name.trim() ||
            !username.trim() ||
            !password.trim() ||
            !confirmPassword.trim()}
        >
          {#if isLoading}
            <span class="loading loading-spinner"></span>
            Creating account...
          {:else}
            Sign Up
          {/if}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-base-content/60">
        Already have an account?
        <a href="/login" class="link link-primary">Sign in</a>
      </p>
    </div>
  </div>
</LandingBackground>
