import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ExcalidrawNodeView } from "../components/ExcalidrawNodeView";

export const ExcalidrawBlock = Node.create({
  name: "excalidrawBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      data: {
        default: JSON.stringify({ elements: [], appState: { viewBackgroundColor: "transparent" } }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-excalidraw]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-excalidraw": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ExcalidrawNodeView);
  },
});
