import { useEffect, useMemo, useRef, useState } from "react";
import { filterNotes } from "../lib/searchNotes";
import { contentPreview } from "../lib/preview";
import type { NoteSummary } from "../lib/types";

interface QuickSwitcherProps {
  open: boolean;
  notes: NoteSummary[];
  onSelect: (id: string, query?: string) => void;
  onCreate: () => void;
  onClose: () => void;
}

export function QuickSwitcher({
  open,
  notes,
  onSelect,
  onCreate,
  onClose,
}: QuickSwitcherProps) {
  if (!open) {
    return null;
  }

  return (
    <QuickSwitcherInner
      notes={notes}
      onSelect={onSelect}
      onCreate={onCreate}
      onClose={onClose}
    />
  );
}

function QuickSwitcherInner({
  notes,
  onSelect,
  onCreate,
  onClose,
}: Omit<QuickSwitcherProps, "open">) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Full-text search (title + tags + body)
  const filtered = useMemo(() => filterNotes(notes, query), [notes, query]);

  useEffect(() => {
    inputRef.current?.focus();
    setQuery("");
    setSelectedIndex(0);
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keep selected item visible
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const choose = (index: number) => {
    const note = filtered[index];
    if (note) {
      // Pass the query so the editor can highlight the search term inside the note
      onSelect(note.id, query.trim() || undefined);
      onClose();
    }
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((i) => (filtered.length ? (i + 1) % filtered.length : 0));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((i) =>
        filtered.length ? (i + filtered.length - 1) % filtered.length : 0,
      );
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (filtered.length > 0) {
        choose(selectedIndex);
      } else {
        onCreate();
        onClose();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[var(--overlay)] p-4 pt-[15vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-modal-bg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Search notes"
      >
        <div className="flex items-center border-b border-border px-3">
          <svg
            className="mr-2 h-4 w-4 shrink-0 text-text-muted"
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
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search notes…"
            className="flex-1 bg-transparent py-3 text-sm text-text-primary outline-none placeholder:text-text-muted"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="ml-1 text-text-muted hover:text-text-secondary"
              aria-label="Clear"
            >
              ✕
            </button>
          )}
        </div>
        <ul ref={listRef} className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-text-secondary">
              {query ? "No notes match your search." : "No notes found."}{" "}
              {!query && "Press Enter to create one."}
            </li>
          ) : (
            filtered.map((note, index) => (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => choose(index)}
                  className={`flex w-full flex-col px-4 py-2.5 text-left ${
                    index === selectedIndex
                      ? "bg-surface-active"
                      : "hover:bg-surface-hover"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {note.icon ? (
                      <span className="shrink-0 text-base leading-none">{note.icon}</span>
                    ) : note.pinned ? (
                      <span className="shrink-0 text-amber-500 text-xs" aria-hidden>📌</span>
                    ) : (
                      <span className="h-4 w-4 shrink-0" />
                    )}
                    <span className="truncate text-sm font-medium text-text-primary">
                      {note.title || "Untitled"}
                    </span>
                  </div>
                  {query && (
                    <p className="mt-0.5 truncate pl-6 text-xs text-text-secondary">
                      {contentPreview(note.content, 120)}
                    </p>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="border-t border-border-subtle px-4 py-2 text-xs text-text-muted">
          ↑↓ navigate · Enter open · Esc close
          {!query && " · Start typing to search full content"}
        </div>
      </div>
    </div>
  );
}
