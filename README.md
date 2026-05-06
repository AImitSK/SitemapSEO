# SitemapSEO

Webbasiertes Tool zur SEO-Optimierung von WordPress-Websites mit Yoast SEO. Liest Sitemaps ein, synchronisiert Yoast-Felder über die WordPress REST API, generiert KI-gestützte Vorschläge für SEO-Titel und Meta-Descriptions, ermöglicht manuelle Überarbeitung und schreibt finale Werte – mit automatischem Backup – zurück nach WordPress.

> **Status:** Pre-Implementation. Aktuell enthält das Repo nur Spezifikation und Projekt-Doku. Der Code wird gemäß Sprint-Plan in [`docs/SITEMAPSEO_SPEC.md`](docs/SITEMAPSEO_SPEC.md) aufgebaut.

---

## Tech-Stack

- **Framework:** Next.js 15 (App Router) + TypeScript
- **UI:** Tailwind CSS + shadcn/ui + lucide-react
- **Datenbank:** Vercel Postgres + Drizzle ORM
- **KI:** Google Gemini (`gemini-2.5-flash`) via [Vercel AI SDK](https://ai-sdk.dev) — provider-agnostisch via `@ai-sdk/google`
- **Forms:** react-hook-form + zod
- **Tabellen:** TanStack Table
- **Hosting:** Vercel

## Erster Anwendungsfall

[ibd-wt.de](https://www.ibd-wt.de) (IBD Wickeltechnik GmbH) — ~900 URLs · 7 Sprachen (DE, EN, NL, FR, IT, PL, ES) · WordPress + Avada + Yoast Premium + WPML. Multi-Site-fähig von Anfang an.

## Dokumentation

- [`docs/SITEMAPSEO_SPEC.md`](docs/SITEMAPSEO_SPEC.md) — Vollständige Produkt-Spec (Architektur, Datenbank-Schema, API-Routen, UI-Aufbau, Sprint-Plan, WordPress-mu-Plugin)
- [`CLAUDE.md`](CLAUDE.md) — Hinweise für KI-gestützte Entwicklung (Claude Code)

## Setup (sobald gescaffoldet)

```bash
npm install
cp .env.example .env.local   # Variablen befüllen, siehe Spec
npm run db:push              # Drizzle-Schema in DB pushen
npm run dev
```

Erforderliche Environment-Variablen (Details in der Spec):

```env
DATABASE_URL=postgres://...
GOOGLE_GENERATIVE_AI_API_KEY=AIza...
ENCRYPTION_KEY=<32-byte-base64>     # AES-256-GCM für WP-App-Passwords
ADMIN_USERNAME=...
ADMIN_PASSWORD_HASH=<bcrypt>
```

## Deployment

```bash
vercel link
vercel env pull
vercel deploy
```

## Lizenz

Proprietär — interne Nutzung IBD Wickeltechnik / SK Online Marketing.
