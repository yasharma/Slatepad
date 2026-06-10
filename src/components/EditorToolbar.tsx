import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import {
  insertDivider,
  insertTable,
  insertTodayDate,
  insertTodoList,
  toggleHighlight,
} from "../lib/editorCommands";

const WORD_WRAP_KEY = "slatepad-word-wrap";

export function getWordWrap(): boolean {
  try {
    return localStorage.getItem(WORD_WRAP_KEY) !== "false";
  } catch {
    return true;
  }
}

function saveWordWrap(value: boolean) {
  try {
    localStorage.setItem(WORD_WRAP_KEY, value ? "true" : "false");
  } catch { /* ignore */ }
}

interface EditorToolbarProps {
  editor: Editor | null;
  onFind?: () => void;
  onInsertDraw?: () => void;
}

// ── Primitives ──────────────────────────────────────────────────────────────

function Btn({
  active,
  onClick,
  title,
  children,
  className = "",
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex h-7 items-center justify-center rounded px-1.5 text-sm ${
        active
          ? "bg-surface-active text-text-primary"
          : "text-text-secondary hover:bg-surface-hover"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="mx-0.5 h-5 w-px self-center bg-border" />;
}

// ── Dropdown ─────────────────────────────────────────────────────────────────

function Dropdown({
  label,
  title,
  active,
  children,
}: {
  label: ReactNode;
  title: string;
  active?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title={title}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-7 items-center gap-0.5 rounded px-1.5 text-sm ${
          active
            ? "bg-surface-active text-text-primary"
            : "text-text-secondary hover:bg-surface-hover"
        }`}
      >
        {label}
        <svg className="h-3 w-3 opacity-60" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 8L2 4h8z" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 min-w-[140px] overflow-hidden rounded-lg border border-border bg-modal-bg shadow-lg"
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function DropItem({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm ${
        active
          ? "bg-surface-active font-medium text-text-primary"
          : "text-text-secondary hover:bg-surface-hover"
      }`}
    >
      {children}
    </button>
  );
}

// ── SVG icons (inline, no external dep) ─────────────────────────────────────

const Icons = {
  undo: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 0 1-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 0 1 0 10.75H10.75a.75.75 0 0 1 0-1.5h2.875a3.875 3.875 0 0 0 0-7.75H3.622l4.146 3.957a.75.75 0 0 1-1.036 1.085l-5.5-5.25a.75.75 0 0 1 0-1.085l5.5-5.25a.75.75 0 0 1 1.06.025Z" clipRule="evenodd"/>
    </svg>
  ),
  redo: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M12.207 2.232a.75.75 0 0 0 .025 1.06l4.146 3.958H6.375a5.375 5.375 0 0 0 0 10.75H9.25a.75.75 0 0 0 0-1.5H6.375a3.875 3.875 0 0 1 0-7.75h10.003l-4.146 3.957a.75.75 0 0 0 1.036 1.085l5.5-5.25a.75.75 0 0 0 0-1.085l-5.5-5.25a.75.75 0 0 0-1.06.025Z" clipRule="evenodd"/>
    </svg>
  ),
  bold: <span className="text-sm font-bold leading-none">B</span>,
  italic: <span className="text-sm italic leading-none">I</span>,
  strike: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M6.5 11.5a3 3 0 0 0 3 3h1a3 3 0 0 0 3-3H6.5ZM3.25 9.75a.75.75 0 0 0 0 1.5h13.5a.75.75 0 0 0 0-1.5H3.25ZM9 5a2 2 0 0 0-2 2h6a2 2 0 0 0-2-2H9Z"/>
    </svg>
  ),
  code: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M6.28 5.22a.75.75 0 0 1 0 1.06L2.56 10l3.72 3.72a.75.75 0 0 1-1.06 1.06L.97 10.53a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Zm7.44 0a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L17.44 10l-3.72-3.72a.75.75 0 0 1 0-1.06ZM11.377 2.011a.75.75 0 0 1 .612.867l-2.5 14.5a.75.75 0 0 1-1.478-.255l2.5-14.5a.75.75 0 0 1 .866-.612Z" clipRule="evenodd"/>
    </svg>
  ),
  highlight: (
    <span className="rounded-sm bg-amber-200/80 px-0.5 text-xs font-bold leading-none dark:bg-amber-400/40">
      A
    </span>
  ),
  link: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3Z"/>
      <path d="M11.603 7.963a.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 1 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865Z"/>
    </svg>
  ),
  bulletList: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M6 4.75A.75.75 0 0 1 6.75 4h10.5a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 4.75ZM6 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 10Zm0 5.25a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75a.75.75 0 0 1-.75-.75ZM2.5 5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm0 5.25a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm0 5.25a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd"/>
    </svg>
  ),
  orderedList: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M6 4.75A.75.75 0 0 1 6.75 4h10.5a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 4.75ZM6 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 10Zm0 5.25a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd"/>
      <path d="M2.003 4.4c.195-.25.44-.4.747-.4.44 0 .75.31.75.7 0 .21-.07.38-.21.54L2.1 6.5H3.5a.5.5 0 0 1 0 1H1.5a.5.5 0 0 1-.4-.8l1.5-1.9A.7.7 0 0 0 2.75 4.7a.25.25 0 0 0-.25.25.5.5 0 0 1-1 0c0-.21.07-.4.503-.55ZM1.5 10a.5.5 0 0 1 0-1h1a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-1.5H1.5Zm0 4.5a.5.5 0 0 1 0-1H2.5v-.5H2a.5.5 0 0 1 0-1h.5v-.5H1.5a.5.5 0 0 1 0-1h1.25c.414 0 .75.336.75.75v2.5a.75.75 0 0 1-.75.75H1.5Z"/>
    </svg>
  ),
  taskList: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M3 3.5A1.5 1.5 0 0 1 4.5 2h6.879a1.5 1.5 0 0 1 1.06.44l4.122 4.12A1.5 1.5 0 0 1 17 7.622V16.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 16.5v-13Zm6.75 5.25a.75.75 0 0 0-1.5 0v4.59l-1.72-1.72a.75.75 0 0 0-1.06 1.06l3 3a.75.75 0 0 0 1.06 0l3-3a.75.75 0 1 0-1.06-1.06l-1.72 1.72V8.75Z" clipRule="evenodd"/>
    </svg>
  ),
  table: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M.99 5.24A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25l.01 9.5A2.25 2.25 0 0 1 16.76 17H3.26A2.267 2.267 0 0 1 1 14.75l-.01-9.51Zm8.26 9.52v-.625a.75.75 0 0 0-.75-.75H3.25a.75.75 0 0 0-.75.75v.615c0 .414.336.75.75.75h5.09a.75.75 0 0 0 .655-.74Zm1.5 0a.75.75 0 0 0 .656.74h5.09a.75.75 0 0 0 .75-.75v-.615a.75.75 0 0 0-.75-.75H11.5a.75.75 0 0 0-.75.75v.625Zm6.5-3.01v-.625a.75.75 0 0 0-.75-.75H11.5a.75.75 0 0 0-.75.75v.625c0 .414.336.75.75.75h5.246a.75.75 0 0 0 .75-.75Zm-8-.625v.625a.75.75 0 0 1-.75.75H3.25a.75.75 0 0 1-.75-.75v-.625c0-.414.336-.75.75-.75H8.5a.75.75 0 0 1 .75.75Zm0-2.005v-.625A.75.75 0 0 0 8.5 8H3.25a.75.75 0 0 0-.75.75v.625c0 .414.336.75.75.75H8.5a.75.75 0 0 0 .75-.75Zm8 0v-.625A.75.75 0 0 0 16.75 8H11.5a.75.75 0 0 0-.75.75v.625c0 .414.336.75.75.75h5.25a.75.75 0 0 0 .75-.75ZM8.5 6.25v.625A.75.75 0 0 1 7.75 7H3.25A.75.75 0 0 1 2.5 6.25v-.615a.75.75 0 0 1 .75-.75H7.75A.75.75 0 0 1 8.5 5.634v.616Zm8 0v.615A.75.75 0 0 1 15.75 7h-4.5A.75.75 0 0 1 10.5 6.25V5.635a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 .75.75v.615Z" clipRule="evenodd"/>
    </svg>
  ),
  draw: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"/>
    </svg>
  ),
  wordwrap: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 5A.75.75 0 0 1 2.75 9h9.5a2.75 2.75 0 1 1 0 5.5H9.81l1.22 1.22a.75.75 0 1 1-1.06 1.06l-2.5-2.5a.75.75 0 0 1 0-1.06l2.5-2.5a.75.75 0 1 1 1.06 1.06L9.81 13H12.25a1.25 1.25 0 1 0 0-2.5h-9.5A.75.75 0 0 1 2 9.75ZM2 14.75a.75.75 0 0 1 .75-.75h5a.75.75 0 0 1 0 1.5h-5a.75.75 0 0 1-.75-.75Z" clipRule="evenodd"/>
    </svg>
  ),
  search: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd"/>
    </svg>
  ),
  date: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd"/>
    </svg>
  ),
  divider: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd"/>
    </svg>
  ),
};

// ── Heading label ────────────────────────────────────────────────────────────

function HeadingLabel({ editor }: { editor: Editor }) {
  for (let i = 1; i <= 4; i++) {
    if (editor.isActive("heading", { level: i })) {
      return <span className="w-5 text-center text-xs font-semibold">H{i}</span>;
    }
  }
  return <span className="w-5 text-center text-xs font-semibold">¶</span>;
}

// ── List label ───────────────────────────────────────────────────────────────

function ListLabel({ editor }: { editor: Editor }) {
  if (editor.isActive("bulletList")) return Icons.bulletList;
  if (editor.isActive("orderedList")) return Icons.orderedList;
  if (editor.isActive("taskList")) return Icons.taskList;
  return Icons.bulletList;
}

// ── Toolbar ──────────────────────────────────────────────────────────────────

export function EditorToolbar({ editor, onFind, onInsertDraw }: EditorToolbarProps) {
  const [wordWrap, setWordWrap] = useState(getWordWrap);

  if (!editor) return null;

  const isHeadingActive = [1, 2, 3, 4].some((l) =>
    editor.isActive("heading", { level: l }),
  );
  const isListActive =
    editor.isActive("bulletList") ||
    editor.isActive("orderedList") ||
    editor.isActive("taskList");

  const toggleWordWrap = () => {
    const next = !wordWrap;
    setWordWrap(next);
    saveWordWrap(next);
    const pm = editor.view.dom as HTMLElement;
    pm.classList.toggle("no-word-wrap", !next);
  };

  return (
    <div className="mb-3 flex items-center gap-0.5 border-b border-border-subtle pb-2 flex-wrap">
      {/* Undo / Redo */}
      <Btn
        title="Undo (⌘Z)"
        onClick={() => editor.chain().focus().undo().run()}
      >
        {Icons.undo}
      </Btn>
      <Btn
        title="Redo (⌘⇧Z)"
        onClick={() => editor.chain().focus().redo().run()}
      >
        {Icons.redo}
      </Btn>

      <Sep />

      {/* Heading dropdown */}
      <Dropdown
        title="Heading"
        active={isHeadingActive}
        label={<HeadingLabel editor={editor} />}
      >
        <DropItem
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <span className="w-5 text-base font-bold">H1</span>
          <span className="text-text-muted">Heading 1</span>
        </DropItem>
        <DropItem
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <span className="w-5 font-semibold">H2</span>
          <span className="text-text-muted">Heading 2</span>
        </DropItem>
        <DropItem
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <span className="w-5 text-sm font-semibold">H3</span>
          <span className="text-text-muted">Heading 3</span>
        </DropItem>
        <DropItem
          active={editor.isActive("heading", { level: 4 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
        >
          <span className="w-5 text-xs font-semibold">H4</span>
          <span className="text-text-muted">Heading 4</span>
        </DropItem>
        <div className="my-1 border-t border-border-subtle" />
        <DropItem
          active={editor.isActive("paragraph")}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          <span className="w-5">¶</span>
          <span className="text-text-muted">Paragraph</span>
        </DropItem>
      </Dropdown>

      {/* List dropdown */}
      <Dropdown
        title="List"
        active={isListActive}
        label={<ListLabel editor={editor} />}
      >
        <DropItem
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          {Icons.bulletList}
          <span className="text-text-muted">Bullet List</span>
        </DropItem>
        <DropItem
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          {Icons.orderedList}
          <span className="text-text-muted">Ordered List</span>
        </DropItem>
        <DropItem
          active={editor.isActive("taskList")}
          onClick={() => insertTodoList(editor)}
        >
          {Icons.taskList}
          <span className="text-text-muted">Task List</span>
        </DropItem>
      </Dropdown>

      <Sep />

      {/* Inline formatting */}
      <Btn
        title="Bold (⌘B)"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        {Icons.bold}
      </Btn>
      <Btn
        title="Italic (⌘I)"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        {Icons.italic}
      </Btn>
      <Btn
        title="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        {Icons.strike}
      </Btn>
      <Btn
        title="Inline code"
        active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        {Icons.code}
      </Btn>
      <Btn
        title="Highlight"
        active={editor.isActive("highlight")}
        onClick={() => toggleHighlight(editor)}
      >
        {Icons.highlight}
      </Btn>

      <Sep />

      {/* Insert dropdown */}
      <Dropdown title="Insert" label={<span className="text-xs font-medium">Insert</span>}>
        <DropItem onClick={() => insertTodayDate(editor)}>
          {Icons.date}
          <span className="text-text-muted">Today's date</span>
        </DropItem>
        <DropItem
          active={editor.isActive("horizontalRule")}
          onClick={() => insertDivider(editor)}
        >
          {Icons.divider}
          <span className="text-text-muted">Divider</span>
        </DropItem>
        <DropItem
          active={editor.isActive("table")}
          onClick={() => insertTable(editor)}
        >
          {Icons.table}
          <span className="text-text-muted">Table</span>
        </DropItem>
        {onInsertDraw && (
          <DropItem onClick={onInsertDraw}>
            {Icons.draw}
            <span className="text-text-muted">Drawing</span>
          </DropItem>
        )}
      </Dropdown>

      <Sep />

      {/* Utilities */}
      <Btn
        title={wordWrap ? "Disable word wrap" : "Enable word wrap"}
        active={wordWrap}
        onClick={toggleWordWrap}
      >
        {Icons.wordwrap}
      </Btn>
      {onFind && (
        <Btn title="Find in note (⌘F)" onClick={onFind}>
          {Icons.search}
        </Btn>
      )}
    </div>
  );
}
