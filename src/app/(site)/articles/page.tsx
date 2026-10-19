import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DateTime } from "luxon";
import { getCategories, getPosts } from "@/lib/data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Articles",
  description: "Evidence-based health articles on prevention, long-term conditions, lifestyle and common myths.",
  alternates: { canonical: "/articles" },
};

export default async function ArticlesPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const [posts, categories] = await Promise.all([getPosts({ category }), getCategories()]);
  const [lead, ...rest] = posts;
  const date = (iso: string | null) => (iso ? DateTime.fromISO(iso).toFormat("d LLLL yyyy") : "");

  return (
    <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
      <h1 className="display-1 max-w-3xl !text-[clamp(2.6rem,1.6rem+4.4vw,5rem)]">Health facts you can use</h1>
      <p className="lede mt-6 measure">Prevention, long-term conditions, everyday habits and the myths that get in the way.</p>

      {categories.length > 0 && (
        <nav aria-label="Categories" className="mt-10 flex flex-wrap gap-2">
          <Link
            href="/articles"
            className={cn("rounded-full border px-4 py-2 text-sm font-semibold", !category ? "border-pine-900 bg-pine-900 text-cream" : "border-border hover:bg-mint-100")}
          >
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c.name}
              href={`/articles?category=${encodeURIComponent(c.name)}`}
              className={cn("rounded-full border px-4 py-2 text-sm font-semibold", category === c.name ? "border-pine-900 bg-pine-900 text-cream" : "border-border hover:bg-mint-100")}
            >
              {c.name}
            </Link>
          ))}
        </nav>
      )}

      {posts.length === 0 ? (
        <p className="mt-16 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          New articles are on the way. Please check back soon.
        </p>
      ) : (
        <>
          {lead && (
            <Link href={`/articles/${lead.slug}`} className="group mt-14 grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-center lg:gap-14">
              <div className="aspect-[16/10] overflow-hidden rounded-3xl bg-mint-100">
                {lead.cover_url && (
                  <Image src={lead.cover_url} alt={lead.cover_alt ?? ""} width={1200} height={750} priority sizes="(min-width: 1024px) 55vw, 100vw" className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
                )}
              </div>
              <div>
                {lead.category && <p className="text-sm font-semibold text-coral-700">{lead.category}</p>}
                <h2 className="display-3 mt-2 group-hover:underline">{lead.title}</h2>
                <p className="mt-4 text-lg text-muted-foreground">{lead.excerpt}</p>
                <p className="mt-5 text-sm text-muted-foreground">{date(lead.published_at)}, {lead.reading_minutes} min read</p>
              </div>
            </Link>
          )}
          <div className="mt-16 grid gap-x-8 gap-y-14 border-t border-border pt-14 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((p) => (
              <Link key={p.id} href={`/articles/${p.slug}`} className="group block">
                <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-mint-100">
                  {p.cover_url && (
                    <Image src={p.cover_url} alt={p.cover_alt ?? ""} width={800} height={600} sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                  )}
                </div>
                {p.category && <p className="mt-5 text-sm font-semibold text-coral-700">{p.category}</p>}
                <h3 className="mt-1.5 font-display text-2xl font-semibold leading-tight group-hover:underline">{p.title}</h3>
                <p className="mt-2 line-clamp-3 text-muted-foreground">{p.excerpt}</p>
                <p className="mt-3 text-sm text-muted-foreground">{date(p.published_at)}, {p.reading_minutes} min read</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
