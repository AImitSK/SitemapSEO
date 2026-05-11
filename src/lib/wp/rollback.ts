import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { activityLog, urls } from "@/lib/db/schema";
import { getSiteWithSecret } from "@/lib/sites/queries";
import { wpFetch } from "@/lib/wp/client";
import { inferRestBase } from "@/lib/wp/content";
import { getLatestBackup } from "@/lib/wp/push";

export type RollbackResult =
  | { ok: true; backupId: string; durationMs: number }
  | {
      ok: false;
      error: string;
      stage:
        | "load_url"
        | "load_site"
        | "no_backup"
        | "no_wp_post"
        | "no_rest_base"
        | "wp_patch"
        | "url_update";
    };

function metaRobotsString(v: boolean): string {
  return v ? "1" : "0";
}

export async function rollbackUrl(urlId: string): Promise<RollbackResult> {
  const started = Date.now();

  const [urlRow] = await db.select().from(urls).where(eq(urls.id, urlId)).limit(1);
  if (!urlRow) {
    return { ok: false, error: "URL nicht gefunden", stage: "load_url" };
  }
  const site = await getSiteWithSecret(urlRow.siteId);
  if (!site) {
    return { ok: false, error: "Site nicht gefunden", stage: "load_site" };
  }
  const backup = await getLatestBackup(urlId);
  if (!backup) {
    return {
      ok: false,
      error: "Kein Backup vorhanden",
      stage: "no_backup",
    };
  }
  if (!urlRow.wpPostId) {
    return { ok: false, error: "URL hat keine wp_post_id", stage: "no_wp_post" };
  }
  const restBase = inferRestBase(urlRow.postType);
  if (!restBase) {
    return { ok: false, error: "Post-Typ unbekannt", stage: "no_rest_base" };
  }

  const patchBody = {
    meta: {
      _yoast_wpseo_title: backup.seoTitle ?? "",
      _yoast_wpseo_metadesc: backup.metaDescription ?? "",
      _yoast_wpseo_focuskw: backup.focusKeyword ?? "",
      "_yoast_wpseo_meta-robots-noindex": metaRobotsString(backup.noindex),
      "_yoast_wpseo_meta-robots-nofollow": metaRobotsString(backup.nofollow),
    },
  };

  try {
    const res = await wpFetch(
      site,
      `/wp/v2/${restBase}/${urlRow.wpPostId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
        timeoutMs: 30_000,
      },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        error: `WP-PATCH (Rollback) fehlgeschlagen (${res.status}): ${body.slice(0, 200)}`,
        stage: "wp_patch",
      };
    }
  } catch (err) {
    return {
      ok: false,
      error: `Verbindungsfehler beim Rollback-PATCH: ${(err as Error).message}`,
      stage: "wp_patch",
    };
  }

  const nextStatus: "optimized" | "pending" =
    backup.seoTitle && backup.metaDescription ? "optimized" : "pending";

  try {
    await db
      .update(urls)
      .set({
        currentSeoTitle: backup.seoTitle,
        currentMetaDesc: backup.metaDescription,
        currentFocusKeyword: backup.focusKeyword,
        currentMetaRobotsNoindex: backup.noindex,
        currentMetaRobotsNofollow: backup.nofollow,
        status: nextStatus,
      })
      .where(eq(urls.id, urlId));
  } catch (err) {
    return {
      ok: false,
      error: `URL-Update beim Rollback fehlgeschlagen: ${(err as Error).message}`,
      stage: "url_update",
    };
  }

  const durationMs = Date.now() - started;
  await db.insert(activityLog).values({
    siteId: urlRow.siteId,
    urlId,
    action: "rolled_back",
    details: { backupId: backup.id, wpPostId: urlRow.wpPostId, durationMs },
  });

  return { ok: true, backupId: backup.id, durationMs };
}
