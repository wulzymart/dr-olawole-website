"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import CharacterCount from "@tiptap/extension-character-count";
import {
  AlignCenter, AlignLeft, AlignRight, Bold, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered,
  Loader2, Minus, Quote, Redo2, Underline as UnderlineIcon, Undo2, Video, Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoEmbed } from "./video-embed";
import { toEmbedUrl } from "@/lib/embed";
import { uploadMedia } from "@/lib/upload";
import { cn } from "@/lib/utils";

export interface EditorValue {
  html: string;
  json: unknown;
}

interface Props {
  initialHtml?: string;
  initialJson?: unknown;
  onChange: (v: EditorValue) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  folder?: string;
}

type Panel = null | "image" | "video" | "link";

export function RichEditor({ initialHtml = "", initialJson, onChange, placeholder = "Start writing…", className, minHeight = "22rem", folder = "articles" }: Props) {
  const [panel, setPanel] = useState<Panel>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    immediatelyRender: false, // avoids a server/client mismatch in Next.js
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false, autolink: true, defaultProtocol: "https" } }),
      Image.configure({ allowBase64: false }),
      VideoEmbed,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
    ],
    content: (initialJson as object | null) ?? initialHtml,
    editorProps: {
      attributes: { class: "tiptap rich", style: `min-height:${minHeight}` },
      handlePaste: (view, event) => {
        const file = Array.from(event.clipboardData?.files ?? []).find((f) => f.type.startsWith("image/"));
        if (file) {
          event.preventDefault();
          insertUpload(file);
          return true;
        }
        return false;
      },
      handleDrop: (view, event) => {
        const file = Array.from((event as DragEvent).dataTransfer?.files ?? []).find((f) => /^(image|video)\//.test(f.type));
        if (file) {
          event.preventDefault();
          insertUpload(file);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => onChangeRef.current({ html: editor.getHTML(), json: editor.getJSON() }),
  });

  const insertUpload = useCallback(
    async (file: File, alt = "") => {
      if (!editor) return;
      const id = toast.loading(`Uploading ${file.name}…`);
      try {
        const url = await uploadMedia(file, folder);
        if (file.type.startsWith("video/")) editor.chain().focus().setVideoEmbed({ src: url, kind: "video" }).run();
        else editor.chain().focus().setImage({ src: url, alt }).run();
        toast.success("Added to your article", { id });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed", { id });
      }
    },
    [editor, folder],
  );

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"), italic: e.isActive("italic"), underline: e.isActive("underline"),
            h2: e.isActive("heading", { level: 2 }), h3: e.isActive("heading", { level: 3 }),
            ul: e.isActive("bulletList"), ol: e.isActive("orderedList"), quote: e.isActive("blockquote"),
            link: e.isActive("link"), left: e.isActive({ textAlign: "left" }), center: e.isActive({ textAlign: "center" }), right: e.isActive({ textAlign: "right" }),
            canUndo: e.can().undo(), canRedo: e.can().redo(),
            words: e.storage.characterCount?.words?.() ?? 0,
          }
        : null,
  });

  useEffect(() => {
    // Warn before closing the tab with unsaved changes is handled by the page; nothing to do here.
  }, []);

  if (!editor || !state) {
    return <div className={cn("rounded-2xl border border-border bg-white p-6 text-muted-foreground", className)} style={{ minHeight }}>Loading editor…</div>;
  }

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-input bg-white focus-within:ring-4 focus-within:ring-coral-400/20", className)}>
      <div role="toolbar" aria-label="Formatting" className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-border bg-paper/95 p-2 backdrop-blur">
        <Tool label="Heading" on={state.h2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 /></Tool>
        <Tool label="Subheading" on={state.h3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 /></Tool>
        <Sep />
        <Tool label="Bold" on={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}><Bold /></Tool>
        <Tool label="Italic" on={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic /></Tool>
        <Tool label="Underline" on={state.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon /></Tool>
        <Tool label="Link" on={state.link} onClick={() => setPanel("link")}><Link2 /></Tool>
        <Sep />
        <Tool label="Bulleted list" on={state.ul} onClick={() => editor.chain().focus().toggleBulletList().run()}><List /></Tool>
        <Tool label="Numbered list" on={state.ol} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered /></Tool>
        <Tool label="Quote" on={state.quote} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote /></Tool>
        <Tool label="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus /></Tool>
        <Sep />
        <Tool label="Align left" on={state.left} onClick={() => editor.chain().focus().setTextAlign("left").run()}><AlignLeft /></Tool>
        <Tool label="Align centre" on={state.center} onClick={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenter /></Tool>
        <Tool label="Align right" on={state.right} onClick={() => editor.chain().focus().setTextAlign("right").run()}><AlignRight /></Tool>
        <Sep />
        <Tool label="Insert image" onClick={() => setPanel("image")}><ImagePlus /></Tool>
        <Tool label="Insert video" onClick={() => setPanel("video")}><Video /></Tool>
        <Sep />
        <Tool label="Undo" disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()}><Undo2 /></Tool>
        <Tool label="Redo" disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()}><Redo2 /></Tool>
        <span className="ml-auto pr-2 text-xs tabular-nums text-muted-foreground">{state.words} words</span>
      </div>
      <div className="px-5 py-6 sm:px-8">
        <EditorContent editor={editor} />
      </div>

      <ImageDialog open={panel === "image"} onClose={() => setPanel(null)} editor={editor} onUpload={insertUpload} />
      <VideoDialog open={panel === "video"} onClose={() => setPanel(null)} editor={editor} onUpload={insertUpload} />
      <LinkDialog open={panel === "link"} onClose={() => setPanel(null)} editor={editor} />
    </div>
  );
}

function Tool({ label, on, disabled, onClick, children }: { label: string; on?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={on}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // keep the text selection while clicking
      onClick={onClick}
      className={cn(
        "grid size-9 cursor-pointer place-items-center rounded-lg text-pine-900 transition-colors hover:bg-pine-900/10 disabled:cursor-not-allowed disabled:opacity-35 [&_svg]:size-[1.1rem]",
        on && "bg-pine-900 text-cream hover:bg-pine-900",
      )}
    >
      {children}
    </button>
  );
}
const Sep = () => <span aria-hidden className="mx-1 h-5 w-px bg-border" />;

function UploadButton({ accept, onFile, busy, children }: { accept: string; onFile: (f: File) => void; busy: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={ref} type="file" accept={accept} className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      <Button type="button" variant="outline" disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? <Loader2 className="animate-spin" /> : <Upload />}{children}
      </Button>
    </>
  );
}

function ImageDialog({ open, onClose, editor, onUpload }: { open: boolean; onClose: () => void; editor: Editor; onUpload: (f: File, alt: string) => Promise<void> }) {
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const reset = () => { setUrl(""); setAlt(""); };
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); reset(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add an image</DialogTitle>
          <DialogDescription>Upload a file or paste a link. Describe the image for readers who cannot see it.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="img-alt">Description (alt text)</Label>
          <Input id="img-alt" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="A person checking their blood pressure at home" />
        </div>
        <Tabs defaultValue="upload">
          <TabsList><TabsTrigger value="upload">Upload</TabsTrigger><TabsTrigger value="link">From a link</TabsTrigger></TabsList>
          <TabsContent value="upload">
            <UploadButton accept="image/jpeg,image/png,image/webp,image/gif,image/avif" busy={busy} onFile={async (f) => { setBusy(true); await onUpload(f, alt); setBusy(false); onClose(); reset(); }}>
              Choose an image
            </UploadButton>
            <p className="mt-3 text-sm text-muted-foreground">JPG, PNG, WebP or GIF. Large photos are resized automatically.</p>
          </TabsContent>
          <TabsContent value="link">
            <form
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!/^https:\/\//i.test(url.trim())) return toast.error("Paste a link that starts with https://");
                editor.chain().focus().setImage({ src: url.trim(), alt }).run();
                onClose(); reset();
              }}
            >
              <Input aria-label="Image link" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" inputMode="url" />
              <DialogFooter><Button type="submit">Insert image</Button></DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function VideoDialog({ open, onClose, editor, onUpload }: { open: boolean; onClose: () => void; editor: Editor; onUpload: (f: File, alt: string) => Promise<void> }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setUrl(""); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a video</DialogTitle>
          <DialogDescription>Paste a YouTube or Vimeo link, or upload an MP4 or WebM file.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const embed = toEmbedUrl(url);
            if (!embed) return toast.error("That link is not supported. Use YouTube, Vimeo or a direct .mp4 link.");
            editor.chain().focus().setVideoEmbed(embed).run();
            onClose(); setUrl("");
          }}
        >
          <Label htmlFor="vid-url">Video link</Label>
          <Input id="vid-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" inputMode="url" />
          <DialogFooter><Button type="submit">Insert video</Button></DialogFooter>
        </form>
        <div className="flex items-center gap-4 border-t border-border pt-4">
          <UploadButton accept="video/mp4,video/webm" busy={busy} onFile={async (f) => { setBusy(true); await onUpload(f, ""); setBusy(false); onClose(); }}>
            Upload a video file
          </UploadButton>
          <p className="text-sm text-muted-foreground">Up to 50 MB.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LinkDialog({ open, onClose, editor }: { open: boolean; onClose: () => void; editor: Editor }) {
  const [url, setUrl] = useState("");
  useEffect(() => { if (open) setUrl(editor.getAttributes("link").href ?? ""); }, [open, editor]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Link</DialogTitle><DialogDescription>Select some text first, then add the address it should open.</DialogDescription></DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const href = url.trim();
            if (!href) editor.chain().focus().extendMarkRange("link").unsetLink().run();
            else editor.chain().focus().extendMarkRange("link").setLink({ href: /^(https?:|mailto:|tel:)/i.test(href) ? href : `https://${href}` }).run();
            onClose();
          }}
        >
          <Input aria-label="Link address" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" inputMode="url" autoFocus />
          <DialogFooter>
            {editor.isActive("link") && <Button type="button" variant="outline" onClick={() => { editor.chain().focus().extendMarkRange("link").unsetLink().run(); onClose(); }}>Remove link</Button>}
            <Button type="submit">Save link</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
