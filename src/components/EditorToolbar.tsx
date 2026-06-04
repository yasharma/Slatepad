import type { ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import {
  insertDivider,
  insertTable,
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
      <ToolbarButton
        title="Insert table (3×3 with header)"
        active={editor.isActive("table")}
        onClick={() => insertTable(editor)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
          <path fillRule="evenodd" d="M.99 5.24A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25l.01 9.5A2.25 2.25 0 0 1 16.76 17H3.26A2.267 2.267 0 0 1 1 14.75l-.01-9.51Zm8.26 9.52v-.625a.75.75 0 0 0-.75-.75H3.25a.75.75 0 0 0-.75.75v.615c0 .414.336.75.75.75h5.09a.75.75 0 0 0 .655-.74Zm1.5 0a.75.75 0 0 0 .656.74h5.09a.75.75 0 0 0 .75-.75v-.615a.75.75 0 0 0-.75-.75H11.5a.75.75 0 0 0-.75.75v.625Zm6.5-3.01v-.625a.75.75 0 0 0-.75-.75H11.5a.75.75 0 0 0-.75.75v.625c0 .414.336.75.75.75h5.246a.75.75 0 0 0 .75-.75Zm-8-.625v.625a.75.75 0 0 1-.75.75H3.25a.75.75 0 0 1-.75-.75v-.625c0-.414.336-.75.75-.75H8.5a.75.75 0 0 1 .75.75Zm0-2.005v-.625A.75.75 0 0 0 8.5 8H3.25a.75.75 0 0 0-.75.75v.625c0 .414.336.75.75.75H8.5a.75.75 0 0 0 .75-.75Zm8 0v-.625A.75.75 0 0 0 16.75 8H11.5a.75.75 0 0 0-.75.75v.625c0 .414.336.75.75.75h5.25a.75.75 0 0 0 .75-.75ZM8.5 6.25v.625A.75.75 0 0 1 7.75 7H3.25A.75.75 0 0 1 2.5 6.25v-.615a.75.75 0 0 1 .75-.75H7.75A.75.75 0 0 1 8.5 5.634v.616Zm8 0v.615A.75.75 0 0 1 15.75 7h-4.5A.75.75 0 0 1 10.5 6.25V5.635a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 .75.75v.615Z" clipRule="evenodd" />
        </svg>
      </ToolbarButton>
    </div>
  );
}
