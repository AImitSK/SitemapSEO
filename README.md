# SitemapSEO

Webbasiertes Tool zur SEO-Optimierung von WordPress-Websites mit Yoast SEO. Liest Sitemaps ein, synchronisiert Yoast-Felder über die WordPress REST API, generiert KI-gestützte Vorschläge für SEO-Titel und Meta-Descriptions, ermöglicht manuelle Überarbeitung und schreibt finale Werte – mit automatischem Backup – zurück nach WordPress.

> **Status:** Sprint 1 (Foundation) abgeschlossen. Auth-Gate (Basic Auth), Drizzle-Schema, Sites-CRUD, WP-Verbindungstest und mu-Plugin-Download sind implementiert. Sprint 2 (Sitemap-Import + WP-Sync) folgt.

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

## Setup

```bash
npm install
vercel env pull .env.local   # synct Neon + Gemini + ENCRYPTION_KEY aus Vercel
npm run db:push              # Drizzle-Schema in Neon pushen
npm run dev                  # http://localhost:3000 (Basic Auth)
```

### Admin-Passwort setzen

`ADMIN_PASSWORD_HASH` ist (bewusst) nicht in den Vercel-Environments. Vor dem ersten Login generieren:

```bash
npx tsx scripts/hash-password.ts "<dein-passwort>"
```

Den ausgegebenen bcrypt-Hash an zwei Stellen eintragen:

**Vercel** (alle 3 Environments — der Hash kommt 1:1 im Function-Env an):

```bash
vercel env add ADMIN_PASSWORD_HASH production
vercel env add ADMIN_PASSWORD_HASH preview
vercel env add ADMIN_PASSWORD_HASH development
```

**Lokal** in `.env.local` — **jedes `$` mit Backslash escapen**, sonst expandiert `@next/env` `$2b`/`$12`/etc. als nicht existierende Variablen weg:

```env
ADMIN_PASSWORD_HASH="\$2b\$12\$qB5BxHn5hk4/fKr1Y/..."
```

Achtung: `vercel env pull` überschreibt `.env.local` ohne Escapes — danach das `\$`-Escaping wieder per Hand reinsetzen.

### Verfügbare Scripts

```bash
npm run dev          # Turbopack dev server
npm run build        # Production-Build
npm run start        # Production-Server
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npm run db:push      # Drizzle-Schema direkt nach Neon
npm run db:generate  # Migrations generieren
npm run db:studio    # Drizzle Studio
```

### Erforderliche Environment-Variablen

Aus Vercel via `vercel env pull` (bereits provisioniert):

```env
DATABASE_URL=postgres://...           # Neon (pooled)
DATABASE_URL_UNPOOLED=postgres://...
GOOGLE_GENERATIVE_AI_API_KEY=AIza...  # Vercel AI SDK
ENCRYPTION_KEY=<32-byte-base64>       # AES-256-GCM für WP-App-Passwords
ADMIN_USERNAME=stefan
ADMIN_PASSWORD_HASH=<bcrypt>          # manuell, s. oben
```

## Deployment

```bash
vercel deploy           # Preview
vercel deploy --prod    # Production
```

## Lizenz

Proprietär — interne Nutzung IBD Wickeltechnik / SK Online Marketing.
