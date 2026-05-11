const LANGUAGE_NAMES: Record<string, string> = {
  de: "Deutsch",
  en: "Englisch",
  nl: "Niederländisch",
  fr: "Französisch",
  it: "Italienisch",
  pl: "Polnisch",
  es: "Spanisch",
  pt: "Portugiesisch",
};

export function languageName(code: string): string {
  return LANGUAGE_NAMES[code.toLowerCase()] ?? code.toUpperCase();
}

export function buildTranslateSystemPrompt(input: {
  sourceLanguage: string;
  targetLanguage: string;
  siteName: string;
  brandContext: string | null;
}): string {
  const brand =
    input.brandContext?.trim() || "(kein gesonderter Brand-Kontext hinterlegt)";
  const source = languageName(input.sourceLanguage);
  const target = languageName(input.targetLanguage);

  return `Du bist Übersetzer für SEO-Texte. Übersetze die folgenden 4 SEO-Felder von ${source} nach ${target}.

Brand-Kontext der Website „${input.siteName}":
${brand}

Regeln:
- SEO-Titel: ziel 50–60 Zeichen. Wenn am Ende "${input.siteName}" steht, behalte den Markennamen unverändert.
- Meta-Description: ziel 140–160 Zeichen. Aktivierender Tonfall der Vorlage erhalten, technisch-sober, KEINE Marketing-Floskeln.
- Haupt-Keyword: idiomatisch korrekt für ${target}, nicht wörtlich wenn ein anderes Wort in der Zielsprache üblicher ist (z. B. de „Wickelwellen" → en „winding shafts").
- Longtail-Keywords: 1:1 übertragen, gleiche Anzahl wie in der Quelle.

Wichtig:
- Markennamen, Produktnamen, technische Eigennamen NICHT übersetzen.
- Sprache der Ausgabe: AUSSCHLIESSLICH ${target}.
- Tonalität sober/technisch beibehalten.

Gib AUSSCHLIESSLICH ein JSON-Objekt zurück, das dem vorgegebenen Schema entspricht.`;
}

export function buildTranslateUserPrompt(input: {
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string;
  longtailKeywords: string[];
}): string {
  return [
    "Übersetze diese Felder:",
    "",
    `SEO-Titel: ${input.seoTitle}`,
    `Meta-Description: ${input.metaDescription}`,
    `Haupt-Keyword: ${input.focusKeyword}`,
    `Longtail-Keywords: ${input.longtailKeywords.length === 0 ? "(keine)" : input.longtailKeywords.join(", ")}`,
  ].join("\n");
}
