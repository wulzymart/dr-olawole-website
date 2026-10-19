"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { RichEditor, type EditorValue } from "@/components/editor/rich-editor";
import { deletePost, savePost } from "@/app/dashboard/actions";
import { uploadMedia } from "@/lib/upload";
import type { Post } from "@/lib/types";

export function PostEditor({ post, categories }: { post?: Post; categories: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [id, setId] = useState(post?.id);
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [cover, setCover] = useState(post?.cover_url ?? "");
  const [coverAlt, setCoverAlt] = useState(post?.cover_alt ?? "");
  const [category, setCategory] = useState(post?.category ?? "");
  const [tags, setTags] = useState((post?.tags ?? []).join(", "));
  const [seoTitle, setSeoTitle] = useState(post?.seo_title ?? "");
  const [seoDesc, setSeoDesc] = useState(post?.seo_description ?? "");
  const [uploading, setUploading] = useState(false);
  const body = useRef<EditorValue>({ html: post?.content_html ?? "", json: post?.content_json ?? null });
  const status = post?.status ?? "draft";

  function save(next: "draft" | "published") {
    start(async () => {
      const r = await savePost({
        id,
        title,
        slug: slug || undefined,
        excerpt,
        cover_url: cover || null,
        cover_alt: coverAlt || null,
        content_html: body.current.html,
        content_json: body.current.json,
        category: category || null,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        seo_title: seoTitle || null,
        seo_description: seoDesc || null,
        status: next,
        published_at: post?.published_at ?? null,
      });
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.message ?? "Saved");
      if (r.id && r.id !== id) {
        setId(r.id);
        router.replace(`/dashboard/articles/${r.id}`);
      } else router.refresh();
      if (r.slug) setSlug(r.slug);
    });
  }

  async function onCover(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      setCover(await uploadMedia(file, "covers"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div className="grid content-start gap-5">
        <label className="sr-only" htmlFor="title">Title</label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Article title"
          maxLength={160}
          className="w-full border-0 border-b bg-transparent pb-3 font-display text-4xl font-semibold leading-tight outline-none placeholder:text-pine-900/30 focus-visible:border-pine-900"
        />
        <RichEditor
          initialHtml={post?.content_html ?? ""}
          initialJson={post?.content_json}
          onChange={(v) => (body.current = v)}
          placeholder="Write your article. Use the toolbar to add headings, images and videos."
          folder="articles"
        />
      </div>

      <aside className="grid content-start gap-6" aria-label="Article settings">
        <div className="grid gap-3 rounded-2xl border bg-card p-5">
          <p className="text-sm font-semibold text-muted-foreground">{status === "published" ? "Published" : "Draft"}</p>
          <Button disabled={pending} onClick={() => save("published")}>
            {pending ? <Loader2 className="animate-spin" /> : null} {status === "published" ? "Update article" : "Publish"}
          </Button>
          <Button variant="outline" disabled={pending} onClick={() => save("draft")}>
            {status === "published" ? "Unpublish and save as draft" : "Save draft"}
          </Button>
          {post && status === "published" && (
            <Link href={`/articles/${post.slug}`} target="_blank" className="text-center text-sm font-semibold text-coral-700 underline underline-offset-4">
              View on the site
            </Link>
          )}
          {id && (
            <Button
              variant="ghost"
              className="text-destructive"
              disabled={pending}
              onClick={() => {
                if (!confirm("Delete this article for good?")) return;
                start(async () => {
                  const r = await deletePost(id);
                  if (r.ok) router.push("/dashboard/articles");
                  else toast.error(r.error);
                });
              }}
            >
              <Trash2 /> Delete article
            </Button>
          )}
        </div>

        <div className="grid gap-3 rounded-2xl border bg-card p-5">
          <p className="font-semibold">Cover image</p>
          {cover ? (
            <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-mint-100">
              <Image src={cover} alt="" fill sizes="320px" className="object-cover" unoptimized />
            </div>
          ) : null}
          <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold hover:bg-mint-50">
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            {cover ? "Replace image" : "Upload image"}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => onCover(e.target.files?.[0])} />
          </label>
          <Field label="Or paste an image link" htmlFor="cover-url">
            <Input id="cover-url" value={cover} onChange={(e) => setCover(e.target.value)} placeholder="https://" inputMode="url" />
          </Field>
          <Field label="Describe the image" htmlFor="cover-alt" hint="For screen readers and search.">
            <Input id="cover-alt" value={coverAlt} onChange={(e) => setCoverAlt(e.target.value)} maxLength={200} />
          </Field>
        </div>

        <div className="grid gap-4 rounded-2xl border bg-card p-5">
          <Field label="Summary" htmlFor="excerpt" hint="Shown on article cards and in search results.">
            <Textarea id="excerpt" rows={3} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} maxLength={300} />
          </Field>
          <Field label="Category" htmlFor="category">
            <Input id="category" list="cats" value={category} onChange={(e) => setCategory(e.target.value)} maxLength={60} />
            <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label="Tags" htmlFor="tags" hint="Separate with commas.">
            <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} />
          </Field>
        </div>

        <details className="rounded-2xl border bg-card p-5">
          <summary className="cursor-pointer font-semibold">Search appearance</summary>
          <div className="mt-4 grid gap-4">
            <Field label="Web address ending" htmlFor="slug" hint="Leave empty to build it from the title.">
              <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} maxLength={90} />
            </Field>
            <Field label="Search title" htmlFor="seo-t">
              <Input id="seo-t" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} maxLength={120} />
            </Field>
            <Field label="Search description" htmlFor="seo-d">
              <Textarea id="seo-d" rows={3} value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} maxLength={300} />
            </Field>
          </div>
        </details>
      </aside>
    </div>
  );
}
