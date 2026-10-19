import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/page-header";
import { PostEditor } from "@/components/dashboard/post-editor";
import type { Post } from "@/lib/types";

export default async function EditArticle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const { data: cats } = await supabase.from("posts").select("category");
  const categories = [...new Set((cats ?? []).map((r) => r.category).filter(Boolean))] as string[];
  return (
    <>
      <PageHeader title="Edit article" />
      <PostEditor key={data.id} post={data as Post} categories={categories} />
    </>
  );
}
