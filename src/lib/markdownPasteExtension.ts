import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { marked } from "marked";

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
  /^\|.*\|.*\|/m,
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
    const editor = this.editor;
    return [
      new Plugin({
        key: new PluginKey("markdownPaste"),
        props: {
          handlePaste(_view, event) {
            const clipboard = event.clipboardData;
            if (!clipboard) return false;

            // If rich HTML is already on the clipboard, let TipTap handle it
            const html = clipboard.getData("text/html");
            if (html && html.trim().length > 0) return false;

            const text = clipboard.getData("text/plain");
            if (!text || !looksLikeMarkdown(text)) return false;

            const rendered = marked.parse(text) as string;
            editor.commands.insertContent(rendered);
            event.preventDefault();
            return true;
          },
        },
      }),
    ];
  },
});
