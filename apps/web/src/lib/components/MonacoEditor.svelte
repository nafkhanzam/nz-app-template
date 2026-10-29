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

  // Dark uses stock vs-dark. Light is vs with a gray palette, since vs's pure white
  // vanishes into the white cards.
  const lightColors = {
    "editor.background": "#eef2f7",
    "editorGutter.background": "#e4e9f0",
    "editor.lineHighlightBackground": "#dfe6ef",
    "editorLineNumber.foreground": "#8b98ab",
    "editorLineNumber.activeForeground": "#3b4a63",
    "editor.selectionBackground": "#b9d0f2",
    "editorCursor.foreground": "#4f46e5",
  };

  const applyTheme = (monaco: typeof Monaco) => {
    if (themeStore.theme === "dark") {
      monaco.editor.setTheme("vs-dark");
      return;
    }
    monaco.editor.defineTheme("app-light", {
      base: "vs",
      inherit: true,
      rules: [],
      colors: lightColors,
    });
    monaco.editor.setTheme("app-light");
  };

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
      applyTheme(monaco);
      editor = monaco.editor.create(container, {
        model,
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
    // Track the app theme so the editor re-themes when it flips.
    void themeStore.theme;
    if (editor) {
      import("monaco-editor").then(applyTheme);
    }
  });
</script>

<div
  bind:this={container}
  style="min-height: {minHeight}; height: {autoHeight
    ? `max(${minHeight}, ${contentHeight + 24}px)`
    : minHeight};"
  class="resize-y overflow-hidden rounded-box"
></div>
