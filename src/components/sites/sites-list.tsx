import { ArrowRightIcon, GlobeIcon, PlusIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PublicSite } from "@/lib/sites/queries";

export function SitesList({ sites }: { sites: PublicSite[] }) {
  if (sites.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Noch keine Sites angelegt</CardTitle>
          <CardDescription>
            Lege deine erste WordPress-Site an, um Sitemaps zu importieren und
            Yoast-Felder zu optimieren.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/sites/new" />}>
            <PlusIcon className="size-4" />
            Erste Site anlegen
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
      {sites.map((site) => (
        <Card key={site.id} className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GlobeIcon className="size-4 text-muted-foreground" />
              {site.name}
            </CardTitle>
            <CardDescription className="truncate" title={site.baseUrl}>
              {site.baseUrl}
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {site.languages.slice(0, 6).map((lang) => (
                <Badge
                  key={lang}
                  variant={
                    lang === site.primaryLanguage ? "default" : "secondary"
                  }
                >
                  {lang}
                </Badge>
              ))}
              {site.languages.length > 6 ? (
                <Badge variant="secondary">+{site.languages.length - 6}</Badge>
              ) : null}
            </div>
            <Button
              variant="ghost"
              size="sm"
              render={<Link href={`/sites/${site.id}`} />}
            >
              Öffnen
              <ArrowRightIcon className="size-4" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
