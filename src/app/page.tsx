import { PlusIcon } from "lucide-react";
import Link from "next/link";

import { AppHeader } from "@/components/layout/app-header";
import { SitesList } from "@/components/sites/sites-list";
import { Button } from "@/components/ui/button";
import { listSites } from "@/lib/sites/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const sites = await listSites();
  return (
    <>
      <AppHeader
        title="Sites"
        subtitle={`${sites.length} verwaltete Website${sites.length === 1 ? "" : "s"}`}
      />
      <main className="flex-1 p-6">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Übersicht aller konfigurierten WordPress-Sites.
          </p>
          {sites.length > 0 ? (
            <Button nativeButton={false} render={<Link href="/sites/new" />}>
              <PlusIcon className="size-4" />
              Neue Site
            </Button>
          ) : null}
        </div>
        <SitesList sites={sites} />
      </main>
    </>
  );
}
