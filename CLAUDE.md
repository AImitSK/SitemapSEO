# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

**Pre-implementation.** The repo currently contains only `docs/SITEMAPSEO_SPEC.md` — no Next.js app has been scaffolded yet. `docs/SITEMAPSEO_SPEC.md` is the **authoritative source of truth** for product scope, data model, API surface, UI flows, and sprint plan. Always consult it before making architectural decisions. When the spec and code diverge, ask the user which one to update rather than silently picking one.

## What This Tool Does

SitemapSEO is a web tool that ingests WordPress sitemaps, syncs Yoast SEO meta fields via the WordPress REST API, generates AI-driven SEO title / meta description suggestions via the Anthropic API, and writes approved values back to WordPress with a backup before every push.

First customer site: **ibd-wt.de** (IBD Wickeltechnik GmbH — B2B industrial, Wickeltechnik). WordPress + Avada + Yoast Premium + WPML across 7 languages (DE, EN, NL, FR, IT, PL, ES), ~900 URLs across post types `page`, `post`, `avada_faq`, `ibd_projekt`, `mitarbeiter`, `vertretung`. Multi-site is in scope from day one — never hardcode site-specific values.

## Tech Stack (per spec)

Next.js 15 App Router · TypeScript · Tailwind + shadcn/ui · lucide-react · Vercel Postgres · Drizzle or Prisma · Google Gemini (`gemini-2.5-flash`) via Vercel AI SDK (`ai` + `@ai-sdk/google`) · react-hook-form + zod · TanStack Table. Hosted on Vercel.

The ORM choice (Drizzle vs Prisma), DB choice (Vercel Postgres vs Supabase), and Phase-1 auth approach are listed as **open questions** in the spec — confirm with the user before committing to one.

## Architecture That Spans Multiple Files

The system has three external boundaries that each need their own client/abstraction layer:

1. **WordPress REST API** — per-site `wp_username` + encrypted `wp_app_password`. Yoast meta fields are normally hidden from REST and require a WordPress mu-plugin (full source in spec) installed at `/wp-content/mu-plugins/sitemapseo-rest-api.php`. PATCH writes go to `/wp-json/wp/v2/{post_type}/{id}` with `{ "meta": { "_yoast_wpseo_title": "...", ... } }`.
2. **Google Gemini via Vercel AI SDK** — use `generateObject()` with a Zod schema for structured outputs (avoids manual JSON parsing). System prompt is configurable per site (brand context, language, etc.). Default env var: `GOOGLE_GENERATIVE_AI_API_KEY`. Provider is abstracted through `@ai-sdk/google` so a later switch to Anthropic / OpenAI requires no call-site changes.
3. **Vercel Postgres** — five tables: `sites`, `urls`, `drafts` (versioned, multiple per URL), `backups` (snapshot before every push), `activity_log`. Schemas are in the spec — do not invent fields.

**Critical invariants:**
- WordPress Application Passwords are stored **encrypted** (AES-256-GCM with `ENCRYPTION_KEY`). Never log or echo them in plaintext, never commit seeds containing real credentials.
- Every push to WordPress writes a `backups` row first. A push without a preceding backup is a bug.
- Drafts are versioned (multiple per URL) — never overwrite, always insert a new row.
- Status enum on `urls`: `pending | optimized | draft | pushed | error`.
- Source enum on `drafts`: `ai_generated | manual_edit | ai_edited`.

## Conventions

- **UI language: German.** Stefan and the end users are German-speaking. All user-facing strings, error messages, and confirmation dialogs are in German. Code identifiers and commit messages stay English.
- **Tone:** B2B industrial, technical, sober — no marketing fluff in copy or AI prompts.
- **Desktop-only.** Mobile responsiveness is explicitly out of scope. Optimize for table-dense, Linear/Notion/Stripe-dashboard-style layouts.
- **Ship-per-sprint.** Each sprint in the spec must be independently deployable to Vercel.
- **Fail loud on WordPress push errors.** Clear error messages, retry mechanism, never silently lose user edits.
- SEO title target: 50–60 chars. Meta description target: 140–160 chars. The character-count indicator on edit fields needs these thresholds.

## Working With the Spec

The spec lists a **Definition of Done for MVP** as a 10-step end-to-end workflow (site setup → sitemap import → WP sync → filter → AI generate → edit → push → activity log → rollback). Use it as the integration-test scenario.

The "Sprint-Plan" section divides work into 4 days of MVP + a Phase-2 backlog. When asked to implement a feature, locate it in the sprint plan first to understand which scaffolding it depends on.

## Build / Test / Lint Commands

Not yet defined — `package.json` does not exist. Once Next.js is scaffolded, the spec lists the expected commands:

```bash
npm install
npm run dev          # local dev server
npm run db:push      # ORM schema sync
```

Vercel deployment per spec: `vercel link && vercel env pull && vercel deploy`.
