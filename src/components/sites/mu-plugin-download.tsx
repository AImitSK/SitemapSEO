import { DownloadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function MuPluginDownloadCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>WordPress mu-Plugin</CardTitle>
        <CardDescription>
          Stellt die Yoast-Felder über die REST-API zur Verfügung. Ohne
          Plugin kann SitemapSEO die SEO-Felder nicht lesen oder zurück­
          schreiben.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="ml-4 list-decimal text-sm text-muted-foreground space-y-1">
          <li>Datei herunterladen.</li>
          <li>
            Nach{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              /wp-content/mu-plugins/
            </code>{" "}
            hochladen (Ordner ggf. anlegen).
          </li>
          <li>
            Datei-Berechtigungen so setzen, dass WordPress sie lesen kann (z.&nbsp;B. 644).
          </li>
          <li>Verbindungstest erneut ausführen.</li>
        </ol>
        <Button
          variant="outline"
          nativeButton={false}
          render={<a href="/api/mu-plugin" />}
        >
          <DownloadIcon className="size-4" />
          sitemapseo-rest-api.php herunterladen
        </Button>
      </CardContent>
    </Card>
  );
}
