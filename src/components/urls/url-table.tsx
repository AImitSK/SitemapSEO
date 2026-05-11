import { ExternalLinkIcon } from "lucide-react";

import { LengthPill } from "@/components/urls/length-pill";
import { StatusBadge } from "@/components/urls/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Url } from "@/lib/db/schema";

type Props = {
  rows: Url[];
};

export function UrlTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
        Keine URLs gefunden. Importiere die Sitemap oder ändere die Filter.
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[3.5rem]">Lang</TableHead>
            <TableHead className="w-[8rem]">Typ</TableHead>
            <TableHead>URL / Titel</TableHead>
            <TableHead className="w-[6rem]">SEO-T.</TableHead>
            <TableHead className="w-[6rem]">Meta-D.</TableHead>
            <TableHead className="w-[10rem]">Focus-KW</TableHead>
            <TableHead className="w-[7rem]">Status</TableHead>
            <TableHead className="w-[3rem]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs uppercase">
                {r.language ?? "—"}
              </TableCell>
              <TableCell>
                {r.postType ? (
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {r.postType}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="min-w-0">
                <div
                  className="truncate text-sm font-medium"
                  title={r.title ?? r.url}
                >
                  {r.title ?? r.url}
                </div>
                <div
                  className="truncate text-xs text-muted-foreground"
                  title={r.url}
                >
                  {r.url}
                </div>
              </TableCell>
              <TableCell>
                <LengthPill value={r.currentSeoTitle} kind="seo-title" />
              </TableCell>
              <TableCell>
                <LengthPill value={r.currentMetaDesc} kind="meta-desc" />
              </TableCell>
              <TableCell className="truncate text-xs text-muted-foreground">
                {r.currentFocusKeyword ?? "—"}
              </TableCell>
              <TableCell>
                <StatusBadge status={r.status} />
              </TableCell>
              <TableCell>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                  title="Live-Seite öffnen"
                >
                  <ExternalLinkIcon className="size-3.5" />
                </a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
