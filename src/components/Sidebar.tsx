import { useMemo, useState } from "react";
import { filterNotes } from "../lib/searchNotes";
import type { NoteSummary, SaveStatus, SidebarView } from "../lib/types";
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
  onOpenPreferences: () => void;
  onShowHelp: () => void;
  onEmptyTrash: () => void;
}

function saveStatusLabel(status: SaveStatus): string {
  switch (status) {
    case "saving":
      return "Saving…";
    case "saved":
      return "Saved";
    default:
      return "Ready";
  }
}

export function Sidebar({
  notes,
  archivedNotes,
  sidebarView,
  activeNoteId,
  saveStatus,
  onSelectNote,
  onCreateNote,
  onSetView,
  onTogglePin,
  onOpenPreferences,
  onShowHelp,
  onEmptyTrash,
}: SidebarProps) {
  const [search, setSearch] = useState("");
  const isArchived = sidebarView === "archived";
  const sourceNotes = isArchived ? archivedNotes : notes;
  const visibleNotes = useMemo(
    () => filterNotes(sourceNotes, search),
    [sourceNotes, search],
  );

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-border bg-sidebar-bg">
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-sm font-semibold tracking-tight text-text-primary">
            Slatepad
          </h1>
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Keyboard shortcuts"
              onClick={onShowHelp}
              className="rounded px-1.5 py-0.5 text-xs text-text-muted hover:bg-surface-hover hover:text-text-secondary"
            >
              ?
            </button>
            <button
              type="button"
              title="Preferences"
              onClick={onOpenPreferences}
              className="rounded px-1.5 py-0.5 text-xs text-text-muted hover:bg-surface-hover hover:text-text-secondary"
              aria-label="Open preferences"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M8.34 1.804A1 1 0 0 1 9.32 1h1.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l.68 1.178a1 1 0 0 1-.026 1.073l-1.148 1.21a6.964 6.964 0 0 1 0 2.824l1.148 1.21a1 1 0 0 1 .026 1.073l-.68 1.178a1 1 0 0 1-1.186.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.331 1.652a1 1 0 0 1-.98.804H9.32a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-.68-1.178a1 1 0 0 1 .026-1.073l1.148-1.21a6.964 6.964 0 0 1 0-2.824L2.054 6.013a1 1 0 0 1-.026-1.073l.68-1.178a1 1 0 0 1 1.186-.447l1.598.54A6.993 6.993 0 0 1 8.34 2.804l.331-1.652Z"
                  clipRule="evenodd"
                />
                <path d="M10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
              </svg>
            </button>
          </div>
        </div>
        <p className="mt-0.5 text-xs text-text-secondary">
          Offline · local only
        </p>
        {!isArchived && (
          <button
            type="button"
            onClick={onCreateNote}
            className="btn-primary mt-3 w-full px-3 py-2 text-sm font-medium"
          >
            + New note
          </button>
        )}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes…"
          className="mt-3 w-full rounded-md border border-border bg-input-bg px-2.5 py-1.5 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-text-muted"
        />
        <div className="mt-2 flex gap-1">
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
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {visibleNotes.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-text-secondary">
            {isArchived
              ? search
                ? "No archived notes match your search."
                : "Archive is empty."
              : search
                ? "No notes match your search."
                : "No notes yet. Create your first note."}
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
              />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border px-4 py-2">
        {isArchived && archivedNotes.length > 0 && (
          <button
            type="button"
            onClick={onEmptyTrash}
            className="mb-2 w-full text-left text-xs text-red-500 hover:text-red-600"
          >
            Empty archive
          </button>
        )}
        <div className="text-xs text-text-muted">
          {saveStatusLabel(saveStatus)}
        </div>
      </div>
    </aside>
  );
}
