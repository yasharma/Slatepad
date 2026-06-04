import type { JSONContent } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import { editorExtensions } from "../lib/tiptap";
import { EditorBubbleMenu } from "./EditorBubbleMenu";
import { EditorToolbar } from "./EditorToolbar";
import { TableMenu } from "./TableMenu";

interface NoteEditorProps {
  content: JSONContent;
  onChange: (contentJson: string) => void;
}

export function NoteEditor({ content, onChange }: NoteEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: editorExtensions,
    content,
    editorProps: {
      attributes: {
        class:
          "prose prose-stone dark:prose-invert max-w-none min-h-[320px] focus:outline-none text-text-primary",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(JSON.stringify(ed.getJSON()));
    },
  });

  return (
    <div>
      <EditorToolbar editor={editor} />
      <EditorBubbleMenu editor={editor} />
      <TableMenu editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
