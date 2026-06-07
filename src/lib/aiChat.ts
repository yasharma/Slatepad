import type { AiSettings } from "./aiSettings";
import { contentToMarkdown } from "./exportMarkdown";
import type { Note } from "./types";

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

interface OpenAiChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
}

export function buildNoteContext(note: Note | null): string {
  if (!note) {
    return "No note open";
  }

  const title = note.title?.trim() || "Untitled";
  const tags = note.tags?.trim() || "(none)";
  const body = contentToMarkdown(note.content) || "(empty)";

  return `Title: ${title}
Tags: ${tags}

Content:
${body}`;
}

export function buildSystemMessage(
  settings: AiSettings,
  note: Note | null,
): string {
  const noteContext = buildNoteContext(note);
  return `${settings.systemPrompt}

---
Current note context:
${noteContext}
---`;
}

export function chatCompletionsUrl(baseUrl: string): string {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  if (normalized.endsWith("/chat/completions")) {
    return normalized;
  }
  return `${normalized}/chat/completions`;
}

function buildAuthHeaders(settings: AiSettings): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (settings.apiKey.trim()) {
    headers.Authorization = `Bearer ${settings.apiKey.trim()}`;
  }
  return headers;
}

const CHAT_TIMEOUT_MS = 120_000;
const TEST_TIMEOUT_MS = 30_000;

function mergeAbortSignals(...signals: (AbortSignal | undefined)[]): AbortSignal {
  const controller = new AbortController();
  const onAbort = () => controller.abort();

  for (const signal of signals) {
    if (!signal) {
      continue;
    }
    if (signal.aborted) {
      controller.abort();
      return controller.signal;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  }

  return controller.signal;
}

function normalizeFetchError(err: unknown, timeoutMs: number, userAborted: boolean): Error {
  if (err instanceof DOMException && err.name === "AbortError") {
    if (userAborted) {
      return err;
    }
    return new Error(
      `Request timed out after ${Math.round(timeoutMs / 1000)}s — is the AI server running?`,
    );
  }
  if (err instanceof TypeError) {
    return new Error(
      "Could not reach AI server — check the URL and that Ollama/LiteLLM is running",
    );
  }
  if (err instanceof Error) {
    return err;
  }
  return new Error("Could not reach AI server");
}

async function parseChatResponse(response: Response): Promise<ChatCompletionResponse> {
  try {
    return (await response.json()) as ChatCompletionResponse;
  } catch {
    throw new Error(
      response.ok
        ? "Invalid response from AI server"
        : `Request failed (${response.status})`,
    );
  }
}

async function postChatCompletion(
  settings: AiSettings,
  body: Record<string, unknown>,
  signal: AbortSignal | undefined,
  timeoutMs: number,
): Promise<{ payload: ChatCompletionResponse; response: Response }> {
  const timeoutController = new AbortController();
  const timeoutId = window.setTimeout(() => timeoutController.abort(), timeoutMs);
  const merged = mergeAbortSignals(signal, timeoutController.signal);

  try {
    const response = await fetch(chatCompletionsUrl(settings.litellmBaseUrl), {
      method: "POST",
      headers: buildAuthHeaders(settings),
      body: JSON.stringify(body),
      signal: merged,
    });
    const payload = await parseChatResponse(response);
    return { payload, response };
  } catch (err) {
    throw normalizeFetchError(err, timeoutMs, Boolean(signal?.aborted));
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function testConnection(
  settings: AiSettings,
  signal?: AbortSignal,
): Promise<string> {
  const { payload, response } = await postChatCompletion(
    settings,
    {
      model: settings.model,
      messages: [{ role: "user", content: "Reply with exactly: OK" }],
      max_tokens: 16,
      stream: false,
    },
    signal,
    TEST_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(
      payload.error?.message ?? `Request failed (${response.status})`,
    );
  }

  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Connected, but the model returned an empty response");
  }

  return `Connected to ${settings.model}`;
}

export async function sendChatCompletion(
  settings: AiSettings,
  messages: ChatMessage[],
  note: Note | null,
  signal?: AbortSignal,
): Promise<string> {
  const systemMessage: OpenAiChatMessage = {
    role: "system",
    content: buildSystemMessage(settings, note),
  };

  const apiMessages: OpenAiChatMessage[] = [
    systemMessage,
    ...messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
  ];

  const { payload, response } = await postChatCompletion(
    settings,
    {
      model: settings.model,
      messages: apiMessages,
      stream: false,
    },
    signal,
    CHAT_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(
      payload.error?.message ?? `Request failed (${response.status})`,
    );
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content?.trim()) {
    throw new Error("Empty response from AI model");
  }

  return content.trim();
}

export const QUICK_ACTIONS = [
  { label: "Summarize this note", prompt: "Summarize the open note in a few bullet points." },
  { label: "Suggest tags", prompt: "Suggest 3–5 relevant tags for this note. Reply with comma-separated tags only." },
  { label: "Improve clarity", prompt: "Suggest concrete edits to improve clarity and structure of this note." },
  { label: "Key takeaways", prompt: "What are the key takeaways from this note?" },
] as const;
