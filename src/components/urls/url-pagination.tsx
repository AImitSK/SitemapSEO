import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

type Props = {
  siteId: string;
  page: number;
  pageCount: number;
  total: number;
  searchParams: URLSearchParams;
};

export function UrlPagination({
  siteId,
  page,
  pageCount,
  total,
  searchParams,
}: Props) {
  function hrefFor(p: number): string {
    const sp = new URLSearchParams(searchParams);
    sp.set("page", String(p));
    return `/sites/${siteId}/urls?${sp.toString()}`;
  }
  const prevDisabled = page <= 1;
  const nextDisabled = page >= pageCount;
  return (
    <div className="flex items-center justify-between pt-4">
      <div className="text-xs text-muted-foreground">
        Seite {page} von {pageCount} · {total} URL{total === 1 ? "" : "s"}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={prevDisabled}
          nativeButton={false}
          render={
            prevDisabled ? (
              <span aria-disabled="true" />
            ) : (
              <Link href={hrefFor(page - 1)} />
            )
          }
        >
          <ChevronLeftIcon className="size-3.5" />
          Zurück
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={nextDisabled}
          nativeButton={false}
          render={
            nextDisabled ? (
              <span aria-disabled="true" />
            ) : (
              <Link href={hrefFor(page + 1)} />
            )
          }
        >
          Weiter
          <ChevronRightIcon className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
