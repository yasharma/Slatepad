import { sendChatCompletion, type ChatMessage } from "./aiChat";
import type { AiSettings } from "./aiSettings";

const MEETING_SYSTEM_PROMPT = `You are a meeting notes assistant. Given a raw transcript from a meeting, produce structured meeting notes in Markdown with these exact sections:

## Summary
A concise summary of what was discussed (3-5 sentences).

## Key Decisions
Bullet list of decisions made during the meeting. If none, write "None recorded."

## Action Items
Checkbox list of tasks/action items. Include owner name if mentioned (e.g. "- [ ] Review designs — John"). If none, write "None recorded."

## Full Transcript
(The raw transcript will be appended here automatically.)

Reply with ONLY the Markdown content for Summary, Key Decisions, and Action Items sections. Do not include the Full Transcript section — it will be added separately.`;

export function buildMeetingNoteContent(aiMarkdown: string, transcript: string): string {
  return `${aiMarkdown.trim()}\n\n## Full Transcript\n\n${transcript.trim()}`;
}

export async function processMeetingTranscript(
  transcript: string,
  aiSettings: AiSettings,
  signal?: AbortSignal,
): Promise<string> {
  const userMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content: transcript,
  };

  return sendChatCompletion(aiSettings, [userMessage], null, signal, MEETING_SYSTEM_PROMPT);
}
