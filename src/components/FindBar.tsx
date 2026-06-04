import { useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { findPluginKey } from "../lib/findExtension";

interface FindBarProps {
  editor: Editor | null;
  initialQuery?: string;
  onClose: () => void;
}

export function FindBar({ editor, initialQuery, onClose }: FindBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount and set initial query
  useEffect(() => {
    if (!editor) return;
    const q = initialQuery ?? "";
    if (q) {
      editor.commands.setSearch(q);
    }
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => {
      editor.commands.clearSearch();
    };
  }, [editor, initialQuery]);

  if (!editor) return null;

  const findState = findPluginKey.getState(editor.state);
  const matchCount = findState?.matches.length ?? 0;
  const activeIndex = findState?.activeIndex ?? 0;
  const term = findState?.term ?? "";

  const handleChange = (value: string) => {
    editor.commands.setSearch(value);
    // Scroll active match into view
    scrollActive(editor);
  };

  const next = () => {
    editor.commands.findNext();
    scrollActive(editor);
  };

  const prev = () => {
    editor.commands.findPrev();
    scrollActive(editor);
  };

  const close = () => {
    editor.commands.clearSearch();
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") { e.preventDefault(); close(); }
    if (e.key === "Enter") {
      e.preventDefault();
      e.shiftKey ? prev() : next();
    }
    if (e.key === "F3") { e.preventDefault(); e.shiftKey ? prev() : next(); }
  };

  return (
    <div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-2 no-print">
      <svg
        className="h-3.5 w-3.5 shrink-0 text-text-muted"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
          clipRule="evenodd"
        />
      </svg>

      <input
        ref={inputRef}
        type="text"
        defaultValue={initialQuery ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Find in note…"
        className="w-48 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
        aria-label="Find in note"
      />

      <span className="min-w-[4rem] text-xs text-text-muted">
        {term
          ? matchCount === 0
            ? "No results"
            : `${activeIndex + 1} / ${matchCount}`
          : ""}
      </span>

      <button
        type="button"
        onClick={prev}
        disabled={matchCount === 0}
        title="Previous match (Shift+Enter)"
        className="rounded p-1 text-text-muted hover:bg-surface-hover hover:text-text-secondary disabled:opacity-30"
        aria-label="Previous match"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
          <path fillRule="evenodd" d="M11.78 9.78a.75.75 0 0 1-1.06 0L8 7.06 5.28 9.78a.75.75 0 0 1-1.06-1.06l3.25-3.25a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      <button
        type="button"
        onClick={next}
        disabled={matchCount === 0}
        title="Next match (Enter)"
        className="rounded p-1 text-text-muted hover:bg-surface-hover hover:text-text-secondary disabled:opacity-30"
        aria-label="Next match"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
          <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L8.53 10.53a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      <button
        type="button"
        onClick={close}
        title="Close (Esc)"
        className="ml-auto rounded p-1 text-text-muted hover:bg-surface-hover hover:text-text-secondary"
        aria-label="Close find bar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
          <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
        </svg>
      </button>
    </div>
  );
}

function scrollActive(editor: Editor) {
  requestAnimationFrame(() => {
    const el = editor.view.dom.querySelector(".find-match-active");
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}
