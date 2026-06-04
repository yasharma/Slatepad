import type { JSONContent } from "@tiptap/react";

function collectText(node: JSONContent): string {
  if (node.type === "text" && typeof node.text === "string") {
    return node.text;
  }
  if (!node.content) {
    return "";
  }
  return node.content.map(collectText).join(" ");
}

export function contentPreview(contentJson: string, maxLen = 80): string {
  try {
    const doc = JSON.parse(contentJson) as JSONContent;
    const text = collectText(doc).replace(/\s+/g, " ").trim();
    if (!text) {
      return "No content";
    }
    return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
  } catch {
    return "No content";
  }
}
