import { AppHeader } from "@/components/layout/app-header";
import { SiteForm } from "@/components/sites/site-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewSitePage() {
  return (
    <>
      <AppHeader title="Neue Site" subtitle="WordPress-Site einrichten" />
      <main className="flex-1 p-6">
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Site-Konfiguration</CardTitle>
            <CardDescription>
              Trage Basis-URL, Sitemap-URL und die WordPress-API-Zugangsdaten
              ein. Das Application-Password wird verschlüsselt gespeichert.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SiteForm mode="create" />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
