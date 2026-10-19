import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    videoEmbed: {
      setVideoEmbed: (attrs: { src: string; kind: "iframe" | "video" }) => ReturnType;
    };
  }
}

/** Block node for YouTube/Vimeo embeds and uploaded video files. */
export const VideoEmbed = Node.create({
  name: "videoEmbed",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: "" },
      kind: { default: "iframe" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-video-embed]",
        getAttrs: (el) => {
          const e = el as HTMLElement;
          const src = e.getAttribute("data-src") ?? "";
          return src ? { src, kind: e.getAttribute("data-kind") === "video" ? "video" : "iframe" } : false;
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { src, kind } = node.attrs as { src: string; kind: "iframe" | "video" };
    const wrapper = mergeAttributes(HTMLAttributes, { "data-video-embed": "", "data-src": src, "data-kind": kind });
    if (kind === "video") return ["div", wrapper, ["video", { src, controls: "true", preload: "metadata", playsinline: "true" }]];
    return [
      "div",
      wrapper,
      ["iframe", { src, title: "Embedded video", allowfullscreen: "true", loading: "lazy", referrerpolicy: "strict-origin-when-cross-origin" }],
    ];
  },

  addCommands() {
    return {
      setVideoEmbed:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
