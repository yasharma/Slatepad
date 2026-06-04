import type { Editor, Range } from "@tiptap/core";
import {
  insertCodeBlock,
  insertDivider,
  insertNowTime,
  insertQuote,
  insertTodayDate,
  insertTodoList,
  setLink,
  toggleHighlight,
} from "./editorCommands";

export interface SlashCommandItem {
  title: string;
  description: string;
  keywords: string[];
  shortcut?: string;
  command: (props: { editor: Editor; range: Range }) => void;
}

export const slashCommands: SlashCommandItem[] = [
  {
    title: "Todo list",
    description: "Track tasks with checkboxes",
    keywords: ["todo", "task", "checkbox", "checklist", "check"],
    shortcut: "todo",
    command: ({ editor, range }) => insertTodoList(editor, range),
  },
  {
    title: "Today's date",
    description: "Insert the current date",
    keywords: ["date", "today", "now", "day"],
    shortcut: "date",
    command: ({ editor, range }) => insertTodayDate(editor, range),
  },
  {
    title: "Timestamp",
    description: "Insert date and time",
    keywords: ["time", "timestamp", "now", "clock"],
    shortcut: "time",
    command: ({ editor, range }) => insertNowTime(editor, range),
  },
  {
    title: "Divider",
    description: "Visually separate sections",
    keywords: ["divider", "line", "hr", "separator", "rule"],
    shortcut: "divider",
    command: ({ editor, range }) => insertDivider(editor, range),
  },
  {
    title: "Quote",
    description: "Highlight or cite text",
    keywords: ["quote", "blockquote", "callout"],
    shortcut: "quote",
    command: ({ editor, range }) => insertQuote(editor, range),
  },
  {
    title: "Link",
    description: "Add a hyperlink",
    keywords: ["link", "url", "href", "website"],
    shortcut: "link",
    command: ({ editor, range }) => setLink(editor, range),
  },
  {
    title: "Highlight",
    description: "Mark text with a background color",
    keywords: ["highlight", "mark", "background", "yellow"],
    shortcut: "highlight",
    command: ({ editor, range }) => toggleHighlight(editor, range),
  },
  {
    title: "Code block",
    description: "Monospace code snippet",
    keywords: ["code", "snippet", "pre"],
    shortcut: "code",
    command: ({ editor, range }) => insertCodeBlock(editor, range),
  },
  {
    title: "Heading 1",
    description: "Large section heading",
    keywords: ["h1", "heading", "title"],
    shortcut: "h1",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    keywords: ["h2", "heading", "subtitle"],
    shortcut: "h2",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    title: "Bullet list",
    description: "Bulleted list — Tab to nest, Shift+Tab to outdent",
    keywords: ["bullet", "list", "ul", "nested"],
    shortcut: "bullet",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Numbered list",
    description: "1, a, i nesting — Tab to nest, Shift+Tab to outdent",
    keywords: ["numbered", "ordered", "ol", "list", "nested"],
    shortcut: "numbered",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
];

export function filterSlashCommands(query: string): SlashCommandItem[] {
  const q = query.toLowerCase().trim();
  if (!q) {
    return slashCommands;
  }
  return slashCommands.filter((item) => {
    const haystack = [
      item.title,
      item.description,
      item.shortcut ?? "",
      ...item.keywords,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}
