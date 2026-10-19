import { createPublicClient } from "./supabase/public";
import type { Post, Service, SiteSettings } from "./types";

export const DEFAULT_SITE: SiteSettings = {
  doctor_name: "Dr Olawole Olawale Martins",
  short_name: "Dr Olawole",
  post_nominals: "MBBS",
  specialty: "Resident Doctor in Family Medicine",
  headline: "Know the facts. Live healthier.",
  tagline: "Clear, evidence-based guidance on prevention, long-term conditions and everyday health, in plain language.",
  short_bio: "",
  about_html: "",
  credentials: [],
  experience: [],
  education: [],
  interests: [],
  approach: [],
  engagements: [],
  mdcn_number: null,
  photo_url: null,
  contact_email: null,
  phone: null,
  whatsapp_number: null,
  location: null,
  socials: {},
  seo_description: null,
  timezone: "Africa/Lagos",
};

export async function getSite(): Promise<SiteSettings> {
  try {
    const { data } = await createPublicClient().from("site_settings").select("*").eq("id", 1).maybeSingle();
    return { ...DEFAULT_SITE, ...(data ?? {}) } as SiteSettings;
  } catch {
    return DEFAULT_SITE;
  }
}

export async function getServices(): Promise<Service[]> {
  try {
    const { data } = await createPublicClient()
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .order("duration_minutes");
    return (data ?? []) as Service[];
  } catch {
    return [];
  }
}

const POST_LIST =
  "id, slug, title, excerpt, cover_url, cover_alt, published_at, category, tags, reading_minutes, status, seo_title, seo_description, created_at, updated_at";

export async function getPosts(opts: { limit?: number; category?: string } = {}) {
  try {
    let q = createPublicClient()
      .from("posts")
      .select(POST_LIST)
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false });
    if (opts.category) q = q.eq("category", opts.category);
    if (opts.limit) q = q.limit(opts.limit);
    const { data } = await q;
    return (data ?? []) as Omit<Post, "content_html" | "content_json">[];
  } catch {
    return [];
  }
}

export async function getPost(slug: string) {
  try {
    const { data } = await createPublicClient()
      .from("posts")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .maybeSingle();
    return (data as Post | null) ?? null;
  } catch {
    return null;
  }
}

export async function getCategories() {
  const posts = await getPosts();
  const counts = new Map<string, number>();
  for (const p of posts) if (p.category) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
}
