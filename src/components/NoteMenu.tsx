import { useEffect, useRef, useState } from "react";

// ── Icon primitives ──────────────────────────────────────────────────────────
function Icon({ d, viewBox = "0 0 20 20" }: { d: string; viewBox?: string }) {
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
      <path d={d} />
    </svg>
  );
}

const icons = {
  rename: (
    <Icon d="M13.586 3.586a2 2 0 1 1 2.828 2.828l-.793.793-2.828-2.828.793-.793ZM11.379 5.793 3 14.172V17h2.828l8.38-8.379-2.83-2.828Z" />
  ),
  pin: (
    <Icon d="M12.5 2.5 17.5 7.5l-2 2-1.5-.5-3.5 3.5.5 4-2 2-3.5-3.5-3.5 3.5v-2l3.5-3.5L2 9.5l2-2 4 .5 3.5-3.5-.5-1.5 1.5-1Z" />
  ),
  duplicate: (
    <Icon d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1ZM4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z" />
  ),
  markdown: (
    <Icon
      d="M3 5h14M3 10h8M3 15h5"
      viewBox="0 0 20 20"
    />
  ),
  pdf: (
    <Icon d="M3 16.5v-13A1.5 1.5 0 0 1 4.5 2h7.879A1.5 1.5 0 0 1 13.44 2.44l3.12 3.12A1.5 1.5 0 0 1 17 6.622V16.5A1.5 1.5 0 0 1 15.5 18h-11A1.5 1.5 0 0 1 3 16.5Zm9-14v3.5A1.5 1.5 0 0 0 13.5 7H17" />
  ),
  fullWidth: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden>
      <path d="M3 10h14M7 6l-4 4 4 4M13 6l4 4-4 4" />
    </svg>
  ),
  standard: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden>
      <path d="M7 10h6M9 6l-2 4 2 4M11 6l2 4-2 4" />
    </svg>
  ),
  archive: (
    <Icon d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H17v8.75A2.75 2.75 0 0 1 14.25 17H5.75A2.75 2.75 0 0 1 3 14.25V5.5h-.25A.75.75 0 0 1 2 4.75Zm3 .75v8.75c0 .69.56 1.25 1.25 1.25h8.5c.69 0 1.25-.56 1.25-1.25V5.5H5ZM8.5 8.5a.75.75 0 0 1 1.5 0v3a.75.75 0 0 1-1.5 0v-3Z" />
  ),
  trash: (
    <Icon d="M5.75 5.5V4.75a2.25 2.25 0 0 1 2.25-2.25h4a2.25 2.25 0 0 1 2.25 2.25V5.5M3 5.5h14M6.5 5.5v9.25A1.75 1.75 0 0 0 8.25 16.5h3.5A1.75 1.75 0 0 0 13.5 14.75V5.5M8.5 8.5v5M11.5 8.5v5" />
  ),
};

// ── Menu item ─────────────────────────────────────────────────────────────────
interface ItemProps {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}

function MenuItem({ icon, label, danger, onClick }: ItemProps) {
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

function Divider() {
  return <div className="my-1 h-px bg-border-subtle" />;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface NoteMenuProps {
  pinned: boolean;
  fullWidth: boolean;
  isArchived: boolean;
  onRename: () => void;
  onTogglePin: () => void;
  onDuplicate: () => void;
  onCopyMarkdown: () => void;
  onExportPdf: () => void;
  onToggleWidth: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onRestore?: () => void;
  exportStatus: "idle" | "copied";
}

export function NoteMenu(props: NoteMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handler, { capture: true });
    return () =>
      document.removeEventListener("pointerdown", handler, { capture: true });
  }, [open]);

  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        title="More options"
        aria-label="Note options"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary ${
          open ? "bg-surface-hover text-text-secondary" : ""
        }`}
      >
        {/* three-dot icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
          aria-hidden
        >
          <path d="M3 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM8.5 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM15.5 8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-xl border border-border bg-modal-bg py-1.5 shadow-2xl">
          <MenuItem
            icon={icons.rename}
            label="Rename"
            onClick={() => run(props.onRename)}
          />

          {!props.isArchived && (
            <MenuItem
              icon={icons.pin}
              label={props.pinned ? "Unpin" : "Pin"}
              onClick={() => run(props.onTogglePin)}
            />
          )}

          <Divider />

          <MenuItem
            icon={icons.duplicate}
            label="Duplicate"
            onClick={() => run(props.onDuplicate)}
          />
          <MenuItem
            icon={icons.markdown}
            label={props.exportStatus === "copied" ? "Copied!" : "Copy as Markdown"}
            onClick={() => run(props.onCopyMarkdown)}
          />
          <MenuItem
            icon={icons.pdf}
            label="Export PDF"
            onClick={() => run(props.onExportPdf)}
          />

          <Divider />

          <MenuItem
            icon={props.fullWidth ? icons.standard : icons.fullWidth}
            label={props.fullWidth ? "Standard width" : "Full width"}
            onClick={() => run(props.onToggleWidth)}
          />

          <Divider />

          {props.isArchived ? (
            <>
              {props.onRestore && (
                <MenuItem
                  icon={icons.archive}
                  label="Restore"
                  onClick={() => run(props.onRestore!)}
                />
              )}
              <MenuItem
                icon={icons.trash}
                label="Delete permanently"
                danger
                onClick={() => run(props.onDelete)}
              />
            </>
          ) : (
            <>
              <MenuItem
                icon={icons.archive}
                label="Archive"
                onClick={() => run(props.onArchive)}
              />
              <MenuItem
                icon={icons.trash}
                label="Delete"
                danger
                onClick={() => run(props.onDelete)}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
