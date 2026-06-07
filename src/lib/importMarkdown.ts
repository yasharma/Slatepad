import { generateJSON } from "@tiptap/html";
import type { JSONContent } from "@tiptap/react";
import { marked } from "marked";
import { editorExtensions } from "./tiptap";
import { EMPTY_DOC } from "./types";

export function markdownToContentJson(markdown: string): JSONContent {
  const html = marked.parse(markdown.trim()) as string;
  return generateJSON(html, editorExtensions);
}

export function appendMarkdownToContent(
  currentContentJson: string,
  markdown: string,
): string {
  let current: JSONContent;
  try {
    current = JSON.parse(currentContentJson) as JSONContent;
  } catch {
    current = EMPTY_DOC;
  }

  const incoming = markdownToContentJson(markdown);
  const currentBlocks = current.content ?? [];
  const incomingBlocks = incoming.content ?? [];

  if (incomingBlocks.length === 0) {
    return currentContentJson;
  }

  const merged: JSONContent = {
    type: "doc",
    content:
      currentBlocks.length > 0
        ? [...currentBlocks, ...incomingBlocks]
        : incomingBlocks,
  };

  return JSON.stringify(merged);
}

export function renderMarkdownHtml(markdown: string): string {
  return marked.parse(markdown) as string;
}
