import { useMemo, useState } from "react";
import { filterNotes } from "../lib/searchNotes";
import type { Folder, NoteSummary, SaveStatus, SidebarView, SortOption } from "../lib/types";
import { NoteListItem } from "./NoteListItem";

interface SidebarProps {
  notes: NoteSummary[];
  archivedNotes: NoteSummary[];
  folders: Folder[];
  activeFolderId: string | null;
  sidebarView: SidebarView;
  activeNoteId: string | null;
  saveStatus: SaveStatus;
  onSelectNote: (id: string) => void;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onSetView: (view: SidebarView) => void;
  onTogglePin: (id: string) => void;
  onArchiveNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onDuplicateNote: (id: string) => void;
  onExportPdfNote: (id: string) => void;
  onMoveNoteToFolder: (noteId: string, folderId: string | null) => void;
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
  folders,
  activeFolderId,
  sidebarView,
  activeNoteId,
  saveStatus: _saveStatus,
  onSelectNote,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onSetView,
  onTogglePin,
  onArchiveNote,
  onDeleteNote,
  onDuplicateNote,
  onExportPdfNote,
  onMoveNoteToFolder,
  onEmptyTrash,
}: SidebarProps) {
  const [sort, setSort] = useState<SortOption>("modified");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

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

  const startRename = (folder: Folder) => {
    setEditingFolderId(folder.id);
    setEditingName(folder.name);
  };

  const commitRename = () => {
    if (editingFolderId && editingName.trim()) {
      onRenameFolder(editingFolderId, editingName.trim());
    }
    setEditingFolderId(null);
  };

  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col bg-sidebar-bg">
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
          <>
            <div className="mt-2 space-y-0.5">
              <button
                type="button"
                onClick={() => onSelectFolder(null)}
                className={`flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-xs ${
                  activeFolderId === null
                    ? "bg-surface-active text-text-primary"
                    : "text-text-secondary hover:bg-surface-hover"
                }`}
              >
                <span className="opacity-60">📁</span>
                All notes
              </button>
              {folders.map((folder) =>
                editingFolderId === folder.id ? (
                  <input
                    key={folder.id}
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setEditingFolderId(null);
                    }}
                    className="w-full rounded border border-border bg-input-bg px-1.5 py-1 text-xs text-text-primary outline-none"
                  />
                ) : (
                  <div key={folder.id} className="group flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => onSelectFolder(folder.id)}
                      onDoubleClick={() => startRename(folder)}
                      className={`min-w-0 flex-1 truncate rounded px-1.5 py-1 text-left text-xs ${
                        activeFolderId === folder.id
                          ? "bg-surface-active text-text-primary"
                          : "text-text-secondary hover:bg-surface-hover"
                      }`}
                    >
                      📂 {folder.name}
                    </button>
                    <button
                      type="button"
                      title="Delete folder"
                      onClick={() => onDeleteFolder(folder.id)}
                      className="hidden shrink-0 rounded px-1 text-xs text-text-muted hover:text-red-500 group-hover:block"
                    >
                      ✕
                    </button>
                  </div>
                ),
              )}
              <button
                type="button"
                onClick={() => onCreateFolder("New folder")}
                className="flex w-full items-center gap-1 rounded px-1.5 py-1 text-xs text-text-muted hover:bg-surface-hover hover:text-text-secondary"
              >
                <span>+</span> New folder
              </button>
            </div>

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
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-1">
        {visibleNotes.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-text-secondary">
            {isArchived
              ? "Archive is empty."
              : activeFolderId
                ? "No notes in this folder."
                : "No notes yet. Press ⌘N to create one."}
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {visibleNotes.map((note) => (
              <NoteListItem
                key={note.id}
                note={note}
                active={note.id === activeNoteId}
                folders={folders}
                onSelect={onSelectNote}
                onTogglePin={isArchived ? undefined : onTogglePin}
                onArchive={isArchived ? undefined : onArchiveNote}
                onDelete={onDeleteNote}
                onDuplicate={onDuplicateNote}
                onExportPdf={onExportPdfNote}
                onMoveToFolder={isArchived ? undefined : onMoveNoteToFolder}
              />
            ))}
          </div>
        )}
      </div>

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
