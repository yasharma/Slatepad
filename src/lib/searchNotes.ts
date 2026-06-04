import { contentPreview } from "./preview";
import type { NoteSummary } from "./types";

export function filterNotes(notes: NoteSummary[], query: string): NoteSummary[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return notes;
  }

  return notes.filter((note) => {
    const title = (note.title || "Untitled").toLowerCase();
    const tags = (note.tags || "").toLowerCase();
    const body = contentPreview(note.content, 500).toLowerCase();
    return title.includes(q) || tags.includes(q) || body.includes(q);
  });
}
