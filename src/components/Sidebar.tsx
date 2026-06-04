import { useMemo, useState } from "react";
import { filterNotes } from "../lib/searchNotes";
import type { NoteSummary, SaveStatus, SidebarView, SortOption } from "../lib/types";
import { NoteListItem } from "./NoteListItem";

interface SidebarProps {
  notes: NoteSummary[];
  archivedNotes: NoteSummary[];
  sidebarView: SidebarView;
  activeNoteId: string | null;
  saveStatus: SaveStatus;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onSetView: (view: SidebarView) => void;
  onTogglePin: (id: string) => void;
  onArchiveNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onDuplicateNote: (id: string) => void;
  onExportPdfNote: (id: string) => void;
  onOpenPreferences: () => void;
  onShowHelp: () => void;
  onEmptyTrash: () => void;
}

function sortNotes(notes: NoteSummary[], sort: SortOption): NoteSummary[] {
  const copy = [...notes];
  switch (sort) {
    case "modified":
      return copy.sort((a, b) => {
        if (b.pinned !== a.pinned) return b.pinned - a.pinned;
        return b.updated_at - a.updated_at;
      });
    case "created":
      return copy.sort((a, b) => {
        if (b.pinned !== a.pinned) return b.pinned - a.pinned;
        return b.created_at - a.created_at;
      });
    case "alpha":
      return copy.sort((a, b) => {
        if (b.pinned !== a.pinned) return b.pinned - a.pinned;
        const ta = (a.title || "Untitled").toLowerCase();
        const tb = (b.title || "Untitled").toLowerCase();
        return ta.localeCompare(tb);
      });
  }
}

export function Sidebar({
  notes,
  archivedNotes,
  sidebarView,
  activeNoteId,
  saveStatus: _saveStatus,
  onSelectNote,
  onCreateNote,
  onSetView,
  onTogglePin,
  onArchiveNote,
  onDeleteNote,
  onDuplicateNote,
  onExportPdfNote,
  onOpenPreferences,
  onShowHelp,
  onEmptyTrash,
}: SidebarProps) {
  const [sort, setSort] = useState<SortOption>("modified");

  const isArchived = sidebarView === "archived";
  const sourceNotes = isArchived ? archivedNotes : notes;

  const visibleNotes = useMemo(() => {
    const filtered = filterNotes(sourceNotes, "");
    return isArchived ? filtered : sortNotes(filtered, sort);
  }, [sourceNotes, sort, isArchived]);

  const sortLabel: Record<SortOption, string> = {
    modified: "Modified",
    created: "Created",
    alpha: "A–Z",
  };
  const cycleSorts: SortOption[] = ["modified", "created", "alpha"];
  const nextSort = () =>
    setSort((s) => cycleSorts[(cycleSorts.indexOf(s) + 1) % cycleSorts.length]!);

  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-border bg-sidebar-bg">
      {/* Traffic-light spacer + drag region — macOS ⬤⬤⬤ sit at ~y:7, need ~28px */}
      <div
        className="no-print h-[28px] w-full shrink-0 select-none"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      />

      {/* Compact icon header */}
      <div
        className="flex shrink-0 items-center justify-between px-3 pb-2"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        {/* New note */}
        <button
          type="button"
          title="New note (⌘N)"
          onClick={onCreateNote}
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-hover hover:text-text-primary"
          aria-label="New note"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
            <path d="M10 2a.75.75 0 0 1 .75.75v6.5h6.5a.75.75 0 0 1 0 1.5h-6.5v6.5a.75.75 0 0 1-1.5 0v-6.5h-6.5a.75.75 0 0 1 0-1.5h6.5v-6.5A.75.75 0 0 1 10 2Z" />
          </svg>
        </button>

        <div className="flex items-center gap-0.5">
          {/* Search (opens quick switcher) */}
          <button
            type="button"
            title="Search (⌘K)"
            onClick={() => {
              window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
            }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-hover hover:text-text-primary"
            aria-label="Search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Help */}
          <button
            type="button"
            title="Keyboard shortcuts (?)"
            onClick={onShowHelp}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-hover hover:text-text-primary"
            aria-label="Keyboard shortcuts"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-3a1 1 0 0 0-.867.5 1 1 0 1 1-1.731-1A3 3 0 0 1 13 10a3.001 3.001 0 0 1-2 2.83V13a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1 1 1 0 1 0 0-2Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Settings */}
          <button
            type="button"
            title="Settings"
            onClick={onOpenPreferences}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-hover hover:text-text-primary"
            aria-label="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
              <path fillRule="evenodd" d="M8.34 1.804A1 1 0 0 1 9.32 1h1.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l.68 1.178a1 1 0 0 1-.026 1.073l-1.148 1.21a6.964 6.964 0 0 1 0 2.824l1.148 1.21a1 1 0 0 1 .026 1.073l-.68 1.178a1 1 0 0 1-1.186.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.331 1.652a1 1 0 0 1-.98.804H9.32a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-.68-1.178a1 1 0 0 1 .026-1.073l1.148-1.21a6.964 6.964 0 0 1 0-2.824L2.054 6.013a1 1 0 0 1-.026-1.073l.68-1.178a1 1 0 0 1 1.186-.447l1.598.54A6.993 6.993 0 0 1 8.34 2.804l.331-1.652Z" clipRule="evenodd" />
              <path d="M10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Notes / Archive tabs + sort */}
      <div className="shrink-0 px-3 pb-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onSetView("active")}
            className={`flex-1 rounded px-2 py-1 text-xs ${
              !isArchived
                ? "bg-surface-active text-text-primary"
                : "text-text-secondary hover:bg-surface-hover"
            }`}
          >
            Notes
          </button>
          <button
            type="button"
            onClick={() => onSetView("archived")}
            className={`flex-1 rounded px-2 py-1 text-xs ${
              isArchived
                ? "bg-surface-active text-text-primary"
                : "text-text-secondary hover:bg-surface-hover"
            }`}
          >
            Archive ({archivedNotes.length})
          </button>
        </div>
        {!isArchived && (
          <button
            type="button"
            title={`Sort: ${sortLabel[sort]} — click to change`}
            onClick={nextSort}
            className="mt-1.5 flex w-full items-center gap-1 rounded px-1.5 py-1 text-xs text-text-muted hover:bg-surface-hover hover:text-text-secondary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 shrink-0" aria-hidden>
              <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 8a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-6.5A.75.75 0 0 1 2 8Zm0 3.25a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5h-3.5A.75.75 0 0 1 2 11.25Z" clipRule="evenodd" />
            </svg>
            Sort: {sortLabel[sort]}
          </button>
        )}
      </div>

      {/* Note list */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {visibleNotes.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-text-secondary">
            {isArchived ? "Archive is empty." : "No notes yet. Press ⌘N to create one."}
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {visibleNotes.map((note) => (
              <NoteListItem
                key={note.id}
                note={note}
                active={note.id === activeNoteId}
                onSelect={onSelectNote}
                onTogglePin={isArchived ? undefined : onTogglePin}
                onArchive={isArchived ? undefined : onArchiveNote}
                onDelete={onDeleteNote}
                onDuplicate={onDuplicateNote}
                onExportPdf={onExportPdfNote}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom: empty archive */}
      {isArchived && archivedNotes.length > 0 && (
        <div className="shrink-0 border-t border-border px-4 py-2">
          <button
            type="button"
            onClick={onEmptyTrash}
            className="w-full text-left text-xs text-red-500 hover:text-red-600"
          >
            Empty archive
          </button>
        </div>
      )}
    </aside>
  );
}
