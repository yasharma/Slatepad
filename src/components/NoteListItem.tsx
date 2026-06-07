import { useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { contentPreview } from "../lib/preview";
import type { Folder, NoteSummary } from "../lib/types";

interface NoteListItemProps {
  note: NoteSummary;
  active: boolean;
  onSelect: (id: string) => void;
  onTogglePin?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onExportPdf?: (id: string) => void;
  onMoveToFolder?: (noteId: string, folderId: string | null) => void;
  folders?: Folder[];
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

// ── Context menu ──────────────────────────────────────────────────────────────
interface CtxMenuProps {
  x: number;
  y: number;
  note: NoteSummary;
  onClose: () => void;
  onTogglePin?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onExportPdf?: (id: string) => void;
  onMoveToFolder?: (noteId: string, folderId: string | null) => void;
  folders?: Folder[];
}

function SvgIcon({ path, viewBox = "0 0 20 20" }: { path: string; viewBox?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
      aria-hidden
    >
      <path d={path} />
    </svg>
  );
}

function CtxItem({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
        danger
          ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
          : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ContextMenu({
  x,
  y,
  note,
  onClose,
  onTogglePin,
  onArchive,
  onDelete,
  onDuplicate,
  onExportPdf,
  onMoveToFolder,
  folders,
}: CtxMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("pointerdown", handler, { capture: true });
    return () =>
      document.removeEventListener("pointerdown", handler, { capture: true });
  }, [onClose]);

  // Keep menu inside viewport
  const style: React.CSSProperties = {
    position: "fixed",
    left: Math.min(x, window.innerWidth - 210),
    top: Math.min(y, window.innerHeight - 260),
    zIndex: 200,
  };

  const run = (fn: () => void) => { fn(); onClose(); };

  return (
    <div
      ref={ref}
      style={style}
      className="w-52 overflow-hidden rounded-xl border border-border bg-modal-bg py-1.5 shadow-2xl"
      role="menu"
    >
      {onTogglePin && (
        <CtxItem
          icon={<SvgIcon path="M12.5 2.5 17.5 7.5l-2 2-1.5-.5-3.5 3.5.5 4-2 2-3.5-3.5-3.5 3.5v-2l3.5-3.5L2 9.5l2-2 4 .5 3.5-3.5-.5-1.5 1.5-1Z" />}
          label={note.pinned ? "Unpin" : "Pin"}
          onClick={() => run(() => onTogglePin(note.id))}
        />
      )}

      {onDuplicate && (
        <CtxItem
          icon={<SvgIcon path="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1ZM4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z" />}
          label="Duplicate"
          onClick={() => run(() => onDuplicate(note.id))}
        />
      )}

      {onExportPdf && (
        <CtxItem
          icon={<SvgIcon path="M3 16.5v-13A1.5 1.5 0 0 1 4.5 2h7.879A1.5 1.5 0 0 1 13.44 2.44l3.12 3.12A1.5 1.5 0 0 1 17 6.622V16.5A1.5 1.5 0 0 1 15.5 18h-11A1.5 1.5 0 0 1 3 16.5Zm9-14v3.5A1.5 1.5 0 0 0 13.5 7H17" />}
          label="Export PDF"
          onClick={() => run(() => onExportPdf(note.id))}
        />
      )}

      {onMoveToFolder && folders && folders.length > 0 && (
        <>
          <div className="my-1 h-px bg-border-subtle" />
          <p className="px-3 py-0.5 text-xs font-medium text-text-muted">Move to folder</p>
          <CtxItem
            icon={<span className="text-sm">📁</span>}
            label="No folder"
            onClick={() => run(() => onMoveToFolder(note.id, null))}
          />
          {folders.map((folder) => (
            <CtxItem
              key={folder.id}
              icon={<span className="text-sm">📂</span>}
              label={folder.name}
              onClick={() => run(() => onMoveToFolder(note.id, folder.id))}
            />
          ))}
        </>
      )}

      {(onTogglePin || onDuplicate || onExportPdf) && (onArchive || onDelete) && (
        <div className="my-1 h-px bg-border-subtle" />
      )}

      {onArchive && (
        <CtxItem
          icon={<SvgIcon path="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H17v8.75A2.75 2.75 0 0 1 14.25 17H5.75A2.75 2.75 0 0 1 3 14.25V5.5h-.25A.75.75 0 0 1 2 4.75Zm3 .75v8.75c0 .69.56 1.25 1.25 1.25h8.5c.69 0 1.25-.56 1.25-1.25V5.5H5Z" />}
          label="Archive"
          onClick={() => run(() => onArchive(note.id))}
        />
      )}

      {onDelete && (
        <CtxItem
          icon={<SvgIcon path="M5.75 5.5V4.75a2.25 2.25 0 0 1 2.25-2.25h4a2.25 2.25 0 0 1 2.25 2.25V5.5M3 5.5h14M6.5 5.5v9.25A1.75 1.75 0 0 0 8.25 16.5h3.5A1.75 1.75 0 0 0 13.5 14.75V5.5M8.5 8.5v5M11.5 8.5v5" />}
          label="Delete"
          danger
          onClick={() => run(() => onDelete(note.id))}
        />
      )}
    </div>
  );
}

// ── Main list item ────────────────────────────────────────────────────────────
export function NoteListItem({
  note,
  active,
  onSelect,
  onTogglePin,
  onArchive,
  onDelete,
  onDuplicate,
  onExportPdf,
  onMoveToFolder,
  folders,
}: NoteListItemProps) {
  const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
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
            <div className="mt-0.5 truncate text-xs text-text-muted">{note.tags}</div>
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
          onDuplicate={onDuplicate}
          onExportPdf={onExportPdf}
          onMoveToFolder={onMoveToFolder}
          folders={folders}
        />
      )}
    </>
  );
}
