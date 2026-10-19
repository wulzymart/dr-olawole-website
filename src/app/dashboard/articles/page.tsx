import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { loadSettings } from "@/lib/booking/core";
import { fmtDate } from "@/lib/format";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function ArticlesPage() {
  const { supabase } = await requireAdmin();
  const { site } = await loadSettings();
  const { data } = await supabase
    .from("posts")
    .select("id,title,slug,status,category,published_at,updated_at,reading_minutes")
    .order("updated_at", { ascending: false });
  const posts = data ?? [];
  return (
    <>
      <PageHeader title="Articles" description="Write, edit and publish health articles.">
        <Button asChild>
          <Link href="/dashboard/articles/new"><Plus /> New article</Link>
        </Button>
      </PageHeader>
      <Card>
        {posts.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-display text-xl font-semibold">No articles yet</p>
            <p className="mt-1 text-muted-foreground">Your first article is one click away.</p>
          </div>
        ) : (
          <ul className="divide-y">
            {posts.map((p) => (
              <li key={p.id}>
                <Link href={`/dashboard/articles/${p.id}`} className="flex flex-wrap items-center justify-between gap-3 p-5 hover:bg-mint-50">
                  <span className="min-w-0">
                    <span className="block truncate font-display text-xl font-semibold">{p.title}</span>
                    <span className="text-sm text-muted-foreground">
                      {p.category ? `${p.category}, ` : ""}
                      {p.status === "published" && p.published_at ? `published ${fmtDate(p.published_at, site.timezone)}` : `edited ${fmtDate(p.updated_at, site.timezone)}`}
                      , {p.reading_minutes} min read
                    </span>
                  </span>
                  <Badge variant={p.status === "published" ? "success" : "muted"}>{p.status === "published" ? "Published" : "Draft"}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
