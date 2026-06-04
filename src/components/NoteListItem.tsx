import { formatDistanceToNow } from "date-fns";
import { contentPreview } from "../lib/preview";
import type { NoteSummary } from "../lib/types";

interface NoteListItemProps {
  note: NoteSummary;
  active: boolean;
  onSelect: (id: string) => void;
  onTogglePin?: (id: string) => void;
}

function PinIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path d="M12.5 2.5 17.5 7.5l-2 2-1.5-.5-3.5 3.5.5 4-2 2-3.5-3.5-3.5 3.5v-2l3.5-3.5L2 9.5l2-2 4 .5 3.5-3.5-.5-1.5 1.5-1Z" />
    </svg>
  );
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
        <span
          className={`block truncate text-sm font-medium ${
            active ? "text-text-primary" : "text-text-secondary"
          }`}
        >
          {note.title || "Untitled"}
        </span>
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
          aria-label={note.pinned ? "Unpin note" : "Pin note"}
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(note.id);
          }}
          className={`mr-1 mt-2 rounded p-1 transition-opacity ${
            note.pinned
              ? "text-amber-500 opacity-100"
              : "text-text-muted opacity-0 hover:text-amber-500 group-hover:opacity-100"
          }`}
        >
          <PinIcon filled={Boolean(note.pinned)} />
        </button>
      ) : null}
    </div>
  );
}
