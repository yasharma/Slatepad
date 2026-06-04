import { formatDistanceToNow } from "date-fns";
import { contentPreview } from "../lib/preview";
import type { NoteSummary } from "../lib/types";

interface NoteListItemProps {
  note: NoteSummary;
  active: boolean;
  onSelect: (id: string) => void;
  onTogglePin?: (id: string) => void;
}

export function NoteListItem({
  note,
  active,
  onSelect,
  onTogglePin,
}: NoteListItemProps) {
  return (
    <div
      className={`group flex w-full items-start rounded-md transition-colors ${
        active
          ? "bg-surface-active"
          : "hover:bg-surface-hover"
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(note.id)}
        className="min-w-0 flex-1 px-3 py-2 text-left"
      >
        <div className="flex items-center gap-1.5">
          {note.pinned ? (
            <span className="shrink-0 text-xs text-amber-500" aria-label="Pinned">
              ★
            </span>
          ) : null}
          <span
            className={`truncate text-sm font-medium ${
              active ? "text-text-primary" : "text-text-secondary"
            }`}
          >
            {note.title || "Untitled"}
          </span>
        </div>
        {note.tags ? (
          <div className="mt-0.5 truncate text-xs text-text-muted">
            {note.tags}
          </div>
        ) : null}
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span className="truncate text-xs text-text-secondary">
            {contentPreview(note.content)}
          </span>
          <span className="shrink-0 text-xs text-text-muted">
            {formatDistanceToNow(note.updated_at, { addSuffix: true })}
          </span>
        </div>
      </button>
      {onTogglePin ? (
        <button
          type="button"
          title={note.pinned ? "Unpin" : "Pin"}
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(note.id);
          }}
          className={`mr-1 mt-2 rounded px-1 text-xs opacity-0 transition-opacity group-hover:opacity-100 ${
            note.pinned
              ? "text-amber-500 opacity-100"
              : "text-text-muted hover:text-amber-500"
          }`}
        >
          ★
        </button>
      ) : null}
    </div>
  );
}
