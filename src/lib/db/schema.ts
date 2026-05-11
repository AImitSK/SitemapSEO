import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const urlStatus = pgEnum("url_status", [
  "pending",
  "optimized",
  "draft",
  "pushed",
  "error",
]);

export const draftSource = pgEnum("draft_source", [
  "ai_generated",
  "manual_edit",
  "ai_edited",
]);

export const sites = pgTable("sites", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  baseUrl: text("base_url").notNull(),
  sitemapUrl: text("sitemap_url").notNull(),
  wpUsername: text("wp_username").notNull(),
  wpAppPassword: text("wp_app_password").notNull(),
  languages: text("languages").array().notNull(),
  primaryLanguage: text("primary_language").notNull(),
  brandContext: text("brand_context"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const urls = pgTable(
  "urls",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    wpPostId: integer("wp_post_id"),
    postType: text("post_type"),
    language: text("language"),
    title: text("title"),
    currentSeoTitle: text("current_seo_title"),
    currentMetaDesc: text("current_meta_desc"),
    currentFocusKeyword: text("current_focus_keyword"),
    contentExcerpt: text("content_excerpt"),
    sitemapLastmod: timestamp("sitemap_lastmod", { withTimezone: true }),
    status: urlStatus("status").default("pending").notNull(),
    priority: integer("priority").default(50).notNull(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("urls_site_url_uniq").on(t.siteId, t.url),
    index("urls_site_idx").on(t.siteId),
    index("urls_site_status_idx").on(t.siteId, t.status),
    index("urls_site_language_idx").on(t.siteId, t.language),
  ],
);

export const drafts = pgTable(
  "drafts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    urlId: uuid("url_id")
      .notNull()
      .references(() => urls.id, { onDelete: "cascade" }),
    seoTitle: text("seo_title"),
    metaDescription: text("meta_description"),
    focusKeyword: text("focus_keyword"),
    source: draftSource("source").notNull(),
    aiModel: text("ai_model"),
    aiPromptUsed: text("ai_prompt_used"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    pushedAt: timestamp("pushed_at", { withTimezone: true }),
  },
  (t) => [
    index("drafts_url_created_idx").on(t.urlId, t.createdAt.desc()),
  ],
);

export const backups = pgTable(
  "backups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    urlId: uuid("url_id")
      .notNull()
      .references(() => urls.id, { onDelete: "cascade" }),
    seoTitle: text("seo_title"),
    metaDescription: text("meta_description"),
    focusKeyword: text("focus_keyword"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("backups_url_created_idx").on(t.urlId, t.createdAt.desc()),
  ],
);

export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    urlId: uuid("url_id").references(() => urls.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    details: jsonb("details").default(sql`'{}'::jsonb`).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("activity_site_created_idx").on(t.siteId, t.createdAt.desc()),
  ],
);

export type Site = typeof sites.$inferSelect;
export type NewSite = typeof sites.$inferInsert;
export type Url = typeof urls.$inferSelect;
export type Draft = typeof drafts.$inferSelect;
export type Backup = typeof backups.$inferSelect;
export type ActivityLogEntry = typeof activityLog.$inferSelect;
