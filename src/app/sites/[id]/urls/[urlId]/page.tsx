import { notFound } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import { ContextColumn } from "@/components/editor/context-column";
import { UrlEditor } from "@/components/editor/url-editor";
import { getUrlWithSite } from "@/lib/urls/detail";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; urlId: string }> };

export default async function UrlDetailPage({ params }: Params) {
  const { id: siteId, urlId } = await params;
  const data = await getUrlWithSite(urlId);
  if (!data || data.site.id !== siteId) {
    notFound();
  }
  const { url, site, recentDrafts } = data;

  return (
    <>
      <AppHeader title="URL bearbeiten" subtitle={url.url} />
      <main className="flex-1 p-6">
        <div className="grid grid-cols-1 xl:grid-cols-[20rem_1fr] gap-6">
          <ContextColumn url={url} siteId={siteId} drafts={recentDrafts} />
          <UrlEditor url={url} siteName={site.name} />
        </div>
      </main>
    </>
  );
}
