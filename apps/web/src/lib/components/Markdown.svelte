<script lang="ts">
  import { renderMarkdown } from "./markdown-core";
  import MarkdownOutput from "./MarkdownOutput.svelte";

  const { content }: { content: string } = $props();

  const html = $derived(renderMarkdown(content));
</script>

<MarkdownOutput {html} />
