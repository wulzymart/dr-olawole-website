import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/page-header";
import { PostEditor } from "@/components/dashboard/post-editor";

export default async function NewArticle() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("posts").select("category");
  const categories = [...new Set((data ?? []).map((r) => r.category).filter(Boolean))] as string[];
  return (
    <>
      <PageHeader title="New article" />
      <PostEditor categories={categories} />
    </>
  );
}
