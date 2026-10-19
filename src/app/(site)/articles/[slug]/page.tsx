import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { Button } from "@/components/ui/button";
import { getPost, getPosts, getSite } from "@/lib/data";
import { sanitizeRich } from "@/lib/sanitize";
import { siteUrl } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  return {
    title: post.seo_title || post.title,
    description: post.seo_description || post.excerpt,
    alternates: { canonical: `/articles/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.seo_title || post.title,
      description: post.seo_description || post.excerpt,
      publishedTime: post.published_at ?? undefined,
      images: post.cover_url ? [{ url: post.cover_url }] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const [post, site] = await Promise.all([getPost(slug), getSite()]);
  if (!post) notFound();
  const more = (await getPosts({ limit: 4 })).filter((p) => p.slug !== post.slug).slice(0, 3);
  const date = post.published_at ? DateTime.fromISO(post.published_at).toFormat("d LLLL yyyy") : "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    image: post.cover_url,
    author: { "@type": "Physician", name: site.doctor_name, url: `${siteUrl()}/about` },
    reviewedBy: { "@type": "Physician", name: site.doctor_name },
    mainEntityOfPage: `${siteUrl()}/articles/${post.slug}`,
  };

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="mx-auto max-w-4xl px-5 pb-10 pt-14 sm:px-8 lg:pt-20">
        {post.category && (
          <Link href={`/articles?category=${encodeURIComponent(post.category)}`} className="text-sm font-semibold text-coral-700 hover:underline">
            {post.category}
          </Link>
        )}
        <h1 className="display-1 mt-3 !text-[clamp(2.3rem,1.5rem+3.6vw,4.25rem)]">{post.title}</h1>
        {post.excerpt && <p className="lede mt-6 measure">{post.excerpt}</p>}
        <div className="mt-8 flex items-center gap-4">
          <Image src={site.photo_url ?? "/images/doctor.jpg"} alt="" width={96} height={96} className="size-12 rounded-full object-cover object-top" />
          <p className="text-sm leading-tight">
            <span className="block font-semibold">Written by {site.doctor_name}</span>
            <span className="text-muted-foreground">{date}, {post.reading_minutes} min read</span>
          </p>
        </div>
      </header>

      {post.cover_url && (
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Image src={post.cover_url} alt={post.cover_alt ?? ""} width={1600} height={900} priority sizes="(min-width: 1152px) 1100px, 100vw" className="aspect-[16/9] w-full rounded-3xl object-cover" />
        </div>
      )}

      <div className="mx-auto max-w-[44rem] px-5 py-14 sm:px-8">
        <div className="rich" dangerouslySetInnerHTML={{ __html: sanitizeRich(post.content_html) }} />
        <p className="mt-14 rounded-2xl bg-mint-100 p-6 text-sm text-pine-800">
          This article is for general education and is not a substitute for personal medical advice. If you are worried about your health, book a consultation or see a doctor in person. In an emergency, go to the nearest hospital.
        </p>
        <div className="mt-10 flex flex-col items-start gap-4 rounded-3xl bg-pine-900 p-8 text-cream sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-2xl font-semibold leading-snug">Want advice for your own situation?</p>
          <Button asChild variant="coral"><Link href="/book">Book a consultation</Link></Button>
        </div>
      </div>

      {more.length > 0 && (
        <section className="border-t border-border bg-white">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
            <h2 className="display-3">Keep reading</h2>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {more.map((p) => (
                <Link key={p.id} href={`/articles/${p.slug}`} className="group block">
                  <h3 className="font-display text-xl font-semibold leading-snug group-hover:underline">{p.title}</h3>
                  <p className="mt-2 line-clamp-2 text-muted-foreground">{p.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
