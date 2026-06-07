import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { DOMParser as PMDOMParser } from "@tiptap/pm/model";
import { marked } from "marked";

// Patterns that strongly indicate markdown syntax
const MD_PATTERNS = [
  /^#{1,6}\s+\S/m,
  /^[-*+]\s+\S/m,
  /^\d+\.\s+\S/m,
  /^>\s+\S/m,
  /^```/m,
  /^---+\s*$/m,
  /\*\*[^*\n]+\*\*/,
  /__[^_\n]+__/,
  /\[[^\]\n]+\]\([^)\n]+\)/,
  /^\|.+\|.+\|/m,
  /^- \[[ xX]\]\s/m,
  /`[^`\n]+`/,
];

function looksLikeMarkdown(text: string): boolean {
  for (const re of MD_PATTERNS) {
    if (re.test(text)) return true;
  }
  return false;
}

export const MarkdownPasteExtension = Extension.create({
  name: "markdownPaste",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("markdownPaste"),
        props: {
          handlePaste(view, event) {
            const clipboard = event.clipboardData;
            if (!clipboard) return false;

            if (
              Array.from(clipboard.items).some((item) =>
                item.type.startsWith("image/"),
              )
            ) {
              return false;
            }

            // If the clipboard has rich HTML already, let TipTap handle it normally
            const html = clipboard.getData("text/html");
            if (html && html.trim().length > 0) return false;

            const text = clipboard.getData("text/plain");
            if (!text || !looksLikeMarkdown(text)) return false;

            // Convert markdown → HTML
            const rendered = marked.parse(text) as string;

            // Parse the HTML into a ProseMirror slice via the DOM
            const wrapper = document.createElement("div");
            wrapper.innerHTML = rendered;

            const parser = PMDOMParser.fromSchema(view.state.schema);
            const slice = parser.parseSlice(wrapper, { preserveWhitespace: false });

            // Dispatch as a regular ProseMirror transaction (safe inside a plugin)
            const tr = view.state.tr.replaceSelection(slice);
            view.dispatch(tr.scrollIntoView());

            event.preventDefault();
            return true;
          },
        },
      }),
    ];
  },
});
