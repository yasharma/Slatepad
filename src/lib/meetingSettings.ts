export interface MeetingSettings {
  enabled: boolean;
  onDetect: "ask" | "auto" | "ignore";
  transcriptionModel: string;
  transcriptionLanguage: string; // ISO 639-1 code e.g. "en", "fr", or "" for auto-detect
  autoSummarize: boolean;
}

export const DEFAULT_MEETING_SETTINGS: MeetingSettings = {
  enabled: false,
  onDetect: "ask",
  transcriptionModel: "whisper-1",
  transcriptionLanguage: "en",
  autoSummarize: true,
};

const MEETING_SETTINGS_KEY = "slatepad-meeting-settings";

function isOnDetect(value: unknown): value is MeetingSettings["onDetect"] {
  return value === "ask" || value === "auto" || value === "ignore";
}

export function getStoredMeetingSettings(): MeetingSettings {
  try {
    const raw = localStorage.getItem(MEETING_SETTINGS_KEY);
    if (!raw) {
      return { ...DEFAULT_MEETING_SETTINGS };
    }
    const parsed = JSON.parse(raw) as Partial<MeetingSettings>;
    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : DEFAULT_MEETING_SETTINGS.enabled,
      onDetect: isOnDetect(parsed.onDetect) ? parsed.onDetect : DEFAULT_MEETING_SETTINGS.onDetect,
      transcriptionModel:
        typeof parsed.transcriptionModel === "string" && parsed.transcriptionModel.trim()
          ? parsed.transcriptionModel.trim()
          : DEFAULT_MEETING_SETTINGS.transcriptionModel,
      transcriptionLanguage:
        typeof parsed.transcriptionLanguage === "string"
          ? parsed.transcriptionLanguage.trim()
          : DEFAULT_MEETING_SETTINGS.transcriptionLanguage,
      autoSummarize:
        typeof parsed.autoSummarize === "boolean"
          ? parsed.autoSummarize
          : DEFAULT_MEETING_SETTINGS.autoSummarize,
    };
  } catch {
    return { ...DEFAULT_MEETING_SETTINGS };
  }
}

export function saveMeetingSettings(settings: MeetingSettings): void {
  localStorage.setItem(
    MEETING_SETTINGS_KEY,
    JSON.stringify({
      ...settings,
      transcriptionModel: settings.transcriptionModel.trim(),
    }),
  );
}
