import { Extension } from "@tiptap/core";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Node } from "@tiptap/pm/model";

export interface FindState {
  term: string;
  activeIndex: number;
  matches: Array<{ from: number; to: number }>;
}

export const findPluginKey = new PluginKey<FindState>("find");

function collectMatches(
  doc: Node,
  term: string,
): Array<{ from: number; to: number }> {
  if (!term) return [];
  const matches: Array<{ from: number; to: number }> = [];
  const lower = term.toLowerCase();

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const text = node.text.toLowerCase();
    let i = 0;
    while ((i = text.indexOf(lower, i)) !== -1) {
      matches.push({ from: pos + i, to: pos + i + term.length });
      i += term.length;
    }
  });

  return matches;
}

function buildDecorations(
  doc: Node,
  state: FindState,
): DecorationSet {
  if (!state.term || state.matches.length === 0) {
    return DecorationSet.empty;
  }

  const decorations = state.matches.map((match, idx) => {
    const isActive = idx === state.activeIndex;
    return Decoration.inline(match.from, match.to, {
      class: isActive ? "find-match find-match-active" : "find-match",
    });
  });

  return DecorationSet.create(doc, decorations);
}

export const FindExtension = Extension.create({
  name: "find",

  addProseMirrorPlugins() {
    return [
      new Plugin<FindState>({
        key: findPluginKey,

        state: {
          init(): FindState {
            return { term: "", activeIndex: 0, matches: [] };
          },
          apply(tr, prev): FindState {
            const next = tr.getMeta(findPluginKey) as Partial<FindState> | undefined;
            if (next !== undefined) {
              const term = next.term ?? prev.term;
              const matches = collectMatches(tr.doc, term);
              const activeIndex = Math.min(
                next.activeIndex ?? 0,
                Math.max(0, matches.length - 1),
              );
              return { term, activeIndex, matches };
            }
            // Doc changed — recompute matches, keep term
            if (tr.docChanged && prev.term) {
              const matches = collectMatches(tr.doc, prev.term);
              const activeIndex = Math.min(
                prev.activeIndex,
                Math.max(0, matches.length - 1),
              );
              return { ...prev, matches, activeIndex };
            }
            return prev;
          },
        },

        props: {
          decorations(state) {
            const findState = findPluginKey.getState(state);
            if (!findState) return DecorationSet.empty;
            return buildDecorations(state.doc, findState);
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      setSearch:
        (term: string) =>
        ({ dispatch, tr, state }) => {
          if (dispatch) {
            const matches = collectMatches(state.doc, term);
            tr.setMeta(findPluginKey, { term, activeIndex: 0, matches });
            dispatch(tr);
          }
          return true;
        },

      clearSearch:
        () =>
        ({ dispatch, tr }) => {
          if (dispatch) {
            tr.setMeta(findPluginKey, { term: "", activeIndex: 0, matches: [] });
            dispatch(tr);
          }
          return true;
        },

      findNext:
        () =>
        ({ dispatch, tr, state }) => {
          const findState = findPluginKey.getState(state);
          if (!findState || findState.matches.length === 0) return false;
          if (dispatch) {
            const activeIndex =
              (findState.activeIndex + 1) % findState.matches.length;
            tr.setMeta(findPluginKey, { ...findState, activeIndex });
            dispatch(tr);
          }
          return true;
        },

      findPrev:
        () =>
        ({ dispatch, tr, state }) => {
          const findState = findPluginKey.getState(state);
          if (!findState || findState.matches.length === 0) return false;
          if (dispatch) {
            const activeIndex =
              (findState.activeIndex + findState.matches.length - 1) %
              findState.matches.length;
            tr.setMeta(findPluginKey, { ...findState, activeIndex });
            dispatch(tr);
          }
          return true;
        },
    };
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    find: {
      setSearch: (term: string) => ReturnType;
      clearSearch: () => ReturnType;
      findNext: () => ReturnType;
      findPrev: () => ReturnType;
    };
  }
}
