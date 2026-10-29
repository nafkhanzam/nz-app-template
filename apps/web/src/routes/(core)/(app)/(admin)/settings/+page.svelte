<script lang="ts">
  import { toast } from "#lib";
  import { trpc } from "#lib/client.svelte";
  import Container from "#lib/components/Container.svelte";
  import Loading from "#lib/components/Loading.svelte";
  import { user } from "#lib/stores/user.svelte";
  import { createQuery, useQueryClient } from "@tanstack/svelte-query";

  const isAdmin = $derived(user().role === "ADMIN");
  const queryClient = useQueryClient();

  const configsQ = createQuery(() => ({
    queryKey: ["appConfigs"],
    queryFn: () => trpc.listAppConfigs.query(),
    enabled: isAdmin,
  }));

  const MAINTENANCE_KEY = "maintenance";

  type Maintenance = { enabled: boolean; message: string; until: string };
  const toLocalInput = (iso: string | null | undefined) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  let maintenance = $state<Maintenance>({ enabled: false, message: "", until: "" });
  let maintenanceLoaded = $state(false);
  $effect(() => {
    if (!configsQ.data || maintenanceLoaded) return;
    const row = configsQ.data.find((c: { key: string }) => c.key === MAINTENANCE_KEY);
    const v = (row?.value ?? {}) as { enabled?: boolean; message?: string | null; until?: string | null };
    maintenance = {
      enabled: v.enabled === true,
      message: v.message ?? "",
      until: toLocalInput(v.until),
    };
    maintenanceLoaded = true;
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["appConfigs"] });
    await queryClient.invalidateQueries({ queryKey: ["maintenance"] });
  };

  let saving = $state(false);
  const saveMaintenance = async () => {
    saving = true;
    try {
      await trpc.setAppConfig.mutate({
        key: MAINTENANCE_KEY,
        value: {
          enabled: maintenance.enabled,
          message: maintenance.message.trim() || null,
          until: maintenance.until ? new Date(maintenance.until).toISOString() : null,
        },
      });
      toast.success("Maintenance settings saved");
      await refresh();
    } catch (error) {
      console.error("Error saving maintenance:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save maintenance settings");
    } finally {
      saving = false;
    }
  };

  // Everything other than "maintenance": raw JSON editor per key.
  const otherConfigs = $derived((configsQ.data ?? []).filter((c: { key: string }) => c.key !== MAINTENANCE_KEY));
  let drafts = $state<Record<string, string>>({});
  const draftOf = (key: string, value: unknown) =>
    drafts[key] ?? JSON.stringify(value, null, 2);

  const saveRaw = async (key: string, text: string) => {
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch {
      toast.error("Invalid JSON");
      return;
    }
    try {
      await trpc.setAppConfig.mutate({ key, value: value as never });
      toast.success(`Saved "${key}"`);
      delete drafts[key];
      await refresh();
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error(error instanceof Error ? error.message : `Failed to save "${key}"`);
    }
  };

  const removeConfig = async (key: string) => {
    if (!confirm(`Delete config "${key}"?`)) return;
    try {
      await trpc.deleteAppConfig.mutate({ key });
      toast.success(`Deleted "${key}"`);
      await refresh();
    } catch (error) {
      console.error("Error deleting config:", error);
      toast.error(`Failed to delete "${key}"`);
    }
  };

  let newKey = $state("");
  let newValue = $state("{}");
  const addConfig = async () => {
    const key = newKey.trim();
    if (!key) return;
    await saveRaw(key, newValue);
    newKey = "";
    newValue = "{}";
  };
</script>

<Container>
  <h1 class="mb-6 text-3xl font-bold">App settings</h1>

  {#if !isAdmin}
    <div class="alert alert-error">Admins only.</div>
  {:else if configsQ.isPending}
    <Loading />
  {:else}
    <section class="card mb-8 bg-base-100 shadow">
      <div class="card-body gap-4">
        <h2 class="card-title">Maintenance mode</h2>
        <p class="text-sm text-base-content/70">
          Non-admin users see a maintenance page while this is on. Admins can still use the app.
        </p>
        <label class="label cursor-pointer justify-start gap-3">
          <input type="checkbox" class="toggle toggle-warning" bind:checked={maintenance.enabled} />
          <span class="label-text">Enabled</span>
        </label>
        <label class="form-control">
          <span class="label-text mb-1">Message (optional)</span>
          <textarea
            class="textarea textarea-bordered w-full"
            rows="3"
            placeholder="We're doing some scheduled work. Please check back soon."
            bind:value={maintenance.message}
          ></textarea>
        </label>
        <label class="form-control">
          <span class="label-text mb-1">Expected back (optional)</span>
          <input type="datetime-local" class="input input-bordered" bind:value={maintenance.until} />
        </label>
        <div class="card-actions justify-end">
          <button class="btn btn-primary" disabled={saving} onclick={saveMaintenance}>Save</button>
        </div>
      </div>
    </section>

    <section class="card bg-base-100 shadow">
      <div class="card-body gap-4">
        <h2 class="card-title">Other config keys</h2>
        {#each otherConfigs as c (c.key)}
          <div class="rounded-box border border-base-300 p-3">
            <div class="mb-2 flex items-center justify-between">
              <code class="font-semibold">{c.key}</code>
              <div class="flex gap-2">
                <button
                  class="btn btn-primary btn-xs"
                  onclick={() => saveRaw(c.key, draftOf(c.key, c.value))}>Save</button
                >
                <button class="btn btn-error btn-outline btn-xs" onclick={() => removeConfig(c.key)}
                  >Delete</button
                >
              </div>
            </div>
            <textarea
              class="textarea textarea-bordered w-full font-mono text-xs"
              rows="4"
              value={draftOf(c.key, c.value)}
              oninput={(e) => (drafts[c.key] = e.currentTarget.value)}
            ></textarea>
          </div>
        {:else}
          <p class="text-sm text-base-content/60">No other keys.</p>
        {/each}

        <div class="rounded-box border border-dashed border-base-300 p-3">
          <div class="mb-2 font-semibold">Add key</div>
          <input class="input input-bordered input-sm mb-2 w-full" placeholder="key" bind:value={newKey} />
          <textarea
            class="textarea textarea-bordered w-full font-mono text-xs"
            rows="3"
            bind:value={newValue}
          ></textarea>
          <div class="mt-2 text-right">
            <button class="btn btn-sm" disabled={!newKey.trim()} onclick={addConfig}>Add</button>
          </div>
        </div>
      </div>
    </section>
  {/if}
</Container>
