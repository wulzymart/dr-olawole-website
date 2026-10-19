import sanitizeHtml from "sanitize-html";

const YT = /^https:\/\/(www\.)?(youtube-nocookie\.com|youtube\.com)\/embed\/[\w-]{6,}(\?[\w=&%.-]*)?$/;
const VIMEO = /^https:\/\/player\.vimeo\.com\/video\/\d+(\?[\w=&%.-]*)?$/;

/**
 * Allow-list sanitiser for article and note HTML. Article bodies are written
 * by the doctor, but they are still cleaned on the way out so a leaked admin
 * session or a pasted snippet can never inject script into the public site.
 */
export function sanitizeRich(html: string): string {
  return sanitizeHtml(html ?? "", {
    allowedTags: [
      "h2", "h3", "h4", "p", "br", "strong", "b", "em", "i", "u", "s", "a", "ul", "ol", "li",
      "blockquote", "hr", "code", "pre", "img", "figure", "figcaption", "div", "iframe", "video", "source",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      p: ["style", "data-text-align"],
      h2: ["style"],
      h3: ["style"],
      div: ["data-video-embed", "data-src", "data-kind"],
      iframe: ["src", "title", "allow", "allowfullscreen", "loading", "referrerpolicy"],
      video: ["src", "controls", "preload", "poster", "playsinline"],
      source: ["src", "type"],
    },
    allowedStyles: { "*": { "text-align": [/^(left|center|right|justify)$/] } },
    allowedSchemes: ["https", "http", "mailto", "tel"],
    allowedSchemesByTag: { img: ["https", "http"], iframe: ["https"], video: ["https"], source: ["https"] },
    transformTags: {
      a: (tag, attribs) => ({
        tagName: "a",
        attribs: { ...attribs, rel: "noopener noreferrer nofollow", target: /^https?:/.test(attribs.href ?? "") ? "_blank" : "_self" },
      }),
      img: (tag, attribs) => ({ tagName: "img", attribs: { ...attribs, loading: "lazy" } }),
    },
    exclusiveFilter: (frame) => {
      if (frame.tag === "iframe") {
        const src = frame.attribs.src ?? "";
        return !(YT.test(src) || VIMEO.test(src)); // only known video hosts may be embedded
      }
      return false;
    },
  });
}

export function toPlainText(html: string) {
  return sanitizeHtml(html ?? "", { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, " ").trim();
}
