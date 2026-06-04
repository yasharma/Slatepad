import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import { SlashCommandExtension } from "./slashCommandExtension";

export const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    horizontalRule: {},
    blockquote: {},
    code: {},
    codeBlock: {},
    strike: {},
    // ListItem + ListKeymap from StarterKit support Tab/Shift+Tab nesting.
    listKeymap: {},
  }),
  TaskList,
  TaskItem.configure({
    nested: true,
  }),
  Link.configure({
    openOnClick: false,
    autolink: true,
    defaultProtocol: "https",
    HTMLAttributes: {
      class: "editor-link",
    },
  }),
  Highlight.configure({
    HTMLAttributes: {
      class: "editor-highlight",
    },
  }),
  Placeholder.configure({
    placeholder: "Start writing… Type / for commands",
  }),
  SlashCommandExtension,
];
