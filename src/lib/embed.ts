/** Turns a pasted video link into a safe embed URL, or null if unsupported. */
export function toEmbedUrl(input: string): { kind: "iframe" | "video"; src: string } | null {
  const raw = input.trim();
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");

  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    return id ? { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${id}` } : null;
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    let id = u.searchParams.get("v");
    const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{6,})/);
    if (!id && m) id = m[1];
    if (!id) return null;
    const t = u.searchParams.get("t") || u.searchParams.get("start");
    const start = t && /^\d+s?$/.test(t) ? `?start=${parseInt(t, 10)}` : "";
    return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${id}${start}` };
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = u.pathname.match(/(\d{6,})/)?.[1];
    return id ? { kind: "iframe", src: `https://player.vimeo.com/video/${id}` } : null;
  }
  if (/\.(mp4|webm)(\?.*)?$/i.test(u.pathname)) return { kind: "video", src: u.toString() };
  return null;
}
