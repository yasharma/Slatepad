import { useEffect, useMemo, useRef, useState } from "react";
import type { NoteSummary } from "../lib/types";

interface QuickSwitcherProps {
  open: boolean;
  notes: NoteSummary[];
  onSelect: (id: string) => void;
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return notes;
    }
    return notes.filter((note) =>
      (note.title || "Untitled").toLowerCase().includes(q),
    );
  }, [notes, query]);

  useEffect(() => {
    inputRef.current?.focus();
    setQuery("");
    setSelectedIndex(0);
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const choose = (index: number) => {
    const note = filtered[index];
    if (note) {
      onSelect(note.id);
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
        aria-label="Quick switcher"
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Jump to a note…"
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-muted"
        />
        <ul className="max-h-72 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-text-secondary">
              No notes found. Press Enter to create one.
            </li>
          ) : (
            filtered.map((note, index) => (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => choose(index)}
                  className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm ${
                    index === selectedIndex
                      ? "bg-surface-active text-text-primary"
                      : "text-text-secondary hover:bg-surface-hover"
                  }`}
                >
                  {note.pinned ? (
                    <span className="text-amber-500" aria-hidden>
                      ★
                    </span>
                  ) : (
                    <span className="w-3" />
                  )}
                  <span className="truncate">{note.title || "Untitled"}</span>
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="border-t border-border-subtle px-4 py-2 text-xs text-text-muted">
          ↑↓ navigate · Enter open · Esc close
        </div>
      </div>
    </div>
  );
}
