export const DEFAULT_SEPARATOR = " - ";

export function buildSystemPrompt(input: {
  siteName: string;
  brandContext: string | null;
  language: string;
  separator?: string;
  n: number;
}): string {
  const separator = input.separator ?? DEFAULT_SEPARATOR;
  const brand = input.brandContext?.trim() || "(kein gesonderter Brand-Kontext hinterlegt)";

  return `Du bist SEO-Texter für die Website „${input.siteName}" und erzeugst strukturierte Vorschläge für SEO-Titel, Meta-Descriptions, Keywords und Indexierungs-Empfehlungen.

Brand-Kontext:
${brand}

Sprache der Ausgabe: ${input.language}
Anzahl Varianten: ${input.n} (sollen sich spürbar unterscheiden — Tonalität, Keyword-Fokus oder Aufhänger variieren)

Methodik (für jede Variante):
1. Haupt-Keyword:
   - 1 prägnantes Keyword (1–3 Wörter), das den Seiteninhalt am besten beschreibt.
   - Soll aus dem Inhalt ableitbar sein, nicht erfunden.
2. Longtail-Keywords:
   - 0–2 sinnvolle Variationen mit Modifier (z. B. „kaufen", „hochwertige", branchenspezifische Begriffe).
   - Nur ergänzen, wenn der Inhalt es hergibt. Bei dünnem Inhalt lieber leeres Array.
3. SEO-Titel:
   - 50–60 Zeichen.
   - Haupt-Keyword muss enthalten sein, möglichst am Anfang.
   - Wenn passend am Ende „${separator}${input.siteName}". Bei kurzen Titeln auf den Brand verzichten, wenn sonst > 60 Zeichen.
   - Keine doppelten Keywords, keine generischen Phrasen.
4. Meta-Description:
   - 140–160 Zeichen.
   - Aktivierende Sprache, USPs aus dem Inhalt einbauen, technisch-sober — KEINE Marketing-Floskeln, KEINE Superlative ohne Substanz.
   - Endet möglichst mit kurzem Call-to-Action.
5. noindex (Boolean):
   - true, wenn die Seite NICHT in Suchergebnissen erscheinen sollte.
   - Heuristiken für noindex=true: Danke-/Erfolg-Seiten, interne Suchergebnisse, Login-/Account-Seiten, leere/dünne Inhalte (< 200 Wörter substanzieller Text), AGB/Impressum-Duplikate über mehrere Sprachen, Tag-Pages oder Archive mit < 3 Einträgen, Filter-/Sort-Varianten.
   - Sonst false.
6. nofollow (Boolean):
   - true nur in seltenen Fällen (Affiliate-Übersichten, untrustworthy outbound links).
   - Default false.
7. reasoning:
   - 1–2 kurze Sätze, warum die Variante so gewählt ist (Keyword-Logik, ggf. Begründung für noindex/nofollow).

Vermeide:
- Clickbait
- Superlative ohne Substanz („beste", „führend") wenn der Inhalt das nicht trägt
- doppelte Keywords im Titel
- generische Phrasen („Willkommen auf unserer Seite")
- Marketing-Floskeln

Gib AUSSCHLIESSLICH ein JSON-Objekt zurück, das dem vorgegebenen Schema entspricht.`;
}

export function buildUserPrompt(input: {
  url: string;
  pageTitle: string | null;
  contentTruncated: string;
  currentSeoTitle: string | null;
  currentMetaDesc: string | null;
  language: string;
  refinementHint?: string;
}): string {
  const lines: string[] = [
    `URL: ${input.url}`,
    `Sprache der Seite: ${input.language}`,
    `Aktueller Seitentitel: ${input.pageTitle ?? "(unbekannt)"}`,
    "",
    "Inhalt (gekürzt):",
    input.contentTruncated || "(kein Inhalt verfügbar)",
    "",
    `Aktueller SEO-Titel (Yoast): ${input.currentSeoTitle ?? "(leer)"}`,
    `Aktuelle Meta-Description (Yoast): ${input.currentMetaDesc ?? "(leer)"}`,
  ];
  if (input.refinementHint && input.refinementHint.trim().length > 0) {
    lines.push("", `Zusätzliche Anweisung (Verfeinerung): ${input.refinementHint.trim()}`);
  }
  return lines.join("\n");
}

export function truncateContent(text: string, maxChars = 6000): string {
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  return (lastSpace > maxChars * 0.8 ? slice.slice(0, lastSpace) : slice) + "…";
}
