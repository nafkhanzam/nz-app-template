import { Marked } from "marked";
import DOMPurify from "dompurify";
import katex from "katex";

// Pure markdown → sanitized HTML rendering, free of $lib/SvelteKit imports.

export const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

const FIGURE_RE = /@figure(?:\[([^\]]*)\])?:(\S+)/g;

// `<typst>…</typst>` becomes a placeholder carrying the source; the actual
// (async, wasm) typst → SVG rendering happens client-side in MarkdownOutput.
const typstPlaceholder = (source: string, block: boolean) => {
  const tag = block ? "div" : "span";
  return `<${tag} class="typst-render${block ? " typst-block" : ""}" data-typst="${escapeHtml(source)}"><${tag} class="typst-pending">Rendering typst…</${tag}></${tag}>`;
};

const renderKatex = (tex: string, displayMode: boolean) =>
  katex.renderToString(tex, { throwOnError: false, displayMode, output: "html" });

export function renderMarkdown(content: string): string {
  content = content.replace(FIGURE_RE, (_, label, url) => `![${label || "Figure"}](${url})`);

  const marked = new Marked({
    renderer: {
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const titleAttr = title ? ` title="${title}"` : "";
        return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
      },
    },
    extensions: [
      {
        name: "typstBlock",
        level: "block",
        start(src) {
          return src.match(/<typst>/)?.index;
        },
        tokenizer(src) {
          const match = /^<typst>([\s\S]*?)<\/typst>[ \t]*(?:\n|$)/.exec(src);
          if (!match) return undefined;
          return { type: "typstBlock", raw: match[0], text: match[1].trim() };
        },
        renderer(token) {
          return typstPlaceholder(token.text, true);
        },
      },
      {
        name: "typstInline",
        level: "inline",
        start(src) {
          return src.match(/<typst>/)?.index;
        },
        tokenizer(src) {
          const match = /^<typst>([\s\S]*?)<\/typst>/.exec(src);
          if (!match) return undefined;
          return { type: "typstInline", raw: match[0], text: match[1].trim() };
        },
        renderer(token) {
          return typstPlaceholder(token.text, false);
        },
      },
      {
        name: "mathBlock",
        level: "block",
        start(src) {
          return src.match(/\$\$/)?.index;
        },
        tokenizer(src) {
          const match = /^\$\$([\s\S]+?)\$\$/.exec(src);
          if (!match) return undefined;
          return { type: "mathBlock", raw: match[0], text: match[1].trim() };
        },
        renderer(token) {
          return renderKatex(token.text, true);
        },
      },
      {
        name: "mathInline",
        level: "inline",
        start(src) {
          return src.match(/\$/)?.index;
        },
        tokenizer(src) {
          const match = /^\$(?!\s)((?:\\\$|[^\n$])+?)(?<!\s)\$/.exec(src);
          if (!match) return undefined;
          return { type: "mathInline", raw: match[0], text: match[1].replace(/\\\$/g, "$") };
        },
        renderer(token) {
          return renderKatex(token.text, false);
        },
      },
      {
        name: "linkCard",
        level: "inline",
        start(src) {
          return src.match(/@link(?:\[[^\]]*\])?:/)?.index;
        },
        tokenizer(src) {
          const match = /^@link(?:\[([^\]]*)\])?:(\S+)/.exec(src);
          if (!match) return undefined;
          return { type: "linkCard", raw: match[0], label: match[1], url: match[2] };
        },
        renderer(token) {
          const href = escapeHtml(token.url);
          const label = token.label ? escapeHtml(token.label) : href;
          return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="ref-card not-prose">
            <span class="ref-card-icon">&#128279;</span>
            <span class="ref-card-body">
              <span class="ref-card-kind">Link</span>
              <span class="ref-card-title">${label}</span>
            </span>
          </a>`;
        },
      },
      {
        name: "fileLinkCard",
        level: "inline",
        start(src) {
          return src.match(/@filelink(?:\[[^\]]*\])?:/)?.index;
        },
        tokenizer(src) {
          const match = /^@filelink(?:\[([^\]]*)\])?:(\S+)/.exec(src);
          if (!match) return undefined;
          return { type: "fileLinkCard", raw: match[0], label: match[1], url: match[2] };
        },
        renderer(token) {
          const href = escapeHtml(token.url);
          const label = token.label ? escapeHtml(token.label) : href;
          return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="ref-card not-prose">
            <span class="ref-card-icon">&#128206;</span>
            <span class="ref-card-body">
              <span class="ref-card-kind">File</span>
              <span class="ref-card-title">${label}</span>
            </span>
          </a>`;
        },
      },
    ],
  });

  return DOMPurify.sanitize(marked.parse(content, { async: false }), {
    ADD_ATTR: ["target", "data-typst"],
  });
}
