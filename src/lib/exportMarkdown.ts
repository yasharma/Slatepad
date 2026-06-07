import type { JSONContent } from "@tiptap/react";

function applyMarks(text: string, marks?: JSONContent["marks"]): string {
  if (!marks?.length) {
    return text;
  }
  let out = text;
  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        out = `**${out}**`;
        break;
      case "italic":
        out = `*${out}*`;
        break;
      case "strike":
        out = `~~${out}~~`;
        break;
      case "code":
        out = `\`${out}\``;
        break;
      case "link":
        out = `[${out}](${mark.attrs?.href ?? ""})`;
        break;
    }
  }
  return out;
}

function nodeToMd(node: JSONContent, depth = 0): string {
  switch (node.type) {
    case "doc":
      return (node.content ?? []).map((child) => nodeToMd(child, depth)).join("\n\n");
    case "paragraph":
      return (node.content ?? []).map((child) => nodeToMd(child, depth)).join("");
    case "text":
      return applyMarks(node.text ?? "", node.marks);
    case "heading": {
      const level = (node.attrs?.level as number) ?? 1;
      const prefix = "#".repeat(level);
      const text = (node.content ?? []).map((child) => nodeToMd(child, depth)).join("");
      return `${prefix} ${text}`;
    }
    case "bulletList":
      return (node.content ?? [])
        .map((item) => nodeToMd(item, depth))
        .join("\n");
    case "orderedList":
      return (node.content ?? [])
        .map((item, i) => {
          const text = nodeToMd(item, depth).replace(/^- /, `${i + 1}. `);
          return text.startsWith(`${i + 1}.`) ? text : `${i + 1}. ${text}`;
        })
        .join("\n");
    case "listItem":
    case "taskItem": {
      const checked = node.attrs?.checked ? "x" : " ";
      const text = (node.content ?? []).map((child) => nodeToMd(child, depth + 1)).join("\n");
      if (node.type === "taskItem") {
        return `- [${checked}] ${text.replace(/^- /, "").trim()}`;
      }
      return `- ${text.replace(/^- /, "").trim()}`;
    }
    case "taskList":
      return (node.content ?? []).map((child) => nodeToMd(child, depth)).join("\n");
    case "blockquote": {
      const inner = (node.content ?? []).map((child) => nodeToMd(child, depth)).join("\n");
      return inner
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    }
    case "codeBlock": {
      const lang = (node.attrs?.language as string) ?? "";
      const code = (node.content ?? []).map((child) => child.text ?? "").join("");
      return `\`\`\`${lang}\n${code}\n\`\`\``;
    }
    case "horizontalRule":
      return "---";
    case "hardBreak":
      return "  \n";
    case "table": {
      const rows = node.content ?? [];
      const rendered = rows.map((row) => nodeToMd(row, depth));
      const firstRow = rows[0];
      const firstCell = firstRow?.content?.[0];
      const hasHeader = firstCell?.type === "tableHeader";
      if (hasHeader && rendered.length > 0) {
        const cols = (firstRow?.content ?? []).length;
        const separator = "| " + Array(cols).fill("---").join(" | ") + " |";
        rendered.splice(1, 0, separator);
      }
      return rendered.join("\n");
    }
    case "tableRow": {
      const cells = (node.content ?? []).map(
        (cell) => nodeToMd(cell, depth).replace(/\s*\n+\s*/g, " ").trim() || " ",
      );
      return "| " + cells.join(" | ") + " |";
    }
    case "tableHeader":
    case "tableCell": {
      return (node.content ?? [])
        .map((child) => nodeToMd(child, depth))
        .join("")
        .replace(/\n+/g, " ")
        .trim();
    }
    default:
      return (node.content ?? []).map((child) => nodeToMd(child, depth)).join("");
  }
}

export function contentToMarkdown(contentJson: string): string {
  try {
    const doc = JSON.parse(contentJson) as JSONContent;
    return nodeToMd(doc).trim();
  } catch {
    return "";
  }
}

export function noteToMarkdown(title: string, contentJson: string): string {
  try {
    const doc = JSON.parse(contentJson) as JSONContent;
    const body = nodeToMd(doc).trim();
    const heading = `# ${title || "Untitled"}`;
    return body ? `${heading}\n\n${body}` : heading;
  } catch {
    return `# ${title || "Untitled"}`;
  }
}

export async function copyMarkdownToClipboard(
  title: string,
  contentJson: string,
): Promise<void> {
  const md = noteToMarkdown(title, contentJson);
  await navigator.clipboard.writeText(md);
}
