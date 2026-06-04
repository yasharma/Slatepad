import { useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import { editorExtensions } from "../lib/tiptap";
import { EditorBubbleMenu } from "./EditorBubbleMenu";
import { EditorToolbar } from "./EditorToolbar";
import { FindBar } from "./FindBar";
import { TableMenu } from "./TableMenu";

interface NoteEditorProps {
  content: JSONContent;
  findQuery?: string;        // pre-populated when jumping from search
  onFindQueryConsumed?: () => void;
  onChange: (contentJson: string) => void;
}

export function NoteEditor({
  content,
  findQuery,
  onFindQueryConsumed,
  onChange,
}: NoteEditorProps) {
  const [findOpen, setFindOpen] = useState(Boolean(findQuery));

  const editor = useEditor({
    immediatelyRender: false,
    extensions: editorExtensions,
    content,
    editorProps: {
      attributes: {
        class:
          "prose prose-stone dark:prose-invert max-w-none min-h-[320px] focus:outline-none text-text-primary",
      },
      handleKeyDown(_view, event) {
        const mod = event.metaKey || event.ctrlKey;
        if (mod && event.key.toLowerCase() === "f") {
          event.preventDefault();
          setFindOpen(true);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(JSON.stringify(ed.getJSON()));
    },
  });

  // When findQuery arrives (from QuickSwitcher), open the find bar
  const effectiveFindQuery =
    findQuery && !findOpen ? findQuery : undefined;

  const handleFindClose = () => {
    setFindOpen(false);
    onFindQueryConsumed?.();
    editor?.commands.focus();
  };

  return (
    <div>
      <EditorToolbar editor={editor} onFind={() => setFindOpen(true)} />
      {findOpen && (
        <FindBar
          editor={editor}
          initialQuery={effectiveFindQuery ?? (findOpen ? findQuery : undefined)}
          onClose={handleFindClose}
        />
      )}
      <EditorBubbleMenu editor={editor} />
      <TableMenu editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
