import { DownloadIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MU_PLUGIN_VERSION } from "@/lib/wp/mu-plugin-source";

export function MuPluginDownloadCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          WordPress mu-Plugin
          <Badge variant="secondary" className="font-mono text-[10px]">
            v{MU_PLUGIN_VERSION}
          </Badge>
        </CardTitle>
        <CardDescription>
          Stellt Yoast-Felder, Robots-Meta und WPML-Übersetzungspaare über die
          REST-API zur Verfügung. <strong>Bei Update auf v2</strong>: alte Datei
          unter <code className="rounded bg-muted px-1">/wp-content/mu-plugins/</code>{" "}
          ersetzen und anschließend „Mit WordPress synchronisieren" erneut
          klicken, um Translation-IDs einzulesen.
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
