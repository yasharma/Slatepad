import { useEffect, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import { editorExtensions } from "../lib/tiptap";
import { EditorBubbleMenu } from "./EditorBubbleMenu";
import { EditorToolbar, getWordWrap } from "./EditorToolbar";
import { FindBar } from "./FindBar";
import { TableMenu } from "./TableMenu";
import { CodeBlockMenu } from "./CodeBlockMenu";

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
  const savedScrollRef = useRef<number>(0);

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
    onCreate: ({ editor: ed }) => {
      if (!getWordWrap()) {
        (ed.view.dom as HTMLElement).classList.add("no-word-wrap");
      }
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }
    const current = JSON.stringify(editor.getJSON());
    const incoming = JSON.stringify(content);
    if (current !== incoming) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  // Save scroll position on window blur, restore on focus to prevent
  // TipTap from jumping to the cursor position when the window regains focus.
  useEffect(() => {
    if (!editor) return;

    const getScrollContainer = (): HTMLElement | null => {
      let el = editor.view.dom.parentElement;
      while (el) {
        const style = window.getComputedStyle(el);
        if (style.overflowY === "auto" || style.overflowY === "scroll") {
          return el;
        }
        el = el.parentElement;
      }
      return null;
    };

    const onBlur = () => {
      const container = getScrollContainer();
      if (container) savedScrollRef.current = container.scrollTop;
    };
    const onFocus = () => {
      requestAnimationFrame(() => {
        const container = getScrollContainer();
        if (container) container.scrollTop = savedScrollRef.current;
      });
    };

    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [editor]);

  // When findQuery arrives (from QuickSwitcher), open the find bar
  const effectiveFindQuery =
    findQuery && !findOpen ? findQuery : undefined;

  const handleFindClose = () => {
    setFindOpen(false);
    onFindQueryConsumed?.();
    editor?.commands.focus();
  };

  return (
    <div className="contents">
      <EditorToolbar
        editor={editor}
        onFind={() => setFindOpen(true)}
        onInsertDraw={() => editor?.chain().focus().insertContent({ type: "excalidrawBlock" }).run()}
      />
      {findOpen && (
        <FindBar
          editor={editor}
          initialQuery={effectiveFindQuery ?? (findOpen ? findQuery : undefined)}
          onClose={handleFindClose}
        />
      )}
      <EditorBubbleMenu editor={editor} />
      <TableMenu editor={editor} />
      <CodeBlockMenu editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
