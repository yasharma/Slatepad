import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/react";

interface TableMenuProps {
  editor: Editor | null;
}

function MenuButton({
  onClick,
  title,
  children,
  danger,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`table-menu-btn ${danger ? "is-danger" : ""}`}
    >
      {children}
    </button>
  );
}

export function TableMenu({ editor }: TableMenuProps) {
  if (!editor) {
    return null;
  }

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="tableMenu"
      shouldShow={({ editor: ed, state }) =>
        ed.isEditable && ed.isActive("table") && state.selection.empty
      }
      options={{ placement: "top" }}
      className="table-menu"
    >
      <MenuButton
        title="Add row above"
        onClick={() => editor.chain().focus().addRowBefore().run()}
      >
        ↑ Row
      </MenuButton>
      <MenuButton
        title="Add row below"
        onClick={() => editor.chain().focus().addRowAfter().run()}
      >
        ↓ Row
      </MenuButton>
      <MenuButton
        title="Delete row"
        onClick={() => editor.chain().focus().deleteRow().run()}
      >
        − Row
      </MenuButton>
      <span className="table-menu-divider" />
      <MenuButton
        title="Add column left"
        onClick={() => editor.chain().focus().addColumnBefore().run()}
      >
        ← Col
      </MenuButton>
      <MenuButton
        title="Add column right"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
      >
        → Col
      </MenuButton>
      <MenuButton
        title="Delete column"
        onClick={() => editor.chain().focus().deleteColumn().run()}
      >
        − Col
      </MenuButton>
      <span className="table-menu-divider" />
      <MenuButton
        title="Toggle header row"
        onClick={() => editor.chain().focus().toggleHeaderRow().run()}
      >
        Header
      </MenuButton>
      <MenuButton
        title="Delete table"
        danger
        onClick={() => editor.chain().focus().deleteTable().run()}
      >
        Delete table
      </MenuButton>
    </BubbleMenu>
  );
}
