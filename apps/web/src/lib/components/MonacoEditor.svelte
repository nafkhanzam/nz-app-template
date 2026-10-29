<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { themeStore } from "#lib/stores/theme.svelte";
  import type * as Monaco from "monaco-editor";

  let {
    value = $bindable(""),
    language = "markdown",
    minHeight = "16rem",
    readOnly = false,
    autoHeight = false,
  }: {
    value?: string;
    language?: string;
    /** Minimum height; with `autoHeight` it is the floor the editor grows from. */
    minHeight?: string;
    readOnly?: boolean;
    /** Grow with the content instead of using a fixed height. */
    autoHeight?: boolean;
  } = $props();

  let container: HTMLDivElement;
  let editor: Monaco.editor.IStandaloneCodeEditor | undefined;
  let model: Monaco.editor.ITextModel | undefined;
  let contentHeight = $state(0);

  const monacoTheme = () => (themeStore.theme === "dark" ? "vs-dark" : "vs");

  onMount(() => {
    let disposed = false;

    (async () => {
      const [monaco, EditorWorker] = await Promise.all([
        import("monaco-editor"),
        import("monaco-editor/editor/editor.worker?worker").then((m) => m.default),
      ]);
      if (disposed) return;

      self.MonacoEnvironment = { getWorker: () => new EditorWorker() };

      model = monaco.editor.createModel(value, language);
      editor = monaco.editor.create(container, {
        model,
        theme: monacoTheme(),
        automaticLayout: true,
        minimap: { enabled: false },
        wordWrap: "on",
        scrollBeyondLastLine: false,
        readOnly,
        // Render suggest/hover widgets with fixed positioning so the scrollable
        // container doesn't clip them.
        fixedOverflowWidgets: true,
        // Let the page scroll when the editor itself has nothing left to scroll.
        scrollbar: { alwaysConsumeMouseWheel: false },
      });

      if (autoHeight) {
        contentHeight = editor.getContentHeight();
        editor.onDidContentSizeChange((e) => (contentHeight = e.contentHeight));
      }

      editor.onDidChangeModelContent(() => {
        value = editor!.getValue();
      });
    })();

    return () => {
      disposed = true;
    };
  });

  onDestroy(() => {
    editor?.dispose();
    model?.dispose();
  });

  $effect(() => {
    // Read `value` before checking `editor`: the first run happens before
    // Monaco has loaded, and must still subscribe to `value`.
    const next = value;
    if (editor && editor.getValue() !== next) {
      editor.setValue(next);
    }
  });

  $effect(() => {
    const theme = monacoTheme();
    if (editor) {
      import("monaco-editor").then((monaco) => monaco.editor.setTheme(theme));
    }
  });
</script>

<div
  bind:this={container}
  style="min-height: {minHeight}; height: {autoHeight
    ? `max(${minHeight}, ${contentHeight + 24}px)`
    : minHeight};"
  class="resize-y overflow-auto rounded-lg border-2 border-base-content/30 focus-within:border-primary"
></div>
