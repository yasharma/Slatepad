import { invoke } from "@tauri-apps/api/core";
import type { Note } from "./types";

/**
 * Build a self-contained, print-ready HTML page from the note's TipTap JSON.
 * We extract the editor's rendered DOM (already on screen) and wrap it in a
 * minimal page so the browser can print / save-as-PDF cleanly.
 */
function captureEditorHtml(): string {
  const el = document.querySelector(".tiptap");
  return el ? el.innerHTML : "<p><em>No content</em></p>";
}

export async function openPrintPreview(note: Note): Promise<void> {
  const body = captureEditorHtml();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(note.title || "Untitled")}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px;
      line-height: 1.65;
      color: #1a1a1a;
      max-width: 720px;
      margin: 40px auto;
      padding: 0 24px;
    }
    h1.note-title { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
    .note-meta { font-size: 12px; color: #888; margin-bottom: 24px; border-bottom: 1px solid #e5e5e5; padding-bottom: 12px; }
    h1 { font-size: 22px; font-weight: 700; margin: 20px 0 8px; }
    h2 { font-size: 18px; font-weight: 600; margin: 18px 0 6px; }
    h3 { font-size: 15px; font-weight: 600; margin: 14px 0 4px; }
    p { margin: 8px 0; }
    ul, ol { padding-left: 24px; margin: 8px 0; }
    li { margin: 3px 0; }
    blockquote { border-left: 3px solid #ccc; padding-left: 12px; color: #666; margin: 12px 0; }
    code { background: #f4f4f4; padding: 1px 5px; border-radius: 3px; font-size: 12px; font-family: "SF Mono", monospace; }
    pre { background: #f4f4f4; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 12px 0; }
    pre code { background: none; padding: 0; }
    a { color: #2383e2; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0; }
    td, th { border: 1px solid #ccc; padding: 6px 10px; }
    th { background: #f4f4f4; font-weight: 600; }
    mark { background: #fde68a; padding: 1px 2px; }
    input[type="checkbox"] { margin-right: 6px; }
    @media print {
      body { margin: 0; max-width: 100%; }
      a { color: #000; }
    }
  </style>
</head>
<body>
  <h1 class="note-title">${note.icon ? note.icon + " " : ""}${escHtml(note.title || "Untitled")}</h1>
  <p class="note-meta">Last updated ${new Date(note.updated_at).toLocaleString()}</p>
  ${body}
  <script>
    // Auto-open print dialog after page loads
    window.addEventListener('load', () => {
      setTimeout(() => window.print(), 400);
    });
  </script>
</body>
</html>`;

  await invoke<void>("open_print_preview", { html, title: note.title || "Untitled" });
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
