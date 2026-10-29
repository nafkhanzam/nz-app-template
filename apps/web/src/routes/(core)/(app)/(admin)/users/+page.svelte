<script lang="ts">
  import Icon from "@iconify/svelte";
  import { client, trpc } from "#lib/client.svelte";
  import { toast } from "#lib";
  import { modalStore } from "#lib/stores/modal.svelte";
  import { user } from "#lib/stores/user.svelte";
  import { refresh, token } from "#lib/stores/token.svelte";
  import Pagination from "#lib/components/Pagination.svelte";
  import { usePagination } from "#lib/stores/pagination.svelte";

  const pagination = usePagination(10);

  const usersQ = client.user.useFindMany(() => ({
    select: { id: true, username: true, name: true, role: true },
    orderBy: { username: "asc" },
    skip: pagination.skip,
    take: pagination.take,
  }));
  const countQ = client.user.useCount();

  const canImpersonate = $derived(user().role === "ADMIN" && !user().impersonation);

  const onImpersonate = async (userId: string, name: string) => {
    const confirmed = await modalStore.confirm({
      title: "Impersonate user",
      message: `Sign in as ${name}? You can switch back from the account menu.`,
      confirmLabel: "Impersonate",
    });
    if (!confirmed) return;
    try {
      const tokens = await trpc.impersonate.mutate({ userId });
      token.value = tokens.accessToken;
      refresh.value = tokens.refreshToken;
      // Full reload so no data cached for the admin leaks into the new session.
      window.location.reload();
    } catch (error) {
      console.error("Error impersonating user:", error);
      toast.error("Failed to impersonate user");
    }
  };
</script>

<div class="container mx-auto px-4 py-8">
  <div class="card bg-base-100 shadow-xl">
    <div class="card-body">
      <h1 class="card-title gap-2">
        <Icon icon="heroicons:user-group" class="h-5 w-5" />
        Users
        <span class="text-sm font-normal text-base-content/50">({countQ.data ?? 0})</span>
      </h1>

      {#if (usersQ.data ?? []).length === 0}
        <div class="py-4 text-center text-sm text-base-content/60">No users yet.</div>
      {:else}
        <div class="overflow-x-auto">
          <table class="table table-zebra table-sm">
            <thead>
              <tr>
                <th>Username</th>
                <th>Name</th>
                <th>Role</th>
                {#if canImpersonate}
                  <th></th>
                {/if}
              </tr>
            </thead>
            <tbody>
              {#each usersQ.data ?? [] as u (u.id)}
                <tr>
                  <td>{u.username}</td>
                  <td>{u.name}</td>
                  <td>{u.role}</td>
                  {#if canImpersonate}
                    <td class="text-right">
                      {#if u.id !== user().id}
                        <button
                          type="button"
                          popovertarget="user-actions-{u.id}"
                          style="anchor-name:--user-actions-{u.id}"
                          class="btn btn-ghost btn-xs"
                          aria-label="Actions"
                        >
                          <Icon icon="heroicons:ellipsis-vertical" class="h-4 w-4" />
                        </button>
                        <ul
                          popover
                          id="user-actions-{u.id}"
                          style="position-anchor:--user-actions-{u.id}"
                          class="dropdown dropdown-end menu menu-sm w-48 rounded-box bg-base-100 p-2 shadow"
                        >
                          <li>
                            <button
                              onclick={(e) => {
                                (e.currentTarget as HTMLElement)
                                  .closest<HTMLElement>("[popover]")
                                  ?.hidePopover();
                                void onImpersonate(u.id, u.name);
                              }}
                            >
                              <Icon icon="heroicons:finger-print" class="h-4 w-4" />
                              Impersonate
                            </button>
                          </li>
                        </ul>
                      {/if}
                    </td>
                  {/if}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <Pagination {pagination} totalItems={countQ.data ?? 0} pageSizeOptions={[5, 10, 25]} />
      {/if}
    </div>
  </div>
</div>
