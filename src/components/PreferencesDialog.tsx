import { useState } from "react";
import type { MeetingRecorderState } from "../hooks/useMeetingRecorder";
import type { ThemePreference } from "../hooks/useTheme";
import type { UpdateStatus } from "../hooks/useUpdater";
import type { AiSettings } from "../lib/aiSettings";
import type { MeetingSettings } from "../lib/meetingSettings";
import { exportDatabaseBackup, importDatabaseBackup } from "../lib/backup";
import { AiSettingsForm } from "./AiSettingsForm";

interface PreferencesDialogProps {
  open: boolean;
  preference: ThemePreference;
  onPreferenceChange: (preference: ThemePreference) => void;
  onClose: () => void;
  aiSettings: AiSettings;
  onAiSettingsChange: (settings: AiSettings) => void;
  meetingSettings: MeetingSettings;
  onMeetingSettingsChange: (settings: MeetingSettings) => void;
  recorderState: MeetingRecorderState;
  onCheckPermissions: () => void;
  onRequestMicPermission: () => void;
  onRequestSystemAudioPermission: () => void;
  updateStatus: UpdateStatus;
  updateVersion: string | null;
  updateError: string | null;
  upToDateMessage: string | null;
  onCheckForUpdates: () => void;
  onDownloadUpdate: () => void;
}

const themeOptions: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const onDetectOptions: { value: MeetingSettings["onDetect"]; label: string }[] = [
  { value: "ask", label: "Ask" },
  { value: "auto", label: "Auto" },
  { value: "ignore", label: "Ignore" },
];

export function PreferencesDialog({
  open,
  preference,
  onPreferenceChange,
  onClose,
  aiSettings,
  onAiSettingsChange,
  meetingSettings,
  onMeetingSettingsChange,
  recorderState,
  onCheckPermissions,
  onRequestMicPermission,
  onRequestSystemAudioPermission,
  updateStatus,
  updateVersion,
  updateError,
  upToDateMessage,
  onCheckForUpdates,
  onDownloadUpdate,
}: PreferencesDialogProps) {
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) {
    return null;
  }

  const handleExport = async () => {
    setBusy(true);
    setBackupMessage(null);
    setBackupError(null);
    try {
      const path = await exportDatabaseBackup();
      if (path) {
        setBackupMessage(`Backup saved to ${path}`);
      }
    } catch (err) {
      setBackupError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    setBusy(true);
    setBackupMessage(null);
    setBackupError(null);
    try {
      await importDatabaseBackup();
    } catch (err) {
      setBackupError(err instanceof Error ? err.message : "Import failed");
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-modal-bg p-5 shadow-2xl"
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
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-1.5 py-0.5 text-sm text-text-muted hover:bg-surface-hover hover:text-text-secondary"
            aria-label="Close settings"
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
          </div>
        </section>

        <section className="mt-6 border-t border-border-subtle pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            AI
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            Connect to a LiteLLM proxy, Ollama, or any OpenAI-compatible API.
            See <code className="text-xs">scripts/AI.md</code> for setup.
          </p>
          <AiSettingsForm settings={aiSettings} onChange={onAiSettingsChange} />
        </section>

        <section className="mt-6 border-t border-border-subtle pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Meeting Notes
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            Automatically detect meetings, record audio, transcribe, and create notes.
          </p>

          <label className="mt-3 flex cursor-pointer items-center justify-between gap-3">
            <span className="text-sm text-text-secondary">Enable Meeting Notes</span>
            <input
              type="checkbox"
              checked={meetingSettings.enabled}
              onChange={(e) => {
                const enabled = e.target.checked;
                onMeetingSettingsChange({ ...meetingSettings, enabled });
                if (enabled) {
                  void onCheckPermissions();
                }
              }}
              className="h-4 w-4 rounded border-border"
            />
          </label>

          {meetingSettings.enabled && (
            <div className="mt-4 space-y-4">
              {!recorderState.micPermission || !recorderState.systemAudioPermission ? (
                <p className="text-xs text-text-muted">
                  Slatepad needs microphone access to capture your voice and system audio access
                  to capture other meeting participants.
                </p>
              ) : null}

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-text-secondary">
                    Microphone{" "}
                    {recorderState.micPermission ? (
                      <span className="text-green-600 dark:text-green-400">✓ Granted</span>
                    ) : (
                      <span className="text-red-500">✗ Not granted</span>
                    )}
                  </span>
                  {!recorderState.micPermission && (
                    <button
                      type="button"
                      onClick={() => void onRequestMicPermission()}
                      className="rounded-md border border-border px-2 py-1 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                    >
                      Grant
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-text-secondary">
                    System Audio{" "}
                    {recorderState.systemAudioPermission ? (
                      <span className="text-green-600 dark:text-green-400">✓ Granted</span>
                    ) : (
                      <span className="text-red-500">✗ Not granted</span>
                    )}
                  </span>
                  {!recorderState.systemAudioPermission && (
                    <button
                      type="button"
                      onClick={() => void onRequestSystemAudioPermission()}
                      className="rounded-md border border-border px-2 py-1 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                    >
                      Grant
                    </button>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm text-text-secondary">When a meeting is detected</p>
                <div
                  className="mt-2 inline-flex rounded-lg border border-border bg-surface p-0.5"
                  role="radiogroup"
                  aria-label="When a meeting is detected"
                >
                  {onDetectOptions.map((option) => {
                    const selected = meetingSettings.onDetect === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() =>
                          onMeetingSettingsChange({ ...meetingSettings, onDetect: option.value })
                        }
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
              </div>

              <label className="block">
                <span className="text-sm text-text-secondary">Transcription model</span>
                <input
                  type="text"
                  value={meetingSettings.transcriptionModel}
                  onChange={(e) =>
                    onMeetingSettingsChange({
                      ...meetingSettings,
                      transcriptionModel: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-primary"
                  placeholder="whisper-1"
                />
              </label>

              <label className="block">
                <span className="text-sm text-text-secondary">Transcription language</span>
                <input
                  type="text"
                  value={meetingSettings.transcriptionLanguage}
                  onChange={(e) =>
                    onMeetingSettingsChange({
                      ...meetingSettings,
                      transcriptionLanguage: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-primary"
                  placeholder="en (leave blank for auto-detect)"
                />
              </label>

              <label className="flex cursor-pointer items-center justify-between gap-3">
                <span className="text-sm text-text-secondary">Auto-summarize after recording</span>
                <input
                  type="checkbox"
                  checked={meetingSettings.autoSummarize}
                  onChange={(e) =>
                    onMeetingSettingsChange({
                      ...meetingSettings,
                      autoSummarize: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-border"
                />
              </label>
            </div>
          )}
        </section>

        <section className="mt-6 border-t border-border-subtle pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Data
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            Export or import a backup of all your notes and folders.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleExport()}
              className="btn-primary px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Export backup
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleImport()}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary disabled:opacity-50"
            >
              Import backup
            </button>
          </div>
          {backupMessage && (
            <p className="mt-2 text-xs text-green-600 dark:text-green-400">{backupMessage}</p>
          )}
          {backupError && (
            <p className="mt-2 text-xs text-red-500">{backupError}</p>
          )}
        </section>

        <section className="mt-6 border-t border-border-subtle pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Updates
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            Check for app updates from GitHub Releases.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={updateStatus === "checking" || updateStatus === "downloading"}
              onClick={onCheckForUpdates}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary disabled:opacity-50"
            >
              {updateStatus === "checking" ? "Checking…" : "Check for updates"}
            </button>
            {updateStatus === "available" && updateVersion && (
              <button
                type="button"
                onClick={onDownloadUpdate}
                className="btn-primary px-3 py-1.5 text-sm"
              >
                Download v{updateVersion}
              </button>
            )}
          </div>
          {upToDateMessage && (
            <p className="mt-2 text-xs text-text-muted">{upToDateMessage}</p>
          )}
          {updateError && (
            <p className="mt-2 text-xs text-text-muted">{updateError}</p>
          )}
        </section>
      </div>
    </div>
  );
}
