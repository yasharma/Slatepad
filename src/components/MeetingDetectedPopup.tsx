import { useEffect, useState } from "react";

interface MeetingDetectedPopupProps {
  detectedApp: string;
  onRecord: () => void;
  onSkip: () => void;
  onAlwaysRecord: () => void;
}

const COUNTDOWN_SECONDS = 10;

export function MeetingDetectedPopup({
  detectedApp,
  onRecord,
  onSkip,
  onAlwaysRecord,
}: MeetingDetectedPopupProps) {
  const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    setRemaining(COUNTDOWN_SECONDS);
    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const next = COUNTDOWN_SECONDS - elapsed;
      if (next <= 0) {
        window.clearInterval(intervalId);
        onSkip();
        return;
      }
      setRemaining(next);
    }, 200);

    return () => window.clearInterval(intervalId);
  }, [detectedApp, onSkip]);

  const progress = (remaining / COUNTDOWN_SECONDS) * 100;

  return (
    <div className="pointer-events-none fixed left-1/2 top-14 z-50 w-full max-w-md -translate-x-1/2 px-4">
      <div className="pointer-events-auto overflow-hidden rounded-xl border border-border bg-modal-bg shadow-2xl">
        <div
          className="h-1 bg-accent transition-[width] duration-200 ease-linear"
          style={{ width: `${progress}%` }}
          aria-hidden
        />
        <div className="px-4 py-3">
          <p className="text-sm font-medium text-text-primary">
            📅 {detectedApp} meeting detected
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Auto-skip in {remaining}s
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onRecord}
              className="btn-primary px-3 py-1.5 text-xs"
            >
              Record
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={onAlwaysRecord}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            >
              Always Record
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
