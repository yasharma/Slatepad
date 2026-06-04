import type { JSONContent } from "@tiptap/react";

export const EMPTY_DOC: JSONContent = {
  type: "doc",
  content: [],
};

export const EMPTY_DOC_STRING = JSON.stringify(EMPTY_DOC);

export interface Note {
  id: string;
  title: string;
  content: string;
  created_at: number;
  updated_at: number;
  pinned: number;
  tags: string;
  icon: string;
  archived_at: number | null;
}

export interface NoteSummary {
  id: string;
  title: string;
  content: string;
  created_at: number;
  updated_at: number;
  pinned: number;
  tags: string;
  icon: string;
  archived_at: number | null;
}

export type SaveStatus = "idle" | "saving" | "saved";

export type SidebarView = "active" | "archived";

export type SortOption = "modified" | "created" | "alpha";
