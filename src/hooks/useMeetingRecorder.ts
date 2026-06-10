import { format } from "date-fns";
import { useCallback, useEffect, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { AiSettings } from "../lib/aiSettings";
import * as db from "../lib/db";
import { appendMarkdownToContent } from "../lib/importMarkdown";
import {
  buildMeetingNoteContent,
  processMeetingTranscript,
} from "../lib/meetingProcessor";
import {
  type MeetingSettings,
  saveMeetingSettings,
} from "../lib/meetingSettings";
import { transcribeAudio } from "../lib/transcription";

export interface MeetingRecorderState {
  status:
    | "idle"
    | "detecting"
    | "popup"
    | "recording"
    | "recorded"
    | "processing"
    | "done"
    | "error";
  detectedApp: string | null;
  elapsedSeconds: number;
  processingStep: "transcribing" | "summarizing" | null;
  error: string | null;
  createdNoteId: string | null;
  recordingPath: string | null;
  micPermission: boolean;
  systemAudioPermission: boolean;
}

interface MeetingDetectedPayload {
  app?: string;
  app_name?: string;
}

interface RecordingReadyPayload {
  path: string;
}

interface RecordingProgressPayload {
  elapsed_seconds?: number;
}

interface AudioPermissionsPayload {
  microphone?: boolean;
  system_audio?: boolean;
}

const INITIAL_STATE: MeetingRecorderState = {
  status: "idle",
  detectedApp: null,
  elapsedSeconds: 0,
  processingStep: null,
  error: null,
  createdNoteId: null,
  recordingPath: null,
  micPermission: false,
  systemAudioPermission: false,
};

async function safeInvoke<T>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T | null> {
  try {
    return await invoke<T>(cmd, args);
  } catch (err) {
    console.warn(`Tauri command "${cmd}" failed (may not be registered yet):`, err);
    return null;
  }
}

function parseDetectedApp(payload: MeetingDetectedPayload): string {
  return payload.app?.trim() || payload.app_name?.trim() || "Meeting";
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function buildInitialMeetingNoteJson(
  title: string,
  elapsedSeconds: number,
  recordingPath: string,
): string {
  const duration = formatDuration(elapsedSeconds);
  const recordedDate = format(new Date(), "MMM d, yyyy");

  const content: JSONContent[] = [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: title }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: `Duration: ${duration}  |  Recorded ${recordedDate}`,
        },
      ],
    },
  ];

  content.push({
    type: "audioPlayer",
    attrs: { src: recordingPath, label: "Meeting Recording" },
  });

  content.push({
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Click Transcribe & Summarize in the status bar to generate notes.",
      },
    ],
  });

  return JSON.stringify({ type: "doc", content });
}

export function useMeetingRecorder(
  settings: MeetingSettings,
  aiSettings: AiSettings,
  onNoteCreated: (id: string) => void,
  onSettingsChange?: (settings: MeetingSettings) => void,
) {
  const [state, setState] = useState<MeetingRecorderState>(INITIAL_STATE);
  const settingsRef = useRef(settings);
  const aiSettingsRef = useRef(aiSettings);
  const onNoteCreatedRef = useRef(onNoteCreated);
  const onSettingsChangeRef = useRef(onSettingsChange);
  const unlistenersRef = useRef<UnlistenFn[]>([]);
  const processingRef = useRef(false);
  const handlingReadyRef = useRef(false);
  const stateRef = useRef(state);

  settingsRef.current = settings;
  aiSettingsRef.current = aiSettings;
  onNoteCreatedRef.current = onNoteCreated;
  onSettingsChangeRef.current = onSettingsChange;
  stateRef.current = state;

  const setPartialState = useCallback((patch: Partial<MeetingRecorderState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      stateRef.current = next;
      return next;
    });
  }, []);

  const checkPermissions = useCallback(async () => {
    const result = await safeInvoke<AudioPermissionsPayload>("check_audio_permissions");
    if (result) {
      setPartialState({
        micPermission: Boolean(result.microphone),
        systemAudioPermission: Boolean(result.system_audio),
      });
    }
  }, [setPartialState]);

  const requestMicPermission = useCallback(async () => {
    await safeInvoke("request_microphone_permission");
    await checkPermissions();
  }, [checkPermissions]);

  const requestSystemAudioPermission = useCallback(async () => {
    await safeInvoke("request_system_audio_permission");
    await checkPermissions();
  }, [checkPermissions]);

  const startDetection = useCallback(async () => {
    await safeInvoke("start_meeting_detection");
    setPartialState({ status: "detecting", error: null });
  }, [setPartialState]);

  const stopDetection = useCallback(async () => {
    await safeInvoke("stop_meeting_detection");
    setPartialState({ status: "idle", detectedApp: null, elapsedSeconds: 0 });
  }, [setPartialState]);

  const beginRecording = useCallback(async () => {
    await safeInvoke("start_recording");
    setPartialState({
      status: "recording",
      elapsedSeconds: 0,
      error: null,
    });
  }, [setPartialState]);

  const confirmRecord = useCallback(async () => {
    setPartialState({ status: "recording" });
    await beginRecording();
  }, [beginRecording, setPartialState]);

  const skipMeeting = useCallback(() => {
    setPartialState({ status: "detecting", detectedApp: null });
  }, [setPartialState]);

  const alwaysRecord = useCallback(async () => {
    const nextSettings = { ...settingsRef.current, onDetect: "auto" as const };
    saveMeetingSettings(nextSettings);
    onSettingsChangeRef.current?.(nextSettings);
    setPartialState({ status: "recording" });
    await beginRecording();
  }, [beginRecording, setPartialState]);

  const stopRecording = useCallback(async () => {
    await safeInvoke("stop_recording");
  }, []);

  const toggleRecording = useCallback(async () => {
    if (state.status === "recording") {
      await stopRecording();
      return;
    }
    if (state.status === "detecting" || state.status === "idle" || state.status === "popup") {
      setPartialState({
        status: "recording",
        detectedApp: state.detectedApp ?? "Manual recording",
        elapsedSeconds: 0,
        error: null,
      });
      await beginRecording();
    }
  }, [beginRecording, setPartialState, state.detectedApp, state.status, stopRecording]);

  const resetDone = useCallback(() => {
    setPartialState({
      status: settingsRef.current.enabled ? "detecting" : "idle",
      createdNoteId: null,
      processingStep: null,
      detectedApp: null,
      elapsedSeconds: 0,
      recordingPath: null,
      error: null,
    });
  }, [setPartialState]);

  // Dismiss from "recorded" state — hides the bar but keeps the recording path
  // so the user can still transcribe by re-opening the note or re-triggering.
  const dismissRecorded = useCallback(() => {
    setPartialState({
      status: settingsRef.current.enabled ? "detecting" : "idle",
      detectedApp: null,
      elapsedSeconds: 0,
      error: null,
      // intentionally keep recordingPath and createdNoteId
    });
  }, [setPartialState]);

  const dismissError = useCallback(() => {
    setPartialState({
      status: settingsRef.current.enabled ? "detecting" : "idle",
      error: null,
    });
  }, [setPartialState]);

  const handleRecordingReady = useCallback(
    async (payload: RecordingReadyPayload) => {
      if (handlingReadyRef.current) {
        return;
      }
      handlingReadyRef.current = true;

      try {
        const recordingPath = payload.path?.trim();
        if (!recordingPath) {
          throw new Error("No recording file was returned");
        }

        const elapsedSeconds = stateRef.current.elapsedSeconds;
        const title = `Meeting Notes — ${format(new Date(), "MMM d, yyyy h:mm a")}`;
        const content = buildInitialMeetingNoteJson(
          title,
          elapsedSeconds,
          recordingPath,
        );
        const note = await db.createNote({ templateId: "meeting-notes-auto" });
        await db.updateNote(note.id, { title, content });

        onNoteCreatedRef.current(note.id);
        setPartialState({
          status: "recorded",
          recordingPath,
          createdNoteId: note.id,
          error: null,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to save meeting recording";
        setPartialState({
          status: "error",
          error: message,
        });
      } finally {
        handlingReadyRef.current = false;
      }
    },
    [setPartialState],
  );

  const transcribeAndSummarize = useCallback(async () => {
    if (processingRef.current) {
      return;
    }

    const { recordingPath, createdNoteId } = stateRef.current;

    if (!recordingPath?.trim()) {
      setPartialState({
        status: "error",
        error: "No recording file available for transcription",
      });
      return;
    }

    if (!createdNoteId) {
      setPartialState({
        status: "error",
        error: "Meeting note not found",
      });
      return;
    }

    processingRef.current = true;
    const currentSettings = settingsRef.current;
    const currentAiSettings = aiSettingsRef.current;

    setPartialState({
      status: "processing",
      processingStep: "transcribing",
      error: null,
    });

    try {
      const transcript = await transcribeAudio(
        recordingPath,
        currentAiSettings,
        currentSettings,
      );

      let markdown: string;
      if (currentSettings.autoSummarize) {
        setPartialState({ processingStep: "summarizing" });
        const aiMarkdown = await processMeetingTranscript(transcript, currentAiSettings);
        markdown = buildMeetingNoteContent(aiMarkdown, transcript);
      } else {
        markdown = `## Full Transcript\n\n${transcript.trim()}`;
      }

      const note = await db.getNote(createdNoteId);
      if (!note) {
        throw new Error("Meeting note not found");
      }

      const newContent = appendMarkdownToContent(note.content, markdown);
      await db.updateNote(createdNoteId, { content: newContent });
      onNoteCreatedRef.current(createdNoteId);

      setPartialState({
        status: "done",
        processingStep: null,
        recordingPath: null,
        error: null,
      });
    } catch (err) {
      let message = "Failed to process meeting recording";
      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === "string") {
        message = err;
      } else {
        try { message = JSON.stringify(err); } catch { /* ignore */ }
      }
      setPartialState({
        status: "error",
        processingStep: null,
        error: message,
      });
    } finally {
      processingRef.current = false;
    }
  }, [setPartialState]);

  useEffect(() => {
    if (state.status !== "done") {
      return;
    }
    const timer = window.setTimeout(() => {
      resetDone();
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [resetDone, state.status]);

  useEffect(() => {
    if (!settings.enabled) {
      void stopDetection();
      setState((prev) => ({
        ...INITIAL_STATE,
        micPermission: prev.micPermission,
        systemAudioPermission: prev.systemAudioPermission,
      }));
      return;
    }

    void checkPermissions();
    void startDetection();

    let cancelled = false;

    const setupListeners = async () => {
      const unlisteners: UnlistenFn[] = [];

      unlisteners.push(
        await listen<MeetingDetectedPayload>("meeting-detected", (event) => {
          const app = parseDetectedApp(event.payload);
          const onDetect = settingsRef.current.onDetect;

          if (onDetect === "ignore") {
            return;
          }

          if (onDetect === "auto") {
            setPartialState({ status: "recording", detectedApp: app, elapsedSeconds: 0 });
            void safeInvoke("start_recording");
            return;
          }

          setPartialState({ status: "popup", detectedApp: app });
        }),
      );

      unlisteners.push(
        await listen("meeting-ended", () => {
          void safeInvoke("stop_recording");
        }),
      );

      unlisteners.push(
        await listen<RecordingProgressPayload>("recording-progress", (event) => {
          if (typeof event.payload.elapsed_seconds === "number") {
            setPartialState({ elapsedSeconds: event.payload.elapsed_seconds });
          }
        }),
      );

      unlisteners.push(
        await listen<RecordingReadyPayload>("recording-ready", (event) => {
          void handleRecordingReady(event.payload);
        }),
      );

      if (!cancelled) {
        unlistenersRef.current = unlisteners;
      } else {
        for (const unlisten of unlisteners) {
          unlisten();
        }
      }
    };

    void setupListeners();

    return () => {
      cancelled = true;
      for (const unlisten of unlistenersRef.current) {
        unlisten();
      }
      unlistenersRef.current = [];
      void safeInvoke("stop_meeting_detection");
    };
  }, [
    checkPermissions,
    handleRecordingReady,
    setPartialState,
    settings.enabled,
    startDetection,
    stopDetection,
  ]);

  return {
    state,
    startDetection,
    stopDetection,
    confirmRecord,
    skipMeeting,
    alwaysRecord,
    stopRecording,
    toggleRecording,
    resetDone,
    dismissRecorded,
    dismissError,
    transcribeAndSummarize,
    checkPermissions,
    requestMicPermission,
    requestSystemAudioPermission,
  };
}
