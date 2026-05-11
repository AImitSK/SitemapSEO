import { notFound } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import { MuPluginDownloadCard } from "@/components/sites/mu-plugin-download";
import { SiteForm } from "@/components/sites/site-form";
import { WpConnectionTestButton } from "@/components/sites/wp-connection-test-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSite } from "@/lib/sites/queries";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function SiteSettingsPage({ params }: Props) {
  const { id } = await params;
  const site = await getSite(id);
  if (!site) {
    notFound();
  }

  return (
    <>
      <AppHeader title="Einstellungen" subtitle={site.name} />
      <main className="flex-1 p-6 grid gap-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Site-Konfiguration</CardTitle>
            <CardDescription>
              Application-Password wird beim Speichern erneut verschlüsselt.
              Leer lassen, um das aktuelle beizubehalten.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SiteForm
              mode="edit"
              siteId={site.id}
              defaults={{
                name: site.name,
                baseUrl: site.baseUrl,
                sitemapUrl: site.sitemapUrl,
                wpUsername: site.wpUsername,
                languagesCsv: site.languages.join(","),
                primaryLanguage: site.primaryLanguage,
                brandContext: site.brandContext ?? "",
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verbindungstest</CardTitle>
            <CardDescription>
              Prüft Authentifizierung und ob die Yoast-Felder über die REST-API
              sichtbar sind.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WpConnectionTestButton siteId={site.id} />
          </CardContent>
        </Card>

        <MuPluginDownloadCard />
      </main>
    </>
  );
}
