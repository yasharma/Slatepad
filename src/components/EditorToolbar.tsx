import type { ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import {
  insertDivider,
  insertTodayDate,
  insertTodoList,
  toggleHighlight,
} from "../lib/editorCommands";

interface EditorToolbarProps {
  editor: Editor | null;
}

function ToolbarButton({
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
      className={`rounded px-2 py-1 text-sm font-medium ${
        active
          ? "bg-surface-active text-text-primary"
          : "text-text-secondary hover:bg-surface-hover"
      }`}
    >
      {children}
    </button>
  );
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) {
    return null;
  }

  return (
    <div className="mb-3 flex flex-wrap gap-1 border-b border-border-subtle pb-3">
      <ToolbarButton
        title="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        B
      </ToolbarButton>
      <ToolbarButton
        title="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <span className="italic">I</span>
      </ToolbarButton>
      <ToolbarButton
        title="Highlight"
        active={editor.isActive("highlight")}
        onClick={() => toggleHighlight(editor)}
      >
        <span className="rounded-sm bg-amber-200/80 px-0.5 dark:bg-amber-400/40">
          H
        </span>
      </ToolbarButton>
      <span className="mx-1 w-px self-stretch bg-border" />
      <ToolbarButton
        title="Heading 1"
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        H1
      </ToolbarButton>
      <ToolbarButton
        title="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        title="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolbarButton>
      <span className="mx-1 w-px self-stretch bg-border" />
      <ToolbarButton
        title="Bullet list (Tab to nest, Shift+Tab to outdent)"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        • List
      </ToolbarButton>
      <ToolbarButton
        title="Numbered list (Tab to nest, Shift+Tab to outdent)"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1. List
      </ToolbarButton>
      <span className="mx-1 w-px self-stretch bg-border" />
      <ToolbarButton
        title="Todo list"
        active={editor.isActive("taskList")}
        onClick={() => insertTodoList(editor)}
      >
        Todo
      </ToolbarButton>
      <ToolbarButton
        title="Insert today's date"
        onClick={() => insertTodayDate(editor)}
      >
        Date
      </ToolbarButton>
      <ToolbarButton
        title="Divider"
        active={editor.isActive("horizontalRule")}
        onClick={() => insertDivider(editor)}
      >
        Divider
      </ToolbarButton>
    </div>
  );
}
