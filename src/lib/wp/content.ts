import type { Site } from "@/lib/db/schema";
import { wpFetch } from "@/lib/wp/client";
import { htmlToText } from "@/lib/wp/text";

const REST_BASE_FOR_TYPE: Record<string, string> = {
  page: "pages",
  post: "posts",
  attachment: "media",
  avada_faq: "avada_faq",
  ibd_projekt: "ibd_projekt",
  mitarbeiter: "mitarbeiter",
  vertretung: "vertretung",
};

export function inferRestBase(postType: string | null): string | null {
  if (!postType) return null;
  return REST_BASE_FOR_TYPE[postType] ?? postType;
}

export async function fetchPostContent(
  site: Site,
  restBase: string,
  wpPostId: number,
): Promise<string> {
  try {
    const res = await wpFetch(
      site,
      `/wp/v2/${restBase}/${wpPostId}?context=edit&_fields=content`,
      { timeoutMs: 30_000 },
    );
    if (!res.ok) return "";
    const data = (await res.json()) as { content?: { rendered?: string } };
    const html = data.content?.rendered ?? "";
    if (!html) return "";
    const text = htmlToText(html);
    return text.slice(0, 8000);
  } catch {
    return "";
  }
}
