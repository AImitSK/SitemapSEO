import { SettingsIcon, TableIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import { SiteSyncActions } from "@/components/sites/site-sync-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSite } from "@/lib/sites/queries";
import { getSiteUrlStats } from "@/lib/urls/queries";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function SiteDashboardPage({ params }: Props) {
  const { id } = await params;
  const site = await getSite(id);
  if (!site) {
    notFound();
  }

  const stats = await getSiteUrlStats(id);

  return (
    <>
      <AppHeader title={site.name} subtitle={site.baseUrl} />
      <main className="flex-1 p-6 grid gap-6">
        <SiteSyncActions siteId={site.id} />

        <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
          <StatCard
            label="URLs in Datenbank"
            value={stats.total}
            hint="Aus der Sitemap importiert"
          />
          <StatCard
            label="Mit WordPress gemappt"
            value={stats.synced}
            hint="wp_post_id gesetzt"
          />
          <StatCard
            label="Optimiert"
            value={stats.optimized}
            hint="SEO-Titel + Meta-Desc vorhanden"
          />
          <StatCard
            label="Gepusht zu WordPress"
            value={stats.pushed}
            hint="Folgt in Sprint 4"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Site-Details</CardTitle>
            <CardDescription>
              Konfiguration in den{" "}
              <Link
                href={`/sites/${site.id}/settings`}
                className="underline underline-offset-2"
              >
                Einstellungen
              </Link>{" "}
              bearbeitbar.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <Row label="Sitemap-URL" value={site.sitemapUrl} />
            <Row label="WP-Benutzer" value={site.wpUsername} />
            <Row
              label="Sprachen"
              value={
                <div className="flex flex-wrap gap-1">
                  {site.languages.map((lang) => (
                    <Badge
                      key={lang}
                      variant={
                        lang === site.primaryLanguage ? "default" : "secondary"
                      }
                    >
                      {lang}
                    </Badge>
                  ))}
                </div>
              }
            />
            {site.brandContext ? (
              <Row
                label="Brand-Kontext"
                value={
                  <span className="whitespace-pre-wrap text-muted-foreground">
                    {site.brandContext}
                  </span>
                }
              />
            ) : null}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/sites/${site.id}/urls`} />}
          >
            <TableIcon className="size-4" />
            URLs ansehen
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/sites/${site.id}/settings`} />}
          >
            <SettingsIcon className="size-4" />
            Einstellungen öffnen
          </Button>
        </div>
      </main>
    </>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">
          {value.toLocaleString("de-DE")}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{hint}</CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-3 items-baseline">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="break-all">{value}</div>
    </div>
  );
}
