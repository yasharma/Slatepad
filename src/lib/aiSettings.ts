export const AI_SETTINGS_KEY = "slatepad-ai-settings";

export const DEFAULT_SYSTEM_PROMPT = `You are a helpful writing assistant built into Slatepad, a local note-taking app.
You can see the user's currently open note and help them summarize, brainstorm, edit, organize, or answer questions about it.
Be concise and practical. When suggesting edits, show clear before/after examples when useful.
If no note is open, help with general note-taking and writing tasks.`;

export interface AiSettings {
  litellmBaseUrl: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  litellmBaseUrl: "http://localhost:11434/v1",
  apiKey: "",
  model: "llama3.2",
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
};

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function getStoredAiSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(AI_SETTINGS_KEY);
    if (!raw) {
      return { ...DEFAULT_AI_SETTINGS };
    }
    const parsed = JSON.parse(raw) as Partial<AiSettings>;
    return {
      litellmBaseUrl:
        typeof parsed.litellmBaseUrl === "string" && parsed.litellmBaseUrl.trim()
          ? normalizeBaseUrl(parsed.litellmBaseUrl)
          : DEFAULT_AI_SETTINGS.litellmBaseUrl,
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
      model:
        typeof parsed.model === "string" && parsed.model.trim()
          ? parsed.model.trim()
          : DEFAULT_AI_SETTINGS.model,
      systemPrompt:
        typeof parsed.systemPrompt === "string" && parsed.systemPrompt.trim()
          ? parsed.systemPrompt
          : DEFAULT_SYSTEM_PROMPT,
    };
  } catch {
    return { ...DEFAULT_AI_SETTINGS };
  }
}

export function saveAiSettings(settings: AiSettings): void {
  localStorage.setItem(
    AI_SETTINGS_KEY,
    JSON.stringify({
      ...settings,
      litellmBaseUrl: normalizeBaseUrl(settings.litellmBaseUrl),
      model: settings.model.trim(),
    }),
  );
}
