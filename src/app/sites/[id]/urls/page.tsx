import { notFound } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import { UrlFilters } from "@/components/urls/url-filters";
import { UrlPagination } from "@/components/urls/url-pagination";
import { UrlTable } from "@/components/urls/url-table";
import { getSite } from "@/lib/sites/queries";
import { listFilterFacets, listUrls } from "@/lib/urls/queries";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  lang?: string;
  type?: string;
  status?: string;
  q?: string;
  page?: string;
}>;

type Params = { params: Promise<{ id: string }>; searchParams: SearchParams };

const VALID_STATUSES = [
  "pending",
  "optimized",
  "draft",
  "pushed",
  "error",
] as const;

function asStatus(v: string | undefined): (typeof VALID_STATUSES)[number] | null {
  if (!v) return null;
  return (VALID_STATUSES as readonly string[]).includes(v)
    ? (v as (typeof VALID_STATUSES)[number])
    : null;
}

export default async function UrlsPage({ params, searchParams }: Params) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const site = await getSite(id);
  if (!site) {
    notFound();
  }

  const page = Number(sp.page ?? "1") || 1;

  const [result, facets] = await Promise.all([
    listUrls({
      siteId: id,
      language: sp.lang ?? null,
      postType: sp.type ?? null,
      status: asStatus(sp.status),
      q: sp.q ?? null,
      page,
      pageSize: 50,
    }),
    listFilterFacets(id),
  ]);

  const urlSearchParams = new URLSearchParams();
  if (sp.lang) urlSearchParams.set("lang", sp.lang);
  if (sp.type) urlSearchParams.set("type", sp.type);
  if (sp.status) urlSearchParams.set("status", sp.status);
  if (sp.q) urlSearchParams.set("q", sp.q);

  return (
    <>
      <AppHeader title="URLs" subtitle={site.name} />
      <main className="flex-1 p-6 space-y-4">
        <UrlFilters
          siteId={id}
          languages={facets.languages}
          postTypes={facets.postTypes}
          current={{
            lang: sp.lang,
            type: sp.type,
            status: sp.status,
            q: sp.q,
          }}
        />
        <UrlTable rows={result.rows} siteId={id} />
        <UrlPagination
          siteId={id}
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          searchParams={urlSearchParams}
        />
      </main>
    </>
  );
}
