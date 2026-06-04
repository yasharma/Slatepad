import type { ReactNode } from "react";
import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/react";
import { setLink } from "../lib/editorCommands";

interface EditorBubbleMenuProps {
  editor: Editor | null;
}

function BubbleButton({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`bubble-menu-btn ${active ? "is-active" : ""}`}
    >
      {children}
    </button>
  );
}

export function EditorBubbleMenu({ editor }: EditorBubbleMenuProps) {
  if (!editor) {
    return null;
  }

  return (
    <BubbleMenu editor={editor} className="bubble-menu-bar">
      <BubbleButton
        title="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        B
      </BubbleButton>
      <BubbleButton
        title="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <span className="italic">I</span>
      </BubbleButton>
      <BubbleButton
        title="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        S
      </BubbleButton>
      <BubbleButton
        title="Highlight"
        active={editor.isActive("highlight")}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      >
        <span className="rounded-sm bg-amber-300/80 px-0.5 text-stone-900 dark:bg-amber-400/70">
          H
        </span>
      </BubbleButton>
      <BubbleButton
        title="Link"
        active={editor.isActive("link")}
        onClick={() => setLink(editor)}
      >
        Link
      </BubbleButton>
      <BubbleButton
        title="Inline code"
        active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        {"</>"}
      </BubbleButton>
    </BubbleMenu>
  );
}
