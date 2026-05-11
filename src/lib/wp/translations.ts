import type { Site } from "@/lib/db/schema";
import { wpFetch } from "@/lib/wp/client";

export type WpmlInfo = {
  trid: string;
  siblings: Record<string, number>;
};

export type MuPluginVersion = {
  version: string;
  wpml: boolean;
};

export async function checkMuPluginVersion(
  site: Site,
): Promise<MuPluginVersion | null> {
  try {
    const res = await wpFetch(site, "/sitemapseo/v1/version", {
      timeoutMs: 10_000,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as MuPluginVersion;
    return data;
  } catch {
    return null;
  }
}
