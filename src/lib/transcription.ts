import { readFile } from "@tauri-apps/plugin-fs";
import type { AiSettings } from "./aiSettings";
import type { MeetingSettings } from "./meetingSettings";

// 5-minute chunks at 16kHz mono 16-bit PCM = 5 * 60 * 16000 * 2 bytes = ~9.6MB each
const CHUNK_DURATION_SECONDS = 5 * 60;
const SAMPLE_RATE = 16000;
const BYTES_PER_SAMPLE = 2; // 16-bit
const CHUNK_BYTES = CHUNK_DURATION_SECONDS * SAMPLE_RATE * BYTES_PER_SAMPLE;
const MAX_CHUNK_BYTES = 24 * 1024 * 1024;

interface TranscriptionResponse {
  text?: string;
  error?: {
    message?: string;
  };
}

function transcriptionsUrl(baseUrl: string): string {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  if (normalized.endsWith("/audio/transcriptions")) {
    return normalized;
  }
  return `${normalized}/audio/transcriptions`;
}

function buildAuthHeaders(settings: AiSettings): Record<string, string> {
  const headers: Record<string, string> = {};
  if (settings.apiKey.trim()) {
    headers.Authorization = `Bearer ${settings.apiKey.trim()}`;
  }
  return headers;
}

// WAV header is 44 bytes. Data starts at offset 44.
const WAV_HEADER_SIZE = 44;

/**
 * Build a minimal WAV header for 16kHz mono 16-bit PCM data.
 */
function buildWavHeader(pcmByteLength: number): Uint8Array {
  const header = new ArrayBuffer(WAV_HEADER_SIZE);
  const view = new DataView(header);
  const totalSize = WAV_HEADER_SIZE + pcmByteLength;

  // RIFF chunk
  view.setUint8(0, 0x52); view.setUint8(1, 0x49); view.setUint8(2, 0x46); view.setUint8(3, 0x46); // "RIFF"
  view.setUint32(4, totalSize - 8, true);
  view.setUint8(8, 0x57); view.setUint8(9, 0x41); view.setUint8(10, 0x56); view.setUint8(11, 0x45); // "WAVE"

  // fmt chunk
  view.setUint8(12, 0x66); view.setUint8(13, 0x6d); view.setUint8(14, 0x74); view.setUint8(15, 0x20); // "fmt "
  view.setUint32(16, 16, true);       // chunk size
  view.setUint16(20, 1, true);        // PCM format
  view.setUint16(22, 1, true);        // mono
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * BYTES_PER_SAMPLE, true); // byte rate
  view.setUint16(32, BYTES_PER_SAMPLE, true); // block align
  view.setUint16(34, 16, true);       // bits per sample

  // data chunk
  view.setUint8(36, 0x64); view.setUint8(37, 0x61); view.setUint8(38, 0x74); view.setUint8(39, 0x61); // "data"
  view.setUint32(40, pcmByteLength, true);

  return new Uint8Array(header);
}

/**
 * Split raw PCM bytes (no header) into chunk Blobs, each with a fresh WAV header.
 */
function splitIntoChunks(pcmData: Uint8Array): Blob[] {
  const chunks: Blob[] = [];
  let offset = 0;
  while (offset < pcmData.byteLength) {
    const slice = pcmData.slice(offset, offset + CHUNK_BYTES);
    const header = buildWavHeader(slice.byteLength);
    chunks.push(new Blob([header, slice], { type: "audio/wav" }));
    offset += CHUNK_BYTES;
  }
  return chunks;
}

async function transcribeBlob(
  blob: Blob,
  chunkIndex: number,
  aiSettings: AiSettings,
  meetingSettings: MeetingSettings,
): Promise<string> {
  const formData = new FormData();
  formData.append("file", blob, `recording-part${chunkIndex + 1}.wav`);
  formData.append("model", meetingSettings.transcriptionModel);
  formData.append("response_format", "json");
  if (meetingSettings.transcriptionLanguage.trim()) {
    formData.append("language", meetingSettings.transcriptionLanguage.trim());
  }

  const response = await fetch(transcriptionsUrl(aiSettings.litellmBaseUrl), {
    method: "POST",
    headers: buildAuthHeaders(aiSettings),
    body: formData,
  });

  let payload: TranscriptionResponse;
  try {
    payload = (await response.json()) as TranscriptionResponse;
  } catch {
    throw new Error(
      response.ok
        ? "Invalid response from transcription server"
        : `Transcription failed (${response.status})`,
    );
  }

  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Transcription failed (${response.status})`);
  }

  return payload.text?.trim() ?? "";
}

export async function transcribeAudio(
  filePath: string,
  aiSettings: AiSettings,
  meetingSettings: MeetingSettings,
): Promise<string> {
  const data = await readFile(filePath);

  // Strip the WAV header (44 bytes) to get raw PCM for chunking
  const pcmData = new Uint8Array(data.buffer, WAV_HEADER_SIZE);

  const totalSize = data.byteLength;

  if (totalSize <= MAX_CHUNK_BYTES) {
    // Small enough — send as-is
    const blob = new Blob([data], { type: "audio/wav" });
    const text = await transcribeBlob(blob, 0, aiSettings, meetingSettings);
    if (!text) throw new Error("Transcription returned empty text");
    return text;
  }

  // Large file — split into 5-minute chunks and transcribe sequentially
  const chunks = splitIntoChunks(pcmData);
  const parts: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const text = await transcribeBlob(chunks[i], i, aiSettings, meetingSettings);
    if (text) parts.push(text);
  }

  if (parts.length === 0) throw new Error("Transcription returned empty text");
  return parts.join(" ");
}
