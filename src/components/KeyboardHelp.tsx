interface KeyboardHelpProps {
  open: boolean;
  onClose: () => void;
}

const shortcuts = [
  { keys: "⌘ N", action: "New note" },
  { keys: "⌘ K", action: "Search / Quick switcher" },
  { keys: "⌘ F", action: "Find within note" },
  { keys: "⌘ P", action: "Pin / unpin note" },
  { keys: "⌘ Backspace", action: "Archive note" },
  { keys: "⌘ Delete", action: "Delete note permanently" },
  { keys: "/", action: "Insert block (slash menu)" },
  { keys: "Right-click note", action: "Pin / Archive / Delete" },
  { keys: "?", action: "Show shortcuts" },
  { keys: "Esc", action: "Close dialogs" },
];

export function KeyboardHelp({ open, onClose }: KeyboardHelpProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-modal-bg p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-help-title"
      >
        <h2
          id="keyboard-help-title"
          className="text-base font-semibold text-text-primary"
        >
          Keyboard shortcuts
        </h2>
        <ul className="mt-4 space-y-2">
          {shortcuts.map((item) => (
            <li
              key={item.keys}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-text-secondary">{item.action}</span>
              <kbd className="rounded border border-border bg-surface-hover px-2 py-0.5 font-mono text-xs text-text-secondary">
                {item.keys}
              </kbd>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onClose}
          className="btn-primary mt-5 w-full px-3 py-2 text-sm"
        >
          Close
        </button>
      </div>
    </div>
  );
}
