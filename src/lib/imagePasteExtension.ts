import { Extension } from "@tiptap/core";
import { Fragment, Slice } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export const ImagePasteExtension = Extension.create({
  name: "imagePaste",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("imagePaste"),
        props: {
          handlePaste(view, event) {
            const clipboard = event.clipboardData;
            if (!clipboard) return false;

            const imageItem = Array.from(clipboard.items).find((item) =>
              item.type.startsWith("image/"),
            );
            if (!imageItem) return false;

            const file = imageItem.getAsFile();
            if (!file) return false;

            const imageType = view.state.schema.nodes.image;
            if (!imageType) return false;

            event.preventDefault();

            const reader = new FileReader();
            reader.onload = () => {
              const src = reader.result;
              if (typeof src !== "string") return;
              const node = imageType.create({ src, alt: file.name || "Image" });
              const slice = new Slice(Fragment.from(node), 0, 0);
              view.dispatch(
                view.state.tr.replaceSelection(slice).scrollIntoView(),
              );
            };
            reader.readAsDataURL(file);
            return true;
          },
        },
      }),
    ];
  },
});
