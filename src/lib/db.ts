import Database from "@tauri-apps/plugin-sql";
import { v4 as uuidv4 } from "uuid";
import type { Folder, Note, NoteSummary } from "./types";
import { getTemplate } from "./templates";

const DB_URL = "sqlite:notes.db";

const NOTE_FIELDS =
  "id, title, content, created_at, updated_at, pinned, tags, icon, folder_id, archived_at";

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
    folder_id: row.folder_id ?? null,
    archived_at: row.archived_at ?? null,
  };
}

function mapSummary(row: NoteSummary): NoteSummary {
  return {
    ...row,
    pinned: row.pinned ?? 0,
    tags: row.tags ?? "",
    icon: row.icon ?? "",
    folder_id: row.folder_id ?? null,
    archived_at: row.archived_at ?? null,
  };
}

export async function listFolders(): Promise<Folder[]> {
  const db = await getDb();
  return db.select<Folder[]>(
    "SELECT id, name, sort_order, created_at FROM folders ORDER BY sort_order ASC, name ASC",
  );
}

export async function createFolder(name: string): Promise<Folder> {
  const db = await getDb();
  const now = Date.now();
  const id = uuidv4();
  const rows = await db.select<{ max: number | null }[]>(
    "SELECT MAX(sort_order) as max FROM folders",
  );
  const sortOrder = (rows[0]?.max ?? -1) + 1;

  await db.execute(
    "INSERT INTO folders (id, name, sort_order, created_at) VALUES ($1, $2, $3, $4)",
    [id, name.trim() || "New folder", sortOrder, now],
  );

  return { id, name: name.trim() || "New folder", sort_order: sortOrder, created_at: now };
}

export async function renameFolder(id: string, name: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE folders SET name = $1 WHERE id = $2", [
    name.trim() || "Untitled folder",
    id,
  ]);
}

export async function deleteFolder(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE notes SET folder_id = NULL WHERE folder_id = $1", [id]);
  await db.execute("DELETE FROM folders WHERE id = $1", [id]);
}

export async function moveNoteToFolder(
  noteId: string,
  folderId: string | null,
): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  await db.execute(
    "UPDATE notes SET folder_id = $1, updated_at = $2 WHERE id = $3",
    [folderId, now, noteId],
  );
}

export async function listNotes(folderId?: string | null): Promise<NoteSummary[]> {
  const db = await getDb();
  let sql = `SELECT id, title, content, created_at, updated_at, pinned, tags, icon, folder_id, archived_at
     FROM notes
     WHERE archived_at IS NULL`;
  const params: (string | null)[] = [];

  if (folderId !== undefined && folderId !== null) {
    sql += " AND folder_id = $1";
    params.push(folderId);
  }

  sql += " ORDER BY pinned DESC, updated_at DESC";

  const rows = await db.select<NoteSummary[]>(sql, params);
  return rows.map((row) => ({ ...mapSummary(row), archived_at: null }));
}

export async function listArchivedNotes(): Promise<NoteSummary[]> {
  const db = await getDb();
  const rows = await db.select<NoteSummary[]>(
    `SELECT id, title, content, created_at, updated_at, pinned, tags, icon, folder_id, archived_at
     FROM notes
     WHERE archived_at IS NOT NULL
     ORDER BY archived_at DESC`,
  );
  return rows.map(mapSummary);
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

export async function createNote(options?: {
  templateId?: string;
  folderId?: string | null;
}): Promise<Note> {
  const template = getTemplate(options?.templateId ?? "blank") ?? getTemplate("blank")!;
  const db = await getDb();
  const now = Date.now();
  const id = uuidv4();

  await db.execute(
    `INSERT INTO notes (id, title, content, created_at, updated_at, pinned, tags, icon, folder_id, archived_at)
     VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, NULL)`,
    [
      id,
      template.title,
      template.content,
      now,
      now,
      template.tags,
      template.icon === "📄" ? "" : template.icon,
      options?.folderId ?? null,
    ],
  );

  return {
    id,
    title: template.title,
    content: template.content,
    created_at: now,
    updated_at: now,
    pinned: 0,
    tags: template.tags,
    icon: template.icon === "📄" ? "" : template.icon,
    folder_id: options?.folderId ?? null,
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
    `INSERT INTO notes (id, title, content, created_at, updated_at, pinned, tags, icon, folder_id, archived_at)
     VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, NULL)`,
    [newId, title, source.content, now, now, source.tags, source.icon, source.folder_id],
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
    folder_id: source.folder_id,
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
    folder_id?: string | null;
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
  if (patch.folder_id !== undefined) {
    fields.push("folder_id = $" + (values.length + 1));
    values.push(patch.folder_id);
  }

  if (fields.length === 0) {
    return;
  }

  fields.push("updated_at = $" + (values.length + 1));
  values.push(now);
  values.push(id);

  await db.execute(
    `UPDATE notes SET ${fields.join(", ")} WHERE id = $${values.length}`,
    values as (string | number | null)[],
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

/** Reset cached connection after import (before relaunch). */
export function resetDbConnection(): void {
  dbPromise = null;
}
