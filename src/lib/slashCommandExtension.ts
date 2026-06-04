import { Extension } from "@tiptap/core";
import Suggestion, { type SuggestionProps } from "@tiptap/suggestion";
import { filterSlashCommands, type SlashCommandItem } from "./slashCommands";

export const SlashCommandExtension = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashCommandItem, SlashCommandItem>({
        editor: this.editor,
        char: "/",
        startOfLine: false,
        allowSpaces: false,
        items: ({ query }) => filterSlashCommands(query),
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },
        render: () => {
          let popup: HTMLDivElement | null = null;
          let selectedIndex = 0;
          let activeProps: SuggestionProps<
            SlashCommandItem,
            SlashCommandItem
          > | null = null;

          const removePopup = () => {
            popup?.remove();
            popup = null;
          };

          const renderPopup = (
            props: SuggestionProps<SlashCommandItem, SlashCommandItem>,
          ) => {
            if (!popup) {
              return;
            }

            if (props.items.length === 0) {
              popup.innerHTML =
                '<div class="slash-menu-empty">No matching commands</div>';
              return;
            }

            popup.innerHTML = props.items
              .map((item, index) => {
                const active = index === selectedIndex ? " is-active" : "";
                return `<button type="button" class="slash-menu-item${active}" data-index="${index}">
                  <span class="slash-menu-item-title">${item.title}</span>
                  <span class="slash-menu-item-desc">${item.description}</span>
                </button>`;
              })
              .join("");

            popup.querySelectorAll(".slash-menu-item").forEach((button) => {
              button.addEventListener("mousedown", (event) => {
                event.preventDefault();
                const index = Number((button as HTMLElement).dataset.index);
                const item = props.items[index];
                if (item) {
                  props.command(item);
                }
              });
            });

            positionPopup(props.clientRect);
          };

          const positionPopup = (
            clientRect: (() => DOMRect | null) | null | undefined,
          ) => {
            if (!popup || !clientRect) {
              return;
            }
            const rect = clientRect();
            if (!rect) {
              return;
            }
            popup.style.left = `${rect.left}px`;
            popup.style.top = `${rect.bottom + 6}px`;
          };

          return {
            onStart: (props) => {
              selectedIndex = 0;
              activeProps = props;
              popup = document.createElement("div");
              popup.className = "slash-menu";
              document.body.appendChild(popup);
              renderPopup(props);
            },
            onUpdate: (props) => {
              selectedIndex = 0;
              activeProps = props;
              renderPopup(props);
            },
            onKeyDown: ({ event }) => {
              if (event.key === "Escape") {
                removePopup();
                return true;
              }

              if (!activeProps || activeProps.items.length === 0) {
                return false;
              }

              if (event.key === "ArrowUp") {
                selectedIndex =
                  (selectedIndex + activeProps.items.length - 1) %
                  activeProps.items.length;
                renderPopup(activeProps);
                return true;
              }

              if (event.key === "ArrowDown") {
                selectedIndex = (selectedIndex + 1) % activeProps.items.length;
                renderPopup(activeProps);
                return true;
              }

              if (event.key === "Enter") {
                const item = activeProps.items[selectedIndex];
                if (item) {
                  activeProps.command(item);
                }
                return true;
              }

              return false;
            },
            onExit: () => {
              activeProps = null;
              removePopup();
            },
          };
        },
      }),
    ];
  },
});
