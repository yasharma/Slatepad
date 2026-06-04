import { useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { contentPreview } from "../lib/preview";
import type { NoteSummary } from "../lib/types";

interface NoteListItemProps {
  note: NoteSummary;
  active: boolean;
  onSelect: (id: string) => void;
  onTogglePin?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
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

interface ContextMenuProps {
  x: number;
  y: number;
  note: NoteSummary;
  onClose: () => void;
  onTogglePin?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
}

function ContextMenu({ x, y, note, onClose, onTogglePin, onArchive, onDelete }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("pointerdown", onPointerDown, { capture: true });
    return () => document.removeEventListener("pointerdown", onPointerDown, { capture: true });
  }, [onClose]);

  // Adjust so the menu doesn't overflow the viewport
  const style: React.CSSProperties = {
    position: "fixed",
    left: x,
    top: y,
    zIndex: 200,
  };

  const itemClass =
    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-surface-hover";

  return (
    <div
      ref={ref}
      style={style}
      className="min-w-[160px] overflow-hidden rounded-lg border border-border bg-modal-bg py-1 shadow-xl"
      role="menu"
    >
      {onTogglePin && (
        <button
          type="button"
          className={itemClass}
          onClick={() => { onTogglePin(note.id); onClose(); }}
        >
          📌 {note.pinned ? "Unpin" : "Pin"}
        </button>
      )}
      {onArchive && (
        <>
          <div className="my-1 h-px bg-border-subtle" />
          <button
            type="button"
            className={itemClass}
            onClick={() => { onArchive(note.id); onClose(); }}
          >
            🗂️ Archive
          </button>
        </>
      )}
      {onDelete && (
        <button
          type="button"
          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
          onClick={() => { onDelete(note.id); onClose(); }}
        >
          🗑️ Delete
        </button>
      )}
    </div>
  );
}

export function NoteListItem({
  note,
  active,
  onSelect,
  onTogglePin,
  onArchive,
  onDelete,
}: NoteListItemProps) {
  const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!onTogglePin && !onArchive && !onDelete) return;
    e.preventDefault();
    setCtx({ x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <div
        className={`group flex w-full items-start rounded-md transition-colors ${
          active ? "bg-surface-active" : "hover:bg-surface-hover"
        }`}
        onContextMenu={handleContextMenu}
      >
        <button
          type="button"
          onClick={() => onSelect(note.id)}
          className="min-w-0 flex-1 px-3 py-2 text-left"
        >
          <div className="flex items-center gap-1.5">
            {note.icon ? (
              <span className="shrink-0 text-sm leading-none">{note.icon}</span>
            ) : null}
            <span
              className={`block truncate text-sm font-medium ${
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
      {ctx && (
        <ContextMenu
          x={ctx.x}
          y={ctx.y}
          note={note}
          onClose={() => setCtx(null)}
          onTogglePin={onTogglePin}
          onArchive={onArchive}
          onDelete={onDelete}
        />
      )}
    </>
  );
}
