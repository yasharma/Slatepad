import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/react";
import { CODE_BLOCK_LANGUAGES } from "../lib/lowlight";

interface CodeBlockMenuProps {
  editor: Editor | null;
}

export function CodeBlockMenu({ editor }: CodeBlockMenuProps) {
  if (!editor) {
    return null;
  }

  const currentLanguage =
    (editor.getAttributes("codeBlock").language as string | undefined) ??
    "plaintext";

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="codeBlockMenu"
      shouldShow={({ editor: ed }) => ed.isEditable && ed.isActive("codeBlock")}
      options={{ placement: "top-start" }}
      className="code-block-menu"
    >
      <label className="code-block-menu-label" htmlFor="code-block-language">
        Language
      </label>
      <select
        id="code-block-language"
        value={currentLanguage || "plaintext"}
        onChange={(e) => {
          editor
            .chain()
            .focus()
            .updateAttributes("codeBlock", { language: e.target.value })
            .run();
        }}
        className="code-block-menu-select"
      >
        {CODE_BLOCK_LANGUAGES.map((lang) => (
          <option key={lang.value} value={lang.value}>
            {lang.label}
          </option>
        ))}
      </select>
      <span className="code-block-menu-hint">Tab to indent</span>
    </BubbleMenu>
  );
}
