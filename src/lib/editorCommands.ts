import type { Editor, Range } from "@tiptap/core";
import { format } from "date-fns";

export function todayDateLabel(): string {
  return format(new Date(), "EEEE, MMMM d, yyyy");
}

export function nowTimeLabel(): string {
  return format(new Date(), "h:mm a");
}

export function nowTimestampLabel(): string {
  return format(new Date(), "MMM d, yyyy · h:mm a");
}

function withRange(editor: Editor, range?: Range) {
  const chain = editor.chain().focus();
  if (range) {
    chain.deleteRange(range);
  }
  return chain;
}

export function insertTodoList(editor: Editor, range?: Range) {
  withRange(editor, range).toggleTaskList().run();
}

export function insertTodayDate(editor: Editor, range?: Range) {
  withRange(editor, range).insertContent(`<p>${todayDateLabel()}</p>`).run();
}

export function insertNowTime(editor: Editor, range?: Range) {
  withRange(editor, range).insertContent(`<p>${nowTimestampLabel()}</p>`).run();
}

export function insertDivider(editor: Editor, range?: Range) {
  withRange(editor, range).setHorizontalRule().run();
}

export function insertQuote(editor: Editor, range?: Range) {
  withRange(editor, range).toggleBlockquote().run();
}

export function insertCodeBlock(editor: Editor, range?: Range) {
  withRange(editor, range).toggleCodeBlock().run();
}

export function toggleHighlight(editor: Editor, range?: Range) {
  withRange(editor, range).toggleHighlight().run();
}

export function insertTable(editor: Editor, range?: Range) {
  withRange(editor, range)
    .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
    .run();
}

export function setLink(editor: Editor, range?: Range) {
  if (range) {
    editor.chain().focus().deleteRange(range).run();
  }

  const previousUrl = editor.getAttributes("link").href as string | undefined;
  const url = window.prompt("Enter URL", previousUrl ?? "https://");

  if (url === null) {
    return;
  }

  if (url === "") {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }

  editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
}
