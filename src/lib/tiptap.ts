import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";
import { ImagePasteExtension } from "./imagePasteExtension";
import { MarkdownPasteExtension } from "./markdownPasteExtension";
import { SlashCommandExtension } from "./slashCommandExtension";
import { FindExtension } from "./findExtension";
import { appLowlight } from "./lowlight";
import { AudioPlayer } from "./audioPlayerNode";
import { ExcalidrawBlock } from "./excalidrawNode";

export const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    horizontalRule: {},
    blockquote: {},
    code: {},
    codeBlock: false,
    strike: {},
    listKeymap: {},
  }),
  CodeBlockLowlight.configure({
    lowlight: appLowlight,
    enableTabIndentation: true,
    tabSize: 2,
    defaultLanguage: "plaintext",
    HTMLAttributes: { class: "editor-code-block" },
  }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Link.configure({
    openOnClick: false,
    autolink: true,
    defaultProtocol: "https",
    HTMLAttributes: { class: "editor-link" },
  }),
  Highlight.configure({ HTMLAttributes: { class: "editor-highlight" } }),
  Image.configure({
    inline: false,
    allowBase64: true,
    HTMLAttributes: { class: "editor-image" },
  }),
  Placeholder.configure({ placeholder: "Start writing… Type / for commands" }),
  Table.configure({ resizable: false, HTMLAttributes: { class: "editor-table" } }),
  TableRow,
  TableHeader,
  TableCell,
  ImagePasteExtension,
  MarkdownPasteExtension,
  SlashCommandExtension,
  FindExtension,
  AudioPlayer,
  ExcalidrawBlock,
];
