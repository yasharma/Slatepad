import type { ThemePreference } from "../hooks/useTheme";

interface PreferencesDialogProps {
  open: boolean;
  preference: ThemePreference;
  onPreferenceChange: (preference: ThemePreference) => void;
  onClose: () => void;
}

const themeOptions: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function PreferencesDialog({
  open,
  preference,
  onPreferenceChange,
  onClose,
}: PreferencesDialogProps) {
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
        aria-labelledby="preferences-title"
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="preferences-title"
            className="text-base font-semibold text-text-primary"
          >
            Preferences
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-1.5 py-0.5 text-sm text-text-muted hover:bg-surface-hover hover:text-text-secondary"
            aria-label="Close preferences"
          >
            ✕
          </button>
        </div>

        <section className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Appearance
          </h3>
          <div className="mt-3">
            <p className="text-sm text-text-secondary">Theme</p>
            <div
              className="mt-2 inline-flex rounded-lg border border-border bg-surface p-0.5"
              role="radiogroup"
              aria-label="Theme"
            >
              {themeOptions.map((option) => {
                const selected = preference === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onPreferenceChange(option.value)}
                    className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                      selected
                        ? "bg-surface-active text-text-primary shadow-sm"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-text-muted">
              System follows your device appearance setting.
            </p>
          </div>
        </section>

        <section className="mt-6 border-t border-border-subtle pt-4">
          <p className="text-xs text-text-muted">
            More settings coming soon.
          </p>
        </section>
      </div>
    </div>
  );
}
