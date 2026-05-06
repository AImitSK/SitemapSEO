# SitemapSEO

Webbasiertes Tool zur SEO-Optimierung von WordPress-Websites mit Yoast SEO. Liest Sitemaps ein, synchronisiert mit der WordPress REST API, generiert KI-gestützte Vorschläge für SEO-Titel und Meta-Descriptions, ermöglicht manuelle Überarbeitung und schreibt die finalen Werte zurück nach WordPress.

## Projekt-Kontext

- **Ziel-Website (erster Anwendungsfall):** ibd-wt.de (IBD Wickeltechnik GmbH)
- **CMS:** WordPress mit Avada Theme + Yoast SEO Premium + WPML (7 Sprachen: DE, EN, NL, FR, IT, PL, ES)
- **Umfang:** ~900 URLs über mehrere Post-Typen (page, post, avada_faq, ibd_projekt, mitarbeiter, vertretung)
- **Branche:** B2B-Industrie, Wickeltechnik (Spannwellen, Spannköpfe, Bremsen, Bahnregelung etc.)

Das Tool soll später auch für andere WordPress-Sites nutzbar sein – Multi-Site von Anfang an mitdenken.

---

## Tech-Stack

| Komponente | Technologie |
|---|---|
| Framework | Next.js 15 (App Router) |
| Sprache | TypeScript |
| Hosting | Vercel |
| UI | Tailwind CSS + shadcn/ui |
| Icons | lucide-react |
| Datenbank | Vercel Postgres (oder Supabase, falls Free-Tier zu klein) |
| ORM | Drizzle ORM oder Prisma |
| KI | Anthropic API (Claude Sonnet 4.5) |
| Auth (Phase 1) | Single-User via Environment-Variable / NextAuth simple |
| Forms | react-hook-form + zod |
| Tabellen | TanStack Table |

---

## Architektur

```
[Browser]
   │
   ▼
[Next.js App auf Vercel]
   │
   ├──▶ [Vercel Postgres] ◀── Master-Datenbank aller URLs + Drafts + Backups
   │
   ├──▶ [WordPress REST API von ibd-wt.de] (Lesen + Schreiben Yoast-Felder)
   │
   └──▶ [Anthropic API] (KI-Vorschläge für SEO-Titel/Description)
```

---

## Datenbank-Schema (Initial)

### `sites`
Mehrere Websites verwalten.

| Feld | Typ | Beschreibung |
|---|---|---|
| id | uuid PK | |
| name | text | z.B. "IBD Wickeltechnik" |
| base_url | text | z.B. "https://www.ibd-wt.de" |
| sitemap_url | text | z.B. ".../sitemap_index.xml" |
| wp_username | text | WordPress-Benutzer für API |
| wp_app_password | text (encrypted) | Application Password |
| languages | text[] | ["de","en","nl","fr","it","pl","es"] |
| primary_language | text | "de" |
| brand_context | text | Branchenkontext für KI-Prompt |
| created_at | timestamp | |
| updated_at | timestamp | |

### `urls`
Alle aus den Sitemaps eingelesenen URLs.

| Feld | Typ | Beschreibung |
|---|---|---|
| id | uuid PK | |
| site_id | uuid FK → sites | |
| url | text | Vollständige URL |
| wp_post_id | integer | WordPress Post-ID |
| post_type | text | page, post, avada_faq etc. |
| language | text | Sprachcode |
| title | text | Aktueller Seitentitel |
| current_seo_title | text | Aktueller Yoast-Titel |
| current_meta_desc | text | Aktuelle Yoast-Meta-Description |
| current_focus_keyword | text | Aktuelles Focus-Keyword |
| content_excerpt | text | Erste 500-1000 Zeichen Inhalt (für KI-Kontext) |
| sitemap_lastmod | timestamp | Aus Sitemap |
| status | enum | pending, optimized, draft, pushed, error |
| priority | integer | 1-100, manuell setzbar |
| last_synced_at | timestamp | |
| created_at | timestamp | |
| updated_at | timestamp | |

### `drafts`
Bearbeitete Werte vor dem Push (Mehrere Drafts pro URL möglich für Versionierung).

| Feld | Typ | Beschreibung |
|---|---|---|
| id | uuid PK | |
| url_id | uuid FK → urls | |
| seo_title | text | Neuer SEO-Titel |
| meta_description | text | Neue Meta-Description |
| focus_keyword | text | Neues Focus-Keyword |
| source | enum | ai_generated, manual_edit, ai_edited |
| ai_model | text | z.B. "claude-sonnet-4-5" |
| ai_prompt_used | text | Prompt-Snapshot zur Reproduzierbarkeit |
| created_by | text | Benutzer (für später) |
| created_at | timestamp | |
| pushed_at | timestamp | nullable |

### `backups`
Snapshot der Yoast-Werte vor jedem Push (für Rollback).

| Feld | Typ | Beschreibung |
|---|---|---|
| id | uuid PK | |
| url_id | uuid FK → urls | |
| seo_title | text | Alter SEO-Titel |
| meta_description | text | Alte Meta-Description |
| focus_keyword | text | Altes Focus-Keyword |
| created_at | timestamp | |

### `activity_log`
Audit-Trail.

| Feld | Typ | Beschreibung |
|---|---|---|
| id | uuid PK | |
| site_id | uuid FK | |
| url_id | uuid FK | nullable |
| action | text | sitemap_imported, draft_created, pushed_to_wp, etc. |
| details | jsonb | |
| created_at | timestamp | |

---

## WordPress-Vorbereitung

### mu-Plugin (Pflicht)

Datei: `/wp-content/mu-plugins/sitemapseo-rest-api.php`

Schaltet die Yoast-Meta-Felder für die WordPress REST API frei (sind standardmäßig nicht zugänglich):

```php
<?php
/**
 * SitemapSEO – Yoast-Felder für REST API freischalten
 */
add_action('init', function () {
    $post_types = ['page', 'post', 'avada_faq', 'ibd_projekt', 'mitarbeiter', 'vertretung'];
    $meta_keys  = ['_yoast_wpseo_title', '_yoast_wpseo_metadesc', '_yoast_wpseo_focuskw'];

    foreach ($post_types as $pt) {
        foreach ($meta_keys as $mk) {
            register_post_meta($pt, $mk, [
                'show_in_rest'  => true,
                'single'        => true,
                'type'          => 'string',
                'auth_callback' => function () { return current_user_can('edit_posts'); },
            ]);
        }
    }
});
```

### Application Password

In WordPress: `Benutzer → Profil → Anwendungs-Passwörter → "SitemapSEO" anlegen`. Das Passwort einmalig kopieren und in der Site-Konfiguration des Tools hinterlegen.

---

## API-Routen (Next.js Route Handlers)

| Methode | Route | Zweck |
|---|---|---|
| GET | `/api/sites` | Liste aller konfigurierten Sites |
| POST | `/api/sites` | Neue Site anlegen |
| PATCH | `/api/sites/[id]` | Site bearbeiten |
| POST | `/api/sites/[id]/test-connection` | API-Zugriff testen |
| POST | `/api/sites/[id]/import-sitemap` | Sitemap importieren/aktualisieren |
| POST | `/api/sites/[id]/sync-from-wp` | Yoast-Werte aller URLs aus WP holen |
| GET | `/api/urls?siteId=&lang=&type=&status=&search=` | URLs gefiltert listen |
| GET | `/api/urls/[id]` | URL-Details inkl. Drafts und Backups |
| POST | `/api/urls/[id]/generate-ai` | KI-Vorschläge generieren |
| POST | `/api/urls/[id]/drafts` | Draft speichern |
| POST | `/api/urls/[id]/push` | Draft zu WordPress pushen (mit Backup) |
| POST | `/api/urls/[id]/rollback` | Letztes Backup wiederherstellen |
| POST | `/api/urls/bulk/generate-ai` | KI-Bulk für markierte URLs |
| POST | `/api/urls/bulk/push` | Bulk-Push markierter Drafts |
| GET | `/api/activity?siteId=` | Activity-Log |

---

## UI-Aufbau

### Routen
- `/` – Sites-Übersicht (Auswahl der zu bearbeitenden Site)
- `/sites/new` – Neue Site einrichten (Wizard: URL → Sitemap → API-Test → Sitemap-Import)
- `/sites/[id]` – Dashboard der Site (Stats, Quick-Actions)
- `/sites/[id]/urls` – Tabelle aller URLs (Hauptarbeitsfläche)
- `/sites/[id]/urls/[urlId]` – Detail-Editor einer URL
- `/sites/[id]/settings` – Site-Konfiguration, Brand-Kontext, KI-Prompt-Template
- `/sites/[id]/activity` – Activity-Log

### Tabellen-Ansicht (`/sites/[id]/urls`)

Spalten:
- Checkbox (für Bulk)
- Status-Badge (leer/Draft/optimiert/gepusht)
- Sprache (Flag-Icon)
- Post-Typ
- Titel (verkürzt)
- SEO-Titel-Länge (Indikator: leer/zu kurz/optimal/zu lang)
- Meta-Desc-Länge (Indikator)
- Focus-Keyword
- Aktion-Buttons (Bearbeiten, KI generieren, Pushen)

Filter (oben):
- Sprache (Multi-Select)
- Post-Typ (Multi-Select)
- Status (Multi-Select)
- Volltext-Suche

Bulk-Aktionen (wenn Auswahl > 0):
- KI-Vorschläge generieren (alle markierten)
- Pushen (alle Drafts markierter)
- Status setzen
- Priorität setzen

### Detail-Editor (`/sites/[id]/urls/[urlId]`)

**Layout: Drei Spalten oder Tabs**

Spalte/Tab 1 – **Kontext:**
- URL, Sprache, Post-Typ, WP-Post-ID
- Aktueller Seitentitel
- Inhaltsauszug (read-only)
- Link "In WordPress öffnen"
- Link "Live-Seite öffnen"

Spalte/Tab 2 – **Werte:**
- Aktuelle Yoast-Werte (read-only, grau)
- Editier-Felder für SEO-Titel und Meta-Description
  - Live-Zeichenanzahl mit Farb-Indikator
    - SEO-Titel: optimal 50–60 Zeichen
    - Meta-Description: optimal 140–160 Zeichen
  - Variable-Hilfen (`%%sitename%%`, `%%sep%%` einfügbar per Klick)
- Focus-Keyword-Feld

Spalte/Tab 3 – **KI & Vorschau:**
- Button "KI-Vorschlag generieren" (mit Loading-State)
- 2–3 Vorschlags-Karten (jeweils Titel + Description + Keyword)
  - Pro Karte: "Übernehmen"-Button (kopiert in Edit-Felder)
  - Pro Karte: "Verfeinern"-Button (lässt KI mit zusätzlichem Hinweis neu generieren)
- Google-SERP-Vorschau (live aktualisiert während Tippens)

**Footer-Aktionen:**
- "Als Draft speichern" (lokal in DB)
- "Speichern & Pushen" (mit Bestätigungs-Dialog + Backup-Hinweis)
- "Verwerfen"

---

## KI-Integration

### Anthropic API

- Modell: `claude-sonnet-4-5` (gutes Verhältnis Qualität/Kosten)
- Streaming optional (für bessere UX)

### Prompt-Struktur

System-Prompt (konfigurierbar pro Site):
```
Du bist ein erfahrener SEO-Experte und schreibst SEO-Titel und Meta-Descriptions
für eine B2B-Industrie-Website im Bereich {{branche}}.

Brand-Kontext:
{{brand_context}}

Vorgaben:
- SEO-Titel: 50–60 Zeichen, enthält Hauptkeyword, am Ende " | {{sitename}}"
- Meta-Description: 140–160 Zeichen, aktivierende Sprache, USPs einbauen, keine Marketing-Floskeln
- Sprache der Ausgabe: {{language}}
- Antwortformat: JSON mit Schlüsseln "seo_title", "meta_description", "focus_keyword"
- Generiere {{n}} unterschiedliche Varianten als JSON-Array

Vermeide: Clickbait, Superlative ohne Substanz, doppelte Keywords, generische Phrasen.
```

User-Prompt:
```
URL: {{url}}
Seitentitel: {{title}}
Inhalt (Auszug):
{{content_excerpt}}

Aktueller SEO-Titel: {{current_seo_title}}
Aktuelle Meta-Description: {{current_meta_desc}}

Erstelle {{n}} Vorschläge.
```

### Response-Verarbeitung

JSON parsen, Fehler abfangen (KI gibt manchmal Markdown-Codefences mit), Vorschläge in DB als Drafts ablegen mit `source = "ai_generated"`.

---

## Sprint-Plan

### Sprint 1 – Foundation (Tag 1)

- [ ] Next.js-Projekt initialisieren, Tailwind + shadcn/ui einrichten
- [ ] Vercel-Projekt anlegen, Postgres-DB verbinden
- [ ] Drizzle/Prisma Schema definieren und migrieren
- [ ] Layout (Sidebar + Header) mit shadcn-Komponenten
- [ ] Sites: anlegen, listen, bearbeiten
- [ ] WordPress-Verbindungstest-Endpoint
- [ ] mu-Plugin-Code als Download im Tool bereitstellen

### Sprint 2 – Datenimport (Tag 2)

- [ ] Sitemap-Parser (rekursiv: Index → Sub-Sitemaps → URLs)
- [ ] Spracherkennung aus URL-Pfad und hreflang-Tags
- [ ] Import in `urls`-Tabelle mit Konflikt-Handling (Update statt Duplikat)
- [ ] WordPress-API-Client: Post-ID via Slug oder URL-Lookup ermitteln
- [ ] Yoast-Werte via REST holen und in `urls` schreiben
- [ ] Tabellen-Ansicht mit Filtern, Suche, Pagination
- [ ] Status-Berechnung (leer/teilweise/optimiert)

### Sprint 3 – Editor + KI (Tag 3)

- [ ] Detail-Editor-UI
- [ ] Live-Zeichenanzahl mit Indikator
- [ ] Google-SERP-Vorschau-Komponente
- [ ] Anthropic-API-Integration
- [ ] Prompt-Template-Verwaltung pro Site
- [ ] KI-Vorschläge generieren, in DB als Drafts ablegen
- [ ] Drafts editieren und speichern

### Sprint 4 – Push + Sicherheit (Tag 4)

- [ ] Backup-Mechanismus vor Push
- [ ] Push-Endpoint zu WordPress (PATCH mit Yoast-Meta)
- [ ] Bestätigungs-Dialog
- [ ] Bulk-Push
- [ ] Rollback-Funktion
- [ ] Activity-Log-Anzeige

### Sprint 5 – Phase 2 Features (später)

- Open-Graph + Twitter Cards
- Google Search Console API für echte Keywords
- Übersetzungs-Workflow (DE → andere Sprachen)
- Multi-User mit Approval
- Template-basierte Massenbearbeitung

---

## Setup-Anweisungen

### Lokale Entwicklung

```bash
# Repo klonen
git clone <repo-url>
cd sitemapseo

# Dependencies
npm install

# Environment-Variablen
cp .env.example .env.local
# .env.local befüllen (siehe unten)

# DB-Migration
npm run db:push

# Dev-Server
npm run dev
```

### Erforderliche Environment-Variablen

```env
# Datenbank
DATABASE_URL=postgres://...
POSTGRES_URL_NON_POOLING=postgres://...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Verschlüsselung der WP-Application-Passwords
ENCRYPTION_KEY=<32-byte-base64>

# Auth (Phase 1: simpel)
ADMIN_USERNAME=stefan
ADMIN_PASSWORD_HASH=<bcrypt-hash>
```

### Vercel-Deployment

```bash
vercel link
vercel env pull
vercel deploy
```

---

## Sicherheitsaspekte

- WordPress Application Passwords **verschlüsselt** in DB speichern (AES-256-GCM mit `ENCRYPTION_KEY`)
- Bei jedem Push **automatisches Backup** in `backups`-Tabelle
- Dry-Run-Modus für gefährliche Bulk-Aktionen
- Rate-Limiting für KI-Calls (Kostenkontrolle)
- HTTPS-only zwischen Tool und WordPress
- Keine WordPress-Passwörter im Git-Repo (auch nicht in Migrations oder Seeds)

---

## Referenzen

### WordPress REST API
- Posts: `GET/PATCH /wp-json/wp/v2/pages/{id}`
- Custom Post Types: `GET/PATCH /wp-json/wp/v2/{post_type}/{id}`
- Authentifizierung: Basic Auth mit Application Password
- Meta-Felder im PATCH-Body als `{ "meta": { "_yoast_wpseo_title": "...", ... } }`

### Yoast Meta-Keys
- `_yoast_wpseo_title` – SEO-Titel
- `_yoast_wpseo_metadesc` – Meta-Description
- `_yoast_wpseo_focuskw` – Focus-Keyword
- `_yoast_wpseo_canonical` – Canonical-URL
- `_yoast_wpseo_meta-robots-noindex` – Noindex-Flag
- `_yoast_wpseo_opengraph-title` – OG-Titel (Phase 2)
- `_yoast_wpseo_opengraph-description` – OG-Description (Phase 2)
- `_yoast_wpseo_opengraph-image` – OG-Bild (Phase 2)

### Anthropic API
- Endpoint: `https://api.anthropic.com/v1/messages`
- Doku: https://docs.claude.com
- Modell für dieses Projekt: `claude-sonnet-4-5`

---

## Definition of Done für MVP

Das Tool gilt als MVP-fertig, wenn folgender End-to-End-Workflow funktioniert:

1. Stefan loggt sich ein
2. Stefan legt Site "IBD Wickeltechnik" an, hinterlegt Sitemap-URL und WordPress-API-Zugang
3. Verbindungstest grün
4. Stefan klickt "Sitemap importieren" – alle ~900 URLs sind in der Tabelle sichtbar
5. Stefan klickt "Mit WordPress synchronisieren" – aktuelle Yoast-Werte erscheinen
6. Stefan filtert auf "DE" + "Page" + "Status: leer"
7. Stefan öffnet eine URL, klickt "KI-Vorschlag generieren"
8. Stefan wählt einen Vorschlag aus, editiert ihn, speichert als Draft
9. Stefan klickt "Pushen" – alter Wert wird gesichert, neuer Wert ist in WordPress sichtbar
10. Stefan kann das Push-Ergebnis im Activity-Log nachvollziehen und bei Bedarf rollbacken

---

## Offene Fragen vor Implementierung

- [ ] Drizzle oder Prisma? (Empfehlung: Drizzle wegen Vercel-Integration)
- [ ] Vercel Postgres oder Supabase? (Empfehlung: Vercel Postgres für simplen Start)
- [ ] Auth in Phase 1: Basic-Auth-Middleware oder NextAuth Credentials Provider?
- [ ] Soll es Subscription-/Payment-Logik geben (für späteren SaaS-Einsatz)?

---

## Hinweise für Claude Code

- **Mobile-First nicht erforderlich** – Tool wird ausschließlich am Desktop verwendet
- **Sprache der UI:** Deutsch (Stefan ist deutschsprachig, Endnutzer sind deutschsprachig)
- **Branchenkontext:** B2B-Industrie, Wickeltechnik – seriöse, technische Tonalität bevorzugen
- **Erst lauffähiges MVP, dann Features** – jeder Sprint soll deploybar sein
- **Bei Designentscheidungen:** Klarheit vor Schnörkel. Tabellen-zentrische UI wie in Linear, Notion oder Stripe-Dashboard
- **Bei Fehlern beim WordPress-Push:** Klare Fehlermeldungen, Retry-Mechanismus, niemals stillschweigend Daten verlieren
