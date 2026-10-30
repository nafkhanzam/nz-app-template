<script lang="ts">
  import PageTitle from "../../../../_/PageTitle.svelte";
  import { toast } from "#lib";
  import { trpc } from "#lib/client.svelte";
  import Container from "#lib/components/Container.svelte";
  import Loading from "#lib/components/Loading.svelte";
  import MarkdownEditor from "#lib/components/MarkdownEditor.svelte";
  import MonacoEditor from "#lib/components/MonacoEditor.svelte";
  import { modalStore } from "#lib/stores/modal.svelte";
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
    const v = (row?.value ?? {}) as {
      enabled?: boolean;
      message?: string | null;
      until?: string | null;
    };
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
  const otherConfigs = $derived(
    (configsQ.data ?? []).filter((c: { key: string }) => c.key !== MAINTENANCE_KEY),
  );
  let drafts = $state<Record<string, string>>({});
  const draftOf = (key: string, value: unknown) => drafts[key] ?? JSON.stringify(value, null, 2);

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
      // Keep the draft until the refetch lands; dropping it first would flash the stale value.
      await refresh();
      delete drafts[key];
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error(error instanceof Error ? error.message : `Failed to save "${key}"`);
    }
  };

  const removeConfig = async (key: string) => {
    const confirmed = await modalStore.confirm({
      title: "Delete config",
      message: `Delete config "${key}"?`,
      confirmLabel: "Delete",
      confirmClass: "btn-error",
    });
    if (!confirmed) return;
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

<PageTitle title="Settings" />

<Container>
  <h1 class="mb-6 text-3xl font-bold">App settings</h1>

  {#if !isAdmin}
    <div class="alert alert-error">Admins only.</div>
  {:else if configsQ.isPending}
    <Loading />
  {:else}
    <div class="space-y-4">
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body gap-4">
          <h2 class="card-title">Maintenance mode</h2>
          <p class="text-sm text-base-content/70">
            Non-admin users see a maintenance page while this is on. Admins can still use the app.
          </p>
          <label class="label cursor-pointer justify-start gap-3">
            <input
              type="checkbox"
              class="toggle toggle-warning"
              bind:checked={maintenance.enabled}
            />
            <span class="label-text">Enabled</span>
          </label>
          <div class="form-control">
            <span class="label-text mb-1">Message (optional)</span>
            <MarkdownEditor
              bind:value={() => maintenance.message ?? "", (v) => (maintenance.message = v)}
              minHeight="8rem"
              autoHeight
            />
          </div>
          <label class="floating-label">
            <span>Expected back (optional)</span>
            <input
              type="datetime-local"
              placeholder="Expected back (optional)"
              class="input-bordered input h-12 w-full"
              bind:value={maintenance.until}
            />
          </label>
          <div class="card-actions justify-end">
            <button class="btn btn-primary" disabled={saving} onclick={saveMaintenance}>
              Save
            </button>
          </div>
        </div>
      </div>

      {#each otherConfigs as c (c.key)}
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body gap-4">
            <div class="flex items-center justify-between">
              <h2 class="card-title font-mono text-base">{c.key}</h2>
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
            <MonacoEditor
              language="json"
              minHeight="8rem"
              autoHeight
              bind:value={() => draftOf(c.key, c.value), (v) => (drafts[c.key] = v)}
            />
          </div>
        </div>
      {:else}
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <p class="py-2 text-center text-sm text-base-content/60">No other keys.</p>
          </div>
        </div>
      {/each}

      <div class="card bg-base-100 shadow-xl">
        <div class="card-body gap-4">
          <h2 class="card-title">Add key</h2>
          <label class="floating-label">
            <span>Key</span>
            <input class="input-bordered input h-12 w-full" placeholder="Key" bind:value={newKey} />
          </label>
          <MonacoEditor language="json" minHeight="6rem" autoHeight bind:value={newValue} />
          <div class="card-actions justify-end">
            <button class="btn btn-primary btn-sm" disabled={!newKey.trim()} onclick={addConfig}>
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</Container>
