import { useEffect, useRef, useState } from "react";

const QUICK_EMOJIS = [
  "📝", "💡", "📌", "⭐", "🔥", "✅", "🚀", "📚",
  "🎯", "💬", "🗒️", "🔑", "🧠", "⚡", "🌿", "🎨",
  "🔧", "📊", "🏷️", "💼", "🗺️", "🎵", "🌟", "❤️",
];

interface EmojiPickerProps {
  current: string;
  onPick: (emoji: string) => void;
  onClose: () => void;
}

function EmojiPicker({ current, onPick, onClose }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [custom, setCustom] = useState(current);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("pointerdown", onPointerDown, { capture: true });
    return () => document.removeEventListener("pointerdown", onPointerDown, { capture: true });
  }, [onClose]);

  const apply = (val: string) => {
    onPick(val.trim());
    onClose();
  };

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-50 mt-1 w-72 rounded-xl border border-border bg-modal-bg p-3 shadow-2xl"
      role="dialog"
      aria-label="Choose icon"
    >
      <p className="mb-2 text-xs font-medium text-text-muted">Note icon</p>
      <div className="grid grid-cols-8 gap-1">
        {QUICK_EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            title={e}
            onClick={() => apply(e)}
            className={`flex h-8 w-8 items-center justify-center rounded text-lg hover:bg-surface-hover ${
              current === e ? "bg-surface-active ring-1 ring-border" : ""
            }`}
          >
            {e}
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              apply(custom);
            }
            if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            }
          }}
          placeholder="Type any emoji…"
          className="min-w-0 flex-1 rounded-md border border-border bg-input-bg px-2 py-1.5 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-text-muted"
          maxLength={8}
        />
        {current && (
          <button
            type="button"
            onClick={() => apply("")}
            className="rounded-md border border-border px-2 py-1.5 text-xs text-text-muted hover:bg-surface-hover"
            title="Remove icon"
          >
            ✕
          </button>
        )}
        <button
          type="button"
          onClick={() => apply(custom)}
          className="rounded-md bg-surface-active px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface-hover"
        >
          Set
        </button>
      </div>
      <p className="mt-2 text-xs text-text-muted">
        Press Ctrl+Cmd+Space (macOS) to open the OS emoji picker inside the text box.
      </p>
    </div>
  );
}

interface TitleInputProps {
  value: string;
  icon: string;
  onChange: (value: string) => void;
  onIconChange: (icon: string) => void;
}

export function TitleInput({ value, icon, onChange, onIconChange }: TitleInputProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="relative flex items-start gap-2">
      <div className="relative mt-1 shrink-0">
        <button
          type="button"
          title="Set note icon"
          onClick={() => setPickerOpen((v) => !v)}
          className={`flex h-9 w-9 items-center justify-center rounded-lg border text-xl transition-colors ${
            icon
              ? "border-border bg-surface-hover hover:bg-surface-active"
              : "border-dashed border-border-subtle text-text-muted hover:border-border hover:bg-surface-hover"
          }`}
          aria-label="Change note icon"
        >
          {icon || (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4 opacity-40"
              aria-hidden
            >
              <path d="M10 2a.75.75 0 0 1 .75.75v6.5h6.5a.75.75 0 0 1 0 1.5h-6.5v6.5a.75.75 0 0 1-1.5 0v-6.5h-6.5a.75.75 0 0 1 0-1.5h6.5v-6.5A.75.75 0 0 1 10 2Z" />
            </svg>
          )}
        </button>
        {pickerOpen && (
          <EmojiPicker
            current={icon}
            onPick={onIconChange}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Untitled"
        className="min-w-0 flex-1 border-0 bg-transparent text-3xl font-bold text-text-primary outline-none placeholder:text-text-muted"
      />
    </div>
  );
}
