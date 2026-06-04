import Database from "@tauri-apps/plugin-sql";
import { v4 as uuidv4 } from "uuid";
import type { Note, NoteSummary } from "./types";
import { EMPTY_DOC_STRING } from "./types";

const DB_URL = "sqlite:notes.db";

const NOTE_FIELDS =
  "id, title, content, created_at, updated_at, pinned, tags, icon, archived_at";

let dbPromise: Promise<Database> | null = null;

async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL);
  }
  return dbPromise;
}

function mapNote(row: Note): Note {
  return {
    ...row,
    pinned: row.pinned ?? 0,
    tags: row.tags ?? "",
    icon: row.icon ?? "",
    archived_at: row.archived_at ?? null,
  };
}

export async function listNotes(): Promise<NoteSummary[]> {
  const db = await getDb();
  const rows = await db.select<NoteSummary[]>(
    `SELECT id, title, content, created_at, updated_at, pinned, tags, icon, archived_at
     FROM notes
     WHERE archived_at IS NULL
     ORDER BY pinned DESC, updated_at DESC`,
  );
  return rows.map((row) => ({
    ...row,
    pinned: row.pinned ?? 0,
    tags: row.tags ?? "",
    icon: row.icon ?? "",
    archived_at: null,
  }));
}

export async function listArchivedNotes(): Promise<NoteSummary[]> {
  const db = await getDb();
  const rows = await db.select<NoteSummary[]>(
    `SELECT id, title, content, created_at, updated_at, pinned, tags, icon, archived_at
     FROM notes
     WHERE archived_at IS NOT NULL
     ORDER BY archived_at DESC`,
  );
  return rows.map((row) => ({
    ...row,
    pinned: row.pinned ?? 0,
    tags: row.tags ?? "",
    icon: row.icon ?? "",
  }));
}

export async function getNote(id: string): Promise<Note | null> {
  const db = await getDb();
  const rows = await db.select<Note[]>(
    `SELECT ${NOTE_FIELDS} FROM notes WHERE id = $1`,
    [id],
  );
  const row = rows[0];
  return row ? mapNote(row) : null;
}

export async function createNote(): Promise<Note> {
  const db = await getDb();
  const now = Date.now();
  const id = uuidv4();
  const title = "Untitled";
  const content = EMPTY_DOC_STRING;

  await db.execute(
    `INSERT INTO notes (id, title, content, created_at, updated_at, pinned, tags, icon, archived_at)
     VALUES ($1, $2, $3, $4, $5, 0, '', '', NULL)`,
    [id, title, content, now, now],
  );

  return {
    id,
    title,
    content,
    created_at: now,
    updated_at: now,
    pinned: 0,
    tags: "",
    icon: "",
    archived_at: null,
  };
}

export async function duplicateNote(id: string): Promise<Note> {
  const source = await getNote(id);
  if (!source) {
    throw new Error("Note not found");
  }

  const db = await getDb();
  const now = Date.now();
  const newId = uuidv4();
  const title =
    source.title === "Untitled"
      ? "Untitled (copy)"
      : `${source.title} (copy)`;

  await db.execute(
    `INSERT INTO notes (id, title, content, created_at, updated_at, pinned, tags, icon, archived_at)
     VALUES ($1, $2, $3, $4, $5, 0, $6, $7, NULL)`,
    [newId, title, source.content, now, now, source.tags, source.icon],
  );

  return {
    id: newId,
    title,
    content: source.content,
    created_at: now,
    updated_at: now,
    pinned: 0,
    tags: source.tags,
    icon: source.icon,
    archived_at: null,
  };
}

export async function updateNote(
  id: string,
  patch: {
    title?: string;
    content?: string;
    tags?: string;
    pinned?: number;
    icon?: string;
  },
): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (patch.title !== undefined) {
    fields.push("title = $" + (values.length + 1));
    values.push(patch.title);
  }
  if (patch.content !== undefined) {
    fields.push("content = $" + (values.length + 1));
    values.push(patch.content);
  }
  if (patch.tags !== undefined) {
    fields.push("tags = $" + (values.length + 1));
    values.push(patch.tags);
  }
  if (patch.pinned !== undefined) {
    fields.push("pinned = $" + (values.length + 1));
    values.push(patch.pinned);
  }
  if (patch.icon !== undefined) {
    fields.push("icon = $" + (values.length + 1));
    values.push(patch.icon);
  }

  if (fields.length === 0) {
    return;
  }

  fields.push("updated_at = $" + (values.length + 1));
  values.push(now);
  values.push(id);

  await db.execute(
    `UPDATE notes SET ${fields.join(", ")} WHERE id = $${values.length}`,
    values as (string | number)[],
  );
}

export async function togglePinNote(id: string): Promise<number> {
  const note = await getNote(id);
  if (!note) {
    throw new Error("Note not found");
  }
  const pinned = note.pinned ? 0 : 1;
  await updateNote(id, { pinned });
  return pinned;
}

export async function archiveNote(id: string): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  await db.execute(
    "UPDATE notes SET archived_at = $1, pinned = 0, updated_at = $1 WHERE id = $2",
    [now, id],
  );
}

export async function restoreNote(id: string): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  await db.execute(
    "UPDATE notes SET archived_at = NULL, updated_at = $1 WHERE id = $2",
    [now, id],
  );
}

export async function deleteNotePermanently(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM notes WHERE id = $1", [id]);
}

export async function emptyTrash(): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM notes WHERE archived_at IS NOT NULL");
}
