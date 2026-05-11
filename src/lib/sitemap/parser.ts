import { XMLParser } from "fast-xml-parser";

export type SitemapEntry = {
  url: string;
  lastmod?: Date;
};

const USER_AGENT = "SitemapSEO/0.1 (+https://github.com/AImitSK/SitemapSEO)";
const FETCH_TIMEOUT_MS = 15_000;
const MAX_DEPTH = 3;

const SKIP_PATTERNS = [
  /image-sitemap\.xml$/i,
  /video-sitemap\.xml$/i,
  /news-sitemap\.xml$/i,
];

const parser = new XMLParser({
  ignoreAttributes: true,
  trimValues: true,
});

async function fetchXml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/xml,text/xml" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching ${url}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function parseLastmod(value: unknown): Date | undefined {
  if (!value || typeof value !== "string") return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

async function collectFromXml(
  url: string,
  depth: number,
  visited: Set<string>,
  out: Map<string, SitemapEntry>,
): Promise<void> {
  if (visited.has(url)) return;
  visited.add(url);
  if (depth > MAX_DEPTH) return;
  if (SKIP_PATTERNS.some((re) => re.test(url))) return;

  let xml: string;
  try {
    xml = await fetchXml(url);
  } catch (err) {
    console.warn(`[sitemap] fetch failed for ${url}: ${(err as Error).message}`);
    return;
  }

  let doc: unknown;
  try {
    doc = parser.parse(xml);
  } catch (err) {
    console.warn(`[sitemap] parse failed for ${url}: ${(err as Error).message}`);
    return;
  }

  const root = doc as Record<string, unknown>;

  if (root.sitemapindex) {
    const idx = root.sitemapindex as { sitemap?: unknown };
    const entries = toArray<{ loc?: string }>(
      idx.sitemap as { loc?: string } | Array<{ loc?: string }> | undefined,
    );
    for (const entry of entries) {
      if (entry.loc) {
        await collectFromXml(entry.loc, depth + 1, visited, out);
      }
    }
    return;
  }

  if (root.urlset) {
    const urlset = root.urlset as { url?: unknown };
    const entries = toArray<{ loc?: string; lastmod?: string }>(
      urlset.url as
        | { loc?: string; lastmod?: string }
        | Array<{ loc?: string; lastmod?: string }>
        | undefined,
    );
    for (const entry of entries) {
      const loc = entry.loc?.trim();
      if (!loc) continue;
      out.set(loc, { url: loc, lastmod: parseLastmod(entry.lastmod) });
    }
    return;
  }

  console.warn(`[sitemap] unexpected root in ${url}`);
}

export async function fetchSitemap(rootUrl: string): Promise<SitemapEntry[]> {
  const visited = new Set<string>();
  const out = new Map<string, SitemapEntry>();
  await collectFromXml(rootUrl, 0, visited, out);
  return Array.from(out.values());
}
