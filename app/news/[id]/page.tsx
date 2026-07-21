import { notFound } from "next/navigation";

import { ArticleReader } from "@/components/map-feature/news/article-reader";
import { AppShellV2 } from "@/components/map-feature/shell/app-shell-v2";
import { getNewsArticle } from "@/lib/map-feature/api";

export const dynamic = "force-dynamic";

// Full-page reader — the fallback when /news/{id} is opened directly (refresh,
// shared link, or a non-client navigation). In-app clicks are intercepted into
// the @modal overlay instead.
export default async function NewsArticlePage({
  params
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const { id } = await params;
  const article = await getNewsArticle(id).catch(() => null);
  if (!article) notFound();

  return (
    <AppShellV2>
      <div className="cs-reader-page">
        <ArticleReader article={article} />
      </div>
    </AppShellV2>
  );
}
