interface NoteActionsBarProps {
  pinned: boolean;
  onTogglePin: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onArchive: () => void;
  exportStatus: "idle" | "copied";
}

export function NoteActionsBar({
  pinned,
  onTogglePin,
  onDuplicate,
  onExport,
  onArchive,
  exportStatus,
}: NoteActionsBarProps) {
  const actionClass =
    "text-sm text-text-muted hover:text-text-secondary";

  return (
    <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-border-subtle pt-4">
      <button type="button" onClick={onTogglePin} className={actionClass}>
        {pinned ? "Unpin" : "Pin"}
      </button>
      <button type="button" onClick={onDuplicate} className={actionClass}>
        Duplicate
      </button>
      <button type="button" onClick={onExport} className={actionClass}>
        {exportStatus === "copied" ? "Copied!" : "Copy as Markdown"}
      </button>
      <button
        type="button"
        onClick={onArchive}
        className="text-sm text-text-muted hover:text-red-500"
      >
        Archive
      </button>
    </div>
  );
}
