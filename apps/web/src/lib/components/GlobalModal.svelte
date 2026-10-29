<script lang="ts">
  import { modalStore } from "#lib/stores/modal.svelte";

  let dialogEl = $state<HTMLDialogElement>();

  $effect(() => {
    if (!dialogEl) return;
    if (modalStore.open) {
      if (!dialogEl.open) dialogEl.showModal();
    } else if (dialogEl.open) {
      dialogEl.close();
    }
  });

  async function handleAction(action: NonNullable<ModalOptionsActions>[number]) {
    await action.onClick?.();
    if (action.closeOnClick !== false) modalStore.close();
  }

  type ModalOptionsActions = NonNullable<typeof modalStore.options>["actions"];
</script>

<dialog
  bind:this={dialogEl}
  class="modal"
  oncancel={(e) => e.preventDefault()}
  onclose={() => modalStore.close()}
>
  <div class="modal-box">
    {#if modalStore.options}
      {#if modalStore.options.title}
        <h3 class="text-lg font-bold">{modalStore.options.title}</h3>
      {/if}
      <div class="py-4">
        {#if typeof modalStore.options.body === "string"}
          <p>{modalStore.options.body}</p>
        {:else}
          {@render modalStore.options.body()}
        {/if}
      </div>
      {#if modalStore.options.actions?.length}
        <div class="modal-action">
          {#each modalStore.options.actions as action (action.label)}
            <button class="btn {action.class ?? ''}" onclick={() => handleAction(action)}>
              {action.label}
            </button>
          {/each}
        </div>
      {/if}
    {/if}
  </div>
</dialog>
