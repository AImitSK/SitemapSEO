const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#039;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&ndash;": "–",
  "&mdash;": "—",
  "&hellip;": "…",
  "&laquo;": "«",
  "&raquo;": "»",
};

const NUMERIC_ENTITY_RE = /&#(\d+);/g;
const NAMED_ENTITY_RE = /&(?:amp|lt|gt|quot|#039|apos|nbsp|ndash|mdash|hellip|laquo|raquo);/g;

export function decodeEntities(s: string): string {
  return s
    .replace(NAMED_ENTITY_RE, (m) => ENTITIES[m] ?? m)
    .replace(NUMERIC_ENTITY_RE, (_, code) =>
      String.fromCharCode(Number(code)),
    );
}

export function stripHtml(s: string): string {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function htmlToText(html: string): string {
  return decodeEntities(stripHtml(html));
}
