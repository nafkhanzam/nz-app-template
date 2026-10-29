<script lang="ts">
  import MonacoEditor from "#lib/components/MonacoEditor.svelte";
  import Markdown from "#lib/components/Markdown.svelte";

  let {
    value = $bindable(""),
    minHeight = "16rem",
    readOnly = false,
    autoHeight = false,
  }: {
    value?: string;
    minHeight?: string;
    readOnly?: boolean;
    autoHeight?: boolean;
  } = $props();

  let previewing = $state(false);
</script>

<div class="space-y-2">
  <div class="join">
    <button
      type="button"
      class="btn join-item btn-sm {previewing ? '' : 'btn-active'}"
      onclick={() => (previewing = false)}
    >
      Write
    </button>
    <button
      type="button"
      class="btn join-item btn-sm {previewing ? 'btn-active' : ''}"
      onclick={() => (previewing = true)}
    >
      Preview
    </button>
  </div>
  {#if previewing}
    <div class="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm" style="min-height: {minHeight};">
      <Markdown content={value} />
    </div>
  {/if}
  <div hidden={previewing}>
    <MonacoEditor bind:value language="markdown" {minHeight} {readOnly} {autoHeight} />
  </div>
</div>
