import type { MeetingRecorderState } from "../hooks/useMeetingRecorder";

interface MeetingBarProps {
  enabled: boolean;
  state: MeetingRecorderState;
  onStop: () => void;
  onOpenNote: (id: string) => void;
  onTranscribe: () => void;
  onDismiss: () => void;
  onDismissError: () => void;
}

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function Spinner() {
  return (
    <span
      className="inline-block h-3 w-3 animate-spin rounded-full border border-text-muted border-t-transparent"
      aria-hidden
    />
  );
}

export function MeetingBar({
  enabled,
  state,
  onStop,
  onOpenNote,
  onTranscribe,
  onDismiss,
  onDismissError,
}: MeetingBarProps) {
  if (!enabled) {
    return null;
  }

  const visible =
    state.status === "recording" ||
    state.status === "recorded" ||
    state.status === "processing" ||
    state.status === "done" ||
    state.status === "error";

  if (!visible) {
    return <div className="h-0 shrink-0" aria-hidden />;
  }

  return (
    <div
      className="no-print flex h-7 shrink-0 items-center justify-center gap-2 border-t border-border-subtle bg-sidebar-bg px-3 text-xs text-text-muted"
      role="status"
    >
      {state.status === "recording" && (
        <>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <span>
            Recording — {state.detectedApp ?? "Meeting"} — {formatElapsed(state.elapsedSeconds)}
          </span>
          <button
            type="button"
            onClick={() => void onStop()}
            className="rounded border border-border px-2 py-0.5 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary"
          >
            Stop
          </button>
        </>
      )}

      {state.status === "recorded" && (
        <>
          <span className="text-green-600 dark:text-green-400" aria-hidden>
            ✓
          </span>
          <span>Recording saved — {formatElapsed(state.elapsedSeconds)}</span>
          <button
            type="button"
            onClick={() => void onTranscribe()}
            className="btn-primary px-2 py-0.5 text-xs"
          >
            Transcribe &amp; Summarize
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded border border-border px-2 py-0.5 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary"
          >
            Dismiss
          </button>
        </>
      )}

      {state.status === "processing" && (
        <>
          <Spinner />
          <span>
            {state.processingStep === "summarizing"
              ? "Summarizing with AI…"
              : "Transcribing audio…"}
          </span>
        </>
      )}

      {state.status === "done" && state.createdNoteId && (
        <button
          type="button"
          onClick={() => onOpenNote(state.createdNoteId!)}
          className="flex items-center gap-1.5 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
        >
          <span aria-hidden>✓</span>
          <span>Meeting note created</span>
        </button>
      )}

      {state.status === "error" && (
        <>
          <span className="text-red-500" aria-hidden>
            ⚠
          </span>
          <span className="truncate text-red-600 dark:text-red-400">{state.error}</span>
          <button
            type="button"
            onClick={onDismissError}
            className="shrink-0 rounded border border-border px-2 py-0.5 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary"
          >
            Dismiss
          </button>
        </>
      )}
    </div>
  );
}
