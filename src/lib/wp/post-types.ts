import type { Site } from "@/lib/db/schema";
import { wpFetch } from "@/lib/wp/client";

export type SyncablePostType = {
  slug: string;
  restBase: string;
  name: string;
  yoastExposed: boolean;
};

type WpTypeEntry = {
  slug: string;
  rest_base?: string;
  name?: string;
  viewable?: boolean;
};

export async function listSyncablePostTypes(
  site: Site,
): Promise<SyncablePostType[]> {
  const res = await wpFetch(site, "/wp/v2/types?context=edit");
  if (!res.ok) {
    throw new Error(`WP /types fehlgeschlagen: ${res.status}`);
  }
  const data = (await res.json()) as Record<string, WpTypeEntry>;

  const candidates: Array<{ slug: string; restBase: string; name: string }> = [];
  for (const [slug, entry] of Object.entries(data)) {
    if (!entry.rest_base) continue;
    if (entry.viewable === false) continue;
    if (slug === "attachment" || slug === "nav_menu_item") continue;
    candidates.push({
      slug,
      restBase: entry.rest_base,
      name: entry.name ?? slug,
    });
  }

  const result: SyncablePostType[] = [];
  for (const c of candidates) {
    let yoastExposed = false;
    try {
      const probe = await wpFetch(
        site,
        `/wp/v2/${c.restBase}?per_page=1&context=edit&_fields=id,meta`,
      );
      if (probe.ok) {
        const arr = (await probe.json()) as Array<{
          id: number;
          meta?: Record<string, unknown>;
        }>;
        if (Array.isArray(arr) && arr.length > 0) {
          yoastExposed = "_yoast_wpseo_title" in (arr[0].meta ?? {});
        }
      }
    } catch {
      yoastExposed = false;
    }
    result.push({ ...c, yoastExposed });
  }

  return result;
}
