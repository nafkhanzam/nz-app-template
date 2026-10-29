<script lang="ts">
  // Pure presentation for markdown-core's rendered HTML.
  const { html }: { html: string } = $props();

  const TYPST_URL = "https://storage.nafkhanzam.com/typst/typst-all-in-one.ts@0.8.0-rc3.js";
  // const TYPST_URL = "https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-all-in-one.ts@0.8.0-rc3/dist/esm/index.js";
  // Fit the page to its content so the SVG has no A4 margins/whitespace.
  // Text is fixed at TYPST_FONT_PT so 1em of the surrounding markdown text == TYPST_FONT_PT svg units.
  const TYPST_FONT_PT = 16;
  const TYPST_PRELUDE = `#set page(width: 840pt, height: auto, margin: 0pt)\n#set text(size: ${TYPST_FONT_PT}pt)\n`;

  // /** Sizes the svg in `em` so it scales with the surrounding markdown font size. */
  // const scaleSvg = (node: HTMLElement) => {
  //   const svg = node.querySelector("svg");
  //   if (!svg) return;
  //   for (const attr of ["width", "height"]) {
  //     const v = parseFloat(svg.getAttribute(attr) ?? "");
  //     if (!Number.isNaN(v)) svg.setAttribute(attr, `${v / TYPST_FONT_PT}em`);
  //   }
  // };

  let typstPromise: Promise<any> | undefined;
  const loadTypst = () =>
    (typstPromise ??= import(/* @vite-ignore */ TYPST_URL).then(
      (m) => m.$typst ?? (globalThis as any).$typst,
    ));

  let container: HTMLElement | undefined = $state();

  $effect(() => {
    html; // re-run whenever the rendered HTML (and thus the placeholders) changes
    const nodes = [
      ...(container?.querySelectorAll<HTMLElement>(".typst-render[data-typst]") ?? []),
    ];
    if (nodes.length === 0) return;
    let cancelled = false;
    (async () => {
      let typst;
      try {
        typst = await loadTypst();
      } catch (e) {
        typstPromise = undefined;
        for (const n of nodes) n.textContent = `Failed to load typst: ${e}`;
        return;
      }
      for (const n of nodes) {
        if (cancelled) return;
        try {
          n.innerHTML = await typst.svg({
            mainContent: TYPST_PRELUDE + n.dataset.typst!,
          });
          // scaleSvg(n);
          n.removeAttribute("data-typst");
        } catch (e) {
          n.textContent = `Typst error: ${e instanceof Error ? e.message : JSON.stringify(e)}`;
          n.classList.add("typst-error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  });
</script>

<div class="prose dark:prose-invert max-w-none" bind:this={container}>
  {@html html}
</div>

<style>
  :global(.typst-block) {
    overflow-x: auto;
  }
  :global(.typst-render svg) {
    display: inline-block;
    vertical-align: middle;
    /* No max-width: the viewBox would shrink wide content to fit, cancelling
       TYPST_FONT_PT. .typst-block scrolls horizontally instead. */
    max-width: none;
  }
  :global(.typst-pending) {
    opacity: 0.5;
  }
  :global(.typst-error) {
    color: var(--color-error, #dc2626);
    white-space: pre-wrap;
    font-family: monospace;
  }
  :global(.ref-card) {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    margin: 0.15rem 0;
    border: 1px solid var(--color-base-300);
    border-radius: 0.5rem;
    background: var(--color-base-100);
    text-decoration: none !important;
    color: inherit !important;
    max-width: 100%;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
    transition: box-shadow 0.15s;
  }
  :global(a.ref-card:hover) {
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.2);
    border-color: var(--color-primary);
  }
  :global(.ref-card-icon) {
    font-size: 1.1rem;
    line-height: 1;
  }
  :global(.ref-card-body) {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
    min-width: 0;
  }
  :global(.ref-card-kind) {
    font-size: 0.7rem;
    text-transform: uppercase;
    opacity: 0.6;
  }
  :global(.ref-card-title) {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
