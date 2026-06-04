import type { JSONContent } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import * as db from "../lib/db";
import type { Note, NoteSummary, SaveStatus, SidebarView } from "../lib/types";
import { EMPTY_DOC } from "../lib/types";
import { useAutoSave } from "./useAutoSave";

function parseContent(content: string): JSONContent {
  try {
    return JSON.parse(content) as JSONContent;
  } catch {
    return EMPTY_DOC;
  }
}

export function useNotes() {
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [archivedNotes, setArchivedNotes] = useState<NoteSummary[]>([]);
  const [sidebarView, setSidebarView] = useState<SidebarView>("active");
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeNoteRef = useRef(activeNote);
  const titleRef = useRef("");
  const contentRef = useRef("");
  const tagsRef = useRef("");

  activeNoteRef.current = activeNote;
  if (activeNote) {
    titleRef.current = activeNote.title;
    contentRef.current = activeNote.content;
    tagsRef.current = activeNote.tags;
  }

  const refreshList = useCallback(async () => {
    const [list, archived] = await Promise.all([
      db.listNotes(),
      db.listArchivedNotes(),
    ]);
    setNotes(list);
    setArchivedNotes(archived);
    return list;
  }, []);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await refreshList();
      if (list.length > 0) {
        const note = await db.getNote(list[0].id);
        setActiveNote(note);
        setSidebarView("active");
      } else {
        setActiveNote(null);
      }
    } catch {
      setError("Could not load notes from local database.");
    } finally {
      setLoading(false);
    }
  }, [refreshList]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const persistActiveNote = useCallback(async () => {
    const note = activeNoteRef.current;
    if (!note) {
      return;
    }
    await db.updateNote(note.id, {
      title: titleRef.current,
      content: contentRef.current,
      tags: tagsRef.current,
    });
    const list = await refreshList();
    setActiveNote((prev) => {
      if (!prev) {
        return prev;
      }
      const summary = list.find((n) => n.id === prev.id);
      return {
        ...prev,
        title: titleRef.current,
        content: contentRef.current,
        tags: tagsRef.current,
        updated_at: summary?.updated_at ?? prev.updated_at,
      };
    });
  }, [refreshList]);

  const { scheduleSave, flushSave, status: saveStatus } = useAutoSave(
    persistActiveNote,
  );

  const selectNote = useCallback(
    async (id: string) => {
      if (activeNoteRef.current?.id === id) {
        return;
      }
      await flushSave();
      const note = await db.getNote(id);
      if (note?.archived_at) {
        setSidebarView("archived");
      } else {
        setSidebarView("active");
      }
      setActiveNote(note);
    },
    [flushSave],
  );

  const createNote = useCallback(async () => {
    setError(null);
    try {
      await flushSave();
      const note = await db.createNote();
      await refreshList();
      setSidebarView("active");
      setActiveNote(note);
    } catch (err) {
      console.error("Failed to create note:", err);
      setError("Could not create note. Please restart the app and try again.");
    }
  }, [flushSave, refreshList]);

  const archiveNote = useCallback(async () => {
    const note = activeNoteRef.current;
    if (!note) {
      return;
    }
    setError(null);
    try {
      await flushSave();
      await db.archiveNote(note.id);
      const list = await refreshList();
      if (list.length > 0) {
        const next = await db.getNote(list[0].id);
        setActiveNote(next);
        setSidebarView("active");
      } else {
        setActiveNote(null);
      }
    } catch (err) {
      console.error("Failed to archive note:", err);
      setError("Could not archive note.");
    }
  }, [flushSave, refreshList]);

  const restoreNote = useCallback(async () => {
    const note = activeNoteRef.current;
    if (!note) {
      return;
    }
    setError(null);
    try {
      await db.restoreNote(note.id);
      await refreshList();
      const restored = await db.getNote(note.id);
      setActiveNote(restored);
      setSidebarView("active");
    } catch (err) {
      console.error("Failed to restore note:", err);
      setError("Could not restore note.");
    }
  }, [refreshList]);

  const deleteArchivedPermanently = useCallback(async () => {
    const note = activeNoteRef.current;
    if (!note) {
      return;
    }
    setError(null);
    try {
      await db.deleteNotePermanently(note.id);
      const archived = await db.listArchivedNotes();
      setArchivedNotes(archived);
      if (archived.length > 0) {
        const next = await db.getNote(archived[0].id);
        setActiveNote(next);
      } else {
        setActiveNote(null);
        setSidebarView("active");
      }
      await refreshList();
    } catch (err) {
      console.error("Failed to delete note:", err);
      setError("Could not delete note.");
    }
  }, [refreshList]);

  const emptyTrash = useCallback(async () => {
    setError(null);
    try {
      await db.emptyTrash();
      setArchivedNotes([]);
      setActiveNote(null);
      setSidebarView("active");
      await refreshList();
    } catch (err) {
      console.error("Failed to empty trash:", err);
      setError("Could not empty archive.");
    }
  }, [refreshList]);

  const togglePin = useCallback(async () => {
    const note = activeNoteRef.current;
    if (!note || note.archived_at) {
      return;
    }
    setError(null);
    try {
      const pinned = await db.togglePinNote(note.id);
      await refreshList();
      setActiveNote((prev) => (prev ? { ...prev, pinned } : prev));
    } catch (err) {
      console.error("Failed to toggle pin:", err);
      setError("Could not update pin.");
    }
  }, [refreshList]);

  const togglePinById = useCallback(async (id: string) => {
    setError(null);
    try {
      const pinned = await db.togglePinNote(id);
      await refreshList();
      if (activeNoteRef.current?.id === id) {
        setActiveNote((prev) => (prev ? { ...prev, pinned } : prev));
      }
    } catch (err) {
      console.error("Failed to toggle pin:", err);
      setError("Could not update pin.");
    }
  }, [refreshList]);

  const duplicateNote = useCallback(async () => {
    const note = activeNoteRef.current;
    if (!note) {
      return;
    }
    setError(null);
    try {
      await flushSave();
      const copy = await db.duplicateNote(note.id);
      await refreshList();
      setSidebarView("active");
      setActiveNote(copy);
    } catch (err) {
      console.error("Failed to duplicate note:", err);
      setError("Could not duplicate note.");
    }
  }, [flushSave, refreshList]);

  const updateTitle = useCallback(
    (title: string) => {
      titleRef.current = title;
      setActiveNote((prev) => (prev ? { ...prev, title } : prev));
      scheduleSave();
    },
    [scheduleSave],
  );

  const updateTags = useCallback(
    (tags: string) => {
      tagsRef.current = tags;
      setActiveNote((prev) => (prev ? { ...prev, tags } : prev));
      scheduleSave();
    },
    [scheduleSave],
  );

  const updateContent = useCallback(
    (content: string) => {
      contentRef.current = content;
      setActiveNote((prev) => (prev ? { ...prev, content } : prev));
      scheduleSave();
    },
    [scheduleSave],
  );

  const updateIcon = useCallback(async (icon: string) => {
    const note = activeNoteRef.current;
    if (!note) return;
    setError(null);
    try {
      await db.updateNote(note.id, { icon });
      setActiveNote((prev) => (prev ? { ...prev, icon } : prev));
      await refreshList();
    } catch (err) {
      console.error("Failed to update icon:", err);
      setError("Could not update icon.");
    }
  }, [refreshList]);

  const deleteActiveNote = useCallback(async () => {
    const note = activeNoteRef.current;
    if (!note) return;
    setError(null);
    try {
      await db.deleteNotePermanently(note.id);
      const list = await db.listNotes();
      setNotes(list);
      const archived = await db.listArchivedNotes();
      setArchivedNotes(archived);
      if (list.length > 0) {
        const next = await db.getNote(list[0].id);
        setActiveNote(next);
        setSidebarView("active");
      } else if (archived.length > 0) {
        const next = await db.getNote(archived[0].id);
        setActiveNote(next);
        setSidebarView("archived");
      } else {
        setActiveNote(null);
        setSidebarView("active");
      }
    } catch (err) {
      console.error("Failed to delete note:", err);
      setError("Could not delete note.");
    }
  }, [refreshList]);

  const switchSidebarView = useCallback(
    async (view: SidebarView) => {
      await flushSave();
      setSidebarView(view);
      const list =
        view === "archived"
          ? await db.listArchivedNotes()
          : await db.listNotes();
      setNotes(await db.listNotes());
      setArchivedNotes(await db.listArchivedNotes());
      if (list.length > 0) {
        const note = await db.getNote(list[0].id);
        setActiveNote(note);
      } else {
        setActiveNote(null);
      }
    },
    [flushSave],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    notes,
    archivedNotes,
    sidebarView,
    setSidebarView: switchSidebarView,
    activeNote,
    activeContent: activeNote ? parseContent(activeNote.content) : null,
    loading,
    error,
    saveStatus: saveStatus as SaveStatus,
    selectNote,
    createNote,
    archiveNote,
    restoreNote,
    deleteArchivedPermanently,
    emptyTrash,
    togglePin,
    togglePinById,
    duplicateNote,
    updateTitle,
    updateTags,
    updateContent,
    updateIcon,
    deleteActiveNote,
    flushSave,
    clearError,
  };
}
