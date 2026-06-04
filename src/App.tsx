import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { KeyboardHelp } from "./components/KeyboardHelp";
import { PreferencesDialog } from "./components/PreferencesDialog";
import { NoteMenu } from "./components/NoteMenu";
import { NoteEditor } from "./components/NoteEditor";
import { QuickSwitcher } from "./components/QuickSwitcher";
import { Sidebar } from "./components/Sidebar";
import { TagsInput } from "./components/TagsInput";
import { TitleInput, type TitleInputHandle } from "./components/TitleInput";
import { copyMarkdownToClipboard } from "./lib/exportMarkdown";
import { openPrintPreview } from "./lib/printNote";
import { useNotes } from "./hooks/useNotes";
import { useTheme } from "./hooks/useTheme";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    target.isContentEditable
  );
}

function App() {
  const titleRef = useRef<TitleInputHandle>(null);
  const {
    notes,
    archivedNotes,
    sidebarView,
    setSidebarView,
    activeNote,
    activeContent,
    loading,
    error,
    saveStatus,
    selectNote,
    createNote,
    archiveNote,
    restoreNote,
    deleteArchivedPermanently,
    deleteActiveNote,
    emptyTrash,
    togglePin,
    togglePinById,
    duplicateNote,
    updateTitle,
    updateTags,
    updateContent,
    updateIcon,
    flushSave,
    clearError,
  } = useNotes();

  const { preference, setThemePreference } = useTheme();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [emptyArchiveOpen, setEmptyArchiveOpen] = useState(false);
  const [deleteArchivedOpen, setDeleteArchivedOpen] = useState(false);
  const [deleteDirectOpen, setDeleteDirectOpen] = useState(false);
  const [deleteSidebarId, setDeleteSidebarId] = useState<string | null>(null);
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false);
  const [findQuery, setFindQuery] = useState<string | undefined>();
  const [helpOpen, setHelpOpen] = useState(false);
  const [exportStatus, setExportStatus] = useState<"idle" | "copied">("idle");
  const [fullWidth, setFullWidth] = useState(false);

  const handleCreateNote = useCallback(() => {
    void createNote();
  }, [createNote]);

  const handleArchiveConfirm = useCallback(() => {
    setArchiveOpen(false);
    void archiveNote();
  }, [archiveNote]);

  const handlePrintPdf = useCallback(async () => {
    if (!activeNote) return;
    try {
      await openPrintPreview(activeNote);
    } catch (err) {
      console.error("Print failed:", err);
    }
  }, [activeNote]);

  const handleSidebarArchive = useCallback(
    (id: string) => {
      void selectNote(id).then(() => setArchiveOpen(true));
    },
    [selectNote],
  );

  const handleSidebarDelete = useCallback((id: string) => {
    setDeleteSidebarId(id);
  }, []);

  const handleSidebarDeleteConfirm = useCallback(async () => {
    if (!deleteSidebarId) return;
    setDeleteSidebarId(null);
    // Select the note then delete it
    await selectNote(deleteSidebarId);
    void deleteActiveNote();
  }, [deleteSidebarId, selectNote, deleteActiveNote]);

  const handleTogglePinFromSidebar = useCallback(
    (id: string) => {
      void togglePinById(id);
    },
    [togglePinById],
  );

  const handleExport = useCallback(async () => {
    if (!activeNote) {
      return;
    }
    try {
      await copyMarkdownToClipboard(activeNote.title, activeNote.content);
      setExportStatus("copied");
      window.setTimeout(() => setExportStatus("idle"), 2000);
    } catch {
      clearError();
    }
  }, [activeNote, clearError]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuickSwitcherOpen(true);
        return;
      }

      if (mod && e.key.toLowerCase() === "f" && !quickSwitcherOpen) {
        // Let the NoteEditor's own handleKeyDown deal with it
        // (it intercepts Cmd+F before it bubbles up here)
        return;
      }

      if (mod && e.key === "n") {
        e.preventDefault();
        void createNote();
        return;
      }

      if (mod && e.key === "Backspace" && activeNote && !activeNote.archived_at) {
        e.preventDefault();
        setArchiveOpen(true);
        return;
      }

      if (mod && e.key === "Delete" && activeNote) {
        e.preventDefault();
        setDeleteDirectOpen(true);
        return;
      }

      if (mod && e.key.toLowerCase() === "p" && activeNote && !activeNote.archived_at) {
        e.preventDefault();
        void togglePin();
        return;
      }

      if (e.key === "?" && !isTypingTarget(e.target)) {
        e.preventDefault();
        setHelpOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [createNote, activeNote, togglePin]);

  useEffect(() => {
    const onBeforeUnload = () => {
      void flushSave();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [flushSave]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-app-bg text-text-secondary">
        Loading notes…
      </div>
    );
  }

  const isArchivedNote = Boolean(activeNote?.archived_at);

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      {error && (
        <div
          role="alert"
          className="absolute left-1/2 top-3 z-50 flex max-w-md -translate-x-1/2 items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 shadow-sm dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={clearError}
            className="shrink-0 text-text-muted hover:text-text-primary"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      <Sidebar
        notes={notes}
        archivedNotes={archivedNotes}
        sidebarView={sidebarView}
        activeNoteId={activeNote?.id ?? null}
        saveStatus={saveStatus}
        onSelectNote={(id) => void selectNote(id)}
        onCreateNote={handleCreateNote}
        onSetView={(view) => void setSidebarView(view)}
        onTogglePin={(id) => void handleTogglePinFromSidebar(id)}
        onArchiveNote={handleSidebarArchive}
        onDeleteNote={handleSidebarDelete}
        onDuplicateNote={async (id) => {
          await selectNote(id);
          void duplicateNote();
        }}
        onExportPdfNote={async (id) => {
          await selectNote(id);
          void handlePrintPdf();
        }}
        onOpenPreferences={() => setPreferencesOpen(true)}
        onShowHelp={() => setHelpOpen(true)}
        onEmptyTrash={() => setEmptyArchiveOpen(true)}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        {activeNote && activeContent ? (
          <div className="flex h-full flex-col overflow-y-auto">
            {/* Top bar: blends with sidebar colour strip, then save status + menu */}
            <div
              className="no-print flex shrink-0 flex-col border-b border-border-subtle bg-sidebar-bg"
              style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
            >
              {/* traffic-light spacer row — same height as sidebar's drag strip */}
              <div className="h-[28px] w-full" />
              <div
                className="flex items-center justify-between px-8 py-2"
                style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
              >
              <span className="text-xs text-text-muted">
                {saveStatus === "saving"
                  ? "Saving…"
                  : saveStatus === "saved"
                    ? "Saved"
                    : ""}
              </span>
              <NoteMenu
                pinned={Boolean(activeNote.pinned)}
                fullWidth={fullWidth}
                isArchived={isArchivedNote}
                exportStatus={exportStatus}
                onRename={() => {
                  requestAnimationFrame(() => titleRef.current?.focus());
                }}
                onTogglePin={() => void togglePin()}
                onDuplicate={() => void duplicateNote()}
                onCopyMarkdown={() => void handleExport()}
                onExportPdf={() => void handlePrintPdf()}
                onToggleWidth={() => setFullWidth((v) => !v)}
                onArchive={() => setArchiveOpen(true)}
                onDelete={() =>
                  isArchivedNote
                    ? setDeleteArchivedOpen(true)
                    : setDeleteDirectOpen(true)
                }
                onRestore={isArchivedNote ? () => void restoreNote() : undefined}
              />
              </div>
            </div>

            {/* Note content */}
            <div
              className={`flex flex-1 flex-col overflow-y-auto py-8 ${
                fullWidth ? "px-6" : "mx-auto w-full max-w-3xl px-10"
              }`}
            >
              <TitleInput
                ref={titleRef}
                value={activeNote.title}
                icon={activeNote.icon ?? ""}
                onChange={updateTitle}
                onIconChange={(icon) => void updateIcon(icon)}
              />
              <TagsInput value={activeNote.tags} onChange={updateTags} />
              <div className="mt-4 flex-1">
                <NoteEditor
                  key={activeNote.id}
                  content={activeContent}
                  findQuery={findQuery}
                  onFindQueryConsumed={() => setFindQuery(undefined)}
                  onChange={updateContent}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-text-secondary">
            <p className="text-lg">Select a note or create a new one</p>
            <button
              type="button"
              onClick={handleCreateNote}
              className="btn-primary px-4 py-2 text-sm"
            >
              + New note
            </button>
          </div>
        )}
      </main>

      <QuickSwitcher
        open={quickSwitcherOpen}
        notes={notes}
        onSelect={(id, query) => {
          void selectNote(id);
          if (query) setFindQuery(query);
        }}
        onCreate={handleCreateNote}
        onClose={() => setQuickSwitcherOpen(false)}
      />

      <KeyboardHelp open={helpOpen} onClose={() => setHelpOpen(false)} />

      <PreferencesDialog
        open={preferencesOpen}
        preference={preference}
        onPreferenceChange={setThemePreference}
        onClose={() => setPreferencesOpen(false)}
      />

      <ConfirmDialog
        open={archiveOpen}
        title="Archive note?"
        message="This note will move to Archive. You can restore it later."
        confirmLabel="Archive"
        onConfirm={handleArchiveConfirm}
        onCancel={() => setArchiveOpen(false)}
      />

      <ConfirmDialog
        open={deleteArchivedOpen}
        title="Delete permanently?"
        message="This note will be removed from your local database and cannot be undone."
        onConfirm={() => {
          setDeleteArchivedOpen(false);
          void deleteArchivedPermanently();
        }}
        onCancel={() => setDeleteArchivedOpen(false)}
      />

      <ConfirmDialog
        open={emptyArchiveOpen}
        title="Empty archive?"
        message="All archived notes will be permanently deleted."
        onConfirm={() => {
          setEmptyArchiveOpen(false);
          void emptyTrash();
        }}
        onCancel={() => setEmptyArchiveOpen(false)}
      />

      <ConfirmDialog
        open={deleteDirectOpen}
        title="Delete note permanently?"
        message="This note will be removed immediately and cannot be recovered."
        confirmLabel="Delete"
        onConfirm={() => {
          setDeleteDirectOpen(false);
          void deleteActiveNote();
        }}
        onCancel={() => setDeleteDirectOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(deleteSidebarId)}
        title="Delete note permanently?"
        message="This note will be removed immediately and cannot be recovered."
        confirmLabel="Delete"
        onConfirm={() => void handleSidebarDeleteConfirm()}
        onCancel={() => setDeleteSidebarId(null)}
      />
    </div>
  );
}

export default App;
