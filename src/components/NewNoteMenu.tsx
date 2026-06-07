import { useEffect, useRef, useState } from "react";
import { NOTE_TEMPLATES } from "../lib/templates";

interface NewNoteMenuProps {
  onCreate: (templateId?: string) => void;
}

export function NewNoteMenu({ onCreate }: NewNoteMenuProps) {
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

  const pick = (templateId: string) => {
    setOpen(false);
    onCreate(templateId === "blank" ? undefined : templateId);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title="New note (⌘N)"
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-hover hover:text-text-primary"
        aria-label="New note"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
          <path d="M10 2a.75.75 0 0 1 .75.75v6.5h6.5a.75.75 0 0 1 0 1.5h-6.5v6.5a.75.75 0 0 1-1.5 0v-6.5h-6.5a.75.75 0 0 1 0-1.5h6.5v-6.5A.75.75 0 0 1 10 2Z" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-xl border border-border bg-modal-bg py-1.5 shadow-2xl">
          {NOTE_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => pick(template.id)}
              className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            >
              <span className="text-base leading-none">{template.icon}</span>
              {template.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
