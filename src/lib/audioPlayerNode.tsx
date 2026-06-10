import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { convertFileSrc } from "@tauri-apps/api/core";

function AudioPlayerView({ node }: NodeViewProps) {
  const src = node.attrs.src as string;
  const label = node.attrs.label as string;

  return (
    <NodeViewWrapper>
      <div className="my-2 rounded-lg border border-border bg-surface p-3">
        <div className="mb-1 text-xs font-medium text-text-muted">{label}</div>
        <audio controls className="w-full" src={convertFileSrc(src)} />
      </div>
    </NodeViewWrapper>
  );
}

export const AudioPlayer = Node.create({
  name: "audioPlayer",

  group: "block",
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-audio-src"),
        renderHTML: (attributes) => {
          if (!attributes.src) {
            return {};
          }
          return { "data-audio-src": attributes.src };
        },
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-audio-label"),
        renderHTML: (attributes) => {
          if (!attributes.label) {
            return {};
          }
          return { "data-audio-label": attributes.label };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-audio-src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AudioPlayerView);
  },
});
