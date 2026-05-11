import { ExternalLinkIcon, GlobeIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Draft, Url } from "@/lib/db/schema";

const SOURCE_LABELS: Record<Draft["source"], string> = {
  ai_generated: "KI",
  ai_edited: "KI bearbeitet",
  manual_edit: "Manuell",
  translated: "Übersetzt",
};

export function ContextColumn({
  url,
  siteId,
  drafts,
}: {
  url: Url;
  siteId: string;
  drafts: Draft[];
}) {
  const wpAdminUrl = url.wpPostId
    ? `${new URL(url.url).origin}/wp-admin/post.php?post=${url.wpPostId}&action=edit`
    : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Kontext</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row
            label="URL"
            value={
              <a
                href={url.url}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-blue-700 dark:text-blue-400 hover:underline"
              >
                {url.url}
              </a>
            }
          />
          <Row
            label="Sprache"
            value={
              url.language ? (
                <Badge variant="secondary" className="font-mono uppercase">
                  {url.language}
                </Badge>
              ) : (
                <span className="text-muted-foreground">—</span>
              )
            }
          />
          <Row
            label="Post-Typ"
            value={
              url.postType ? (
                <Badge variant="secondary" className="font-mono">
                  {url.postType}
                </Badge>
              ) : (
                <span className="text-muted-foreground">—</span>
              )
            }
          />
          <Row
            label="WP-Post-ID"
            value={
              url.wpPostId ? (
                <span className="font-mono text-xs">#{url.wpPostId}</span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )
            }
          />
          <Row
            label="Seitentitel"
            value={
              url.title ? (
                <span className="break-words">{url.title}</span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )
            }
          />
        </CardContent>
      </Card>

      {url.contentExcerpt ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Inhaltsauszug</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {url.contentExcerpt}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<a href={url.url} target="_blank" rel="noopener noreferrer" />}
        >
          <GlobeIcon className="size-3.5" />
          Live-Seite
          <ExternalLinkIcon className="size-3 opacity-50" />
        </Button>
        {wpAdminUrl ? (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <a href={wpAdminUrl} target="_blank" rel="noopener noreferrer" />
            }
          >
            In WordPress öffnen
            <ExternalLinkIcon className="size-3 opacity-50" />
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Draft-Verlauf</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {drafts.length === 0 ? (
            <p className="text-muted-foreground">Noch keine Drafts.</p>
          ) : (
            <ul className="space-y-2">
              {drafts.map((d) => (
                <li
                  key={d.id}
                  className="border-l-2 border-muted pl-2 space-y-0.5"
                >
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px]">
                      {SOURCE_LABELS[d.source]}
                    </Badge>
                    <span className="text-muted-foreground">
                      {new Date(d.createdAt).toLocaleString("de-DE")}
                    </span>
                  </div>
                  <div className="truncate" title={d.seoTitle ?? undefined}>
                    {d.seoTitle ?? <em className="text-muted-foreground">kein Titel</em>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href={`/sites/${siteId}/urls`} />}
        >
          ← Zurück zur URL-Liste
        </Button>
      </div>
    </div>
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
    <div className="grid grid-cols-[6rem_1fr] gap-2 items-baseline">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div>{value}</div>
    </div>
  );
}
