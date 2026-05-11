"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  siteName: string;
  url: string;
  seoTitle: string;
  metaDescription: string;
  separator?: string;
};

export function renderYoastVariables(
  s: string,
  ctx: { siteName: string; separator: string },
): string {
  return s
    .replace(/%%sitename%%/gi, ctx.siteName)
    .replace(/%%sep%%/gi, ctx.separator);
}

export function SerpPreview({
  siteName,
  url,
  seoTitle,
  metaDescription,
  separator = " - ",
}: Props) {
  const renderedTitle = renderYoastVariables(seoTitle || "(SEO-Titel)", {
    siteName,
    separator,
  });
  const renderedDesc = renderYoastVariables(
    metaDescription || "(Meta-Description)",
    { siteName, separator },
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
          Google-Vorschau
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border bg-white dark:bg-zinc-900 p-4 space-y-1 max-w-[600px]">
          <div className="text-xs text-emerald-700 dark:text-emerald-400 truncate">
            {url}
          </div>
          <div
            className="text-lg text-blue-700 dark:text-blue-400 leading-snug font-medium line-clamp-1"
            title={renderedTitle}
          >
            {renderedTitle}
          </div>
          <div className="text-sm text-neutral-700 dark:text-neutral-300 leading-snug line-clamp-2">
            {renderedDesc}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
