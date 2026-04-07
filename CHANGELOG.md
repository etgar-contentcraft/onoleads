# Changelog

All notable changes to **OnoLeads** are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

---

## [0.8.0] - 2026-04-07

### Added

- **New `single_image` section type** (תמונה בודדת): a deliberately minimal media section that renders one full-width image with an optional caption — no heading, no CTA, no lightbox. Editors can drop multiple instances onto a page to break up long copy with visuals. Layout knobs include `max_width`, `padding_y`, `rounded` corners toggle, and `shadow` toggle. Uses `next/image` with `unoptimized` so any image URL is accepted without touching `next.config.js`.
  - New renderer: `src/components/landing/sections/single-image-section.tsx`
  - Registry entry in `src/lib/sections/registry.ts` (category: media, icon: ImageIcon)
  - Wired into `landing-page-layout.tsx` switch with lazy dynamic import
  - Builder integration: palette card, `getDefaultContent()`, `SECTION_LABELS` map, and dedicated form editor (image upload via `ImageField`, alt text, caption per language, max width, padding, rounded/shadow toggles)
- **Geo analytics (country / region / city):** new `country`, `region`, `city` columns on `analytics_events` with partial indexes, populated from Vercel edge headers (`x-vercel-ip-country`, `x-vercel-ip-country-region`, `x-vercel-ip-city`) in `/api/analytics/event` and `/api/leads`.
- **Geo breakdown cards:**
  - Global dashboard (`/dashboard/analytics`): three-column "Countries / Regions / Cities" card with flag emojis, Hebrew country names for 32 common locales, and conversion rate per row. Only rendered when at least one geo-tagged event exists.
  - Per-page dashboard (`/dashboard/pages/[id]/analytics`): single "פילוח גאוגרפי" card with 3 sub-columns showing top 8 countries/regions/cities for the selected time range.
- **Cross-dimension filter bar on the global dashboard:** multi-select filters for UTM source, medium, campaign, device type, country, and referrer domain. Raw events are held in state and re-aggregated in-memory on filter change, so toggling filters is instant with no refetch. Filter dropdowns auto-populate with the actual values present in the current time range.
- **Attribution model selector restored** on the global dashboard (first touch / last touch / linear / U-shaped), with weight distribution computed client-side from per-cookie touchpoint chains.
- **New types:** `GeoEntry` (compute module), `GeoRow` (per-page analytics), `AnalyticsFilters` + `EMPTY_FILTERS` (filter state), `applyFilters()` + `getUniqueValues()` helpers in `compute.ts`.

### Changed

- **Auto-injection rules tightened in `buildProgramSections()`:** the program info bar only auto-injects when **2 or more** fields are populated (previously fired on a single field, producing orphan "M.A."-only cards before the main info bar). The benefits section is no longer auto-injected at all when `meta.benefits` is empty or missing — previously a Hebrew default list leaked onto English landing pages.
- **`DEFAULT_BENEFITS` in `benefits-section.tsx` is now fully bilingual** (Hebrew + English titles/descriptions for all 6 items), providing a belt-and-suspenders guard against Hebrew content leaking onto English pages.
- **Analytics ingestion routes** (`/api/analytics/event`, `/api/leads`) read and URL-decode Vercel geo headers with a 100-character cap per value to prevent header-injection abuse.

### Fixed

- Hebrew benefits section appearing on English landing pages (root cause: unconditional auto-injection + Hebrew-only default fallback).
- Stray single-field info bar card appearing before the real info bar on program landing pages (root cause: auto-injection threshold of 1 field).

### Database

- New migration `supabase/migrations/20260407_analytics_geo.sql` adds `country`, `region`, `city` columns to `analytics_events` plus four partial indexes (`idx_analytics_events_country`, `idx_analytics_events_region`, `idx_analytics_events_city`, `idx_analytics_events_country_page_date`) optimised for "NOT NULL" filtering since most historical events have no geo data.

---

## [0.7.0] - 2026-04-07

### Added

- **Form-based editors for 4 previously JSON-only section types:** `program_outcomes`, `accordion`, `contact_info`, `custom_html`. Editors now expose all fields with proper inputs (no more raw JSON editing required).
- **`CtaTextField` reusable component:** every section that has a CTA button now exposes a "CTA Button Text (override)" field in its editor. Leaving the field blank uses the renderer's default; filling it overrides per-section in all 3 languages.
- **Per-section CTA overrides wired into 7 editor cases:** `about`, `benefits`, `curriculum`, `career`, `testimonials`, `faq`, `admission`. Each shows the default text as a placeholder so editors see exactly what will appear.
- **4 new section renderer files:** `program-outcomes-section.tsx` (numbered cards grid), `accordion-section.tsx` (generic expand/collapse list), `contact-info-section.tsx` (4-column phone/email/address/hours grid), `custom-html-section.tsx` (raw HTML with `<script>` stripping guardrail).
- **3 new `LeadSource` union members:** `section_program_outcomes`, `section_accordion`, `section_contact_info` — wired through to the CTA modal so analytics can attribute leads back to these new sections.

### Changed

- `faq-section.tsx`, `testimonials-section.tsx`, `benefits-section.tsx`, `career-section.tsx`, `curriculum-section.tsx` — CTA fallback text consolidated into the `ctaText` variable declaration so the button always renders when `cta_enabled` is true (previously some renderers required the editor to have explicitly filled in `cta_text_he`).
- Builder default content templates extended with `cta_text_he: ""` + `cta_enabled: true` for all CTA-bearing section types so new sections immediately show the default button.
- `SECTION_LABELS` map in builder updated with Hebrew labels for `countdown`, `program_outcomes`, `accordion`, `contact_info`, `custom_html`.

---

## [0.6.0] - 2026-04-07

### Added

- **Logo management (ניהול לוגואים):** new admin page at `/dashboard/logos` for uploading multiple brand logos. One logo is the site-wide default; the rest can be assigned per page.
- **`logos` table:** dedicated Postgres table with partial unique index `logos_one_default` ensuring exactly one default logo at any time. RLS allows anon SELECT (so landing pages can render) and authenticated full CRUD.
- **`LogoPicker` reusable component:** grid picker with previews used in both global Settings and per-page Settings; allows clearing back to the default.
- **Cascading logo resolution:** every public surface (homepage, landing page header & footer, event pages, thank-you page) now resolves logo as: per-page override → global default from `logos` table → hardcoded ONO_LOGO fallback.
- **Sidebar nav entry:** "ניהול לוגואים" added to the Content group with `ImagePlus` icon and translations for HE/EN/AR.

### Changed

- Hardcoded `ONO_LOGO` constants in `landing-page-layout.tsx`, `event-page-layout.tsx`, `thank-you-page.tsx`, and `homepage-client.tsx` are now overridable via prop and renamed to `ONO_LOGO_FALLBACK` (preserving backward compatibility).
- `event-page-layout.tsx` adopts a `EventLogoContext` (React Context) so its 5 sub-components share the resolved logo without prop drilling.

---

## [0.5.0] - 2026-04-07

### Added

- **Dual-layer heatmap (מפת חום דו-שכבתית):** click dots layer (red spectrum) + Dwell Time layer (purple→gold gradient bands), displayed simultaneously on a full-page scrollable iframe preview.
- **Layer toggle:** switch between Clicks / Dwell Time / Both views without reloading.
- **Device toggle:** separate Desktop (1200 px) and Mobile (390 px) heatmap views.
- **ViewportTracker component:** anonymous per-section dwell-time measurement using 5% height bands; data shipped via `sendBeacon` at session end.
- **Facebook-style date picker (בורר תאריכים):** 12 preset options — Today, Yesterday, Last 7/14/28/30/90 days, This Week, Last Week, This Month, Last Month, Custom range — with exact calendar-aware boundaries.
- **Custom date range calendar:** click-to-select start/end date within the advanced date picker.

### Security & Performance (from 5-agent code review)

- Open redirect prevention in smart links — all redirect targets are now validated against an allowlist.
- CSRF cookie hardened to `SameSite=Lax` across all auth flows.
- `admin.ts` promoted to a server-only module with singleton pattern to prevent accidental client-side import.
- Per-section React error boundaries on landing pages — one broken section no longer crashes the whole page.
- 20 000-row cap on analytics queries + debounce on realtime subscriptions to prevent runaway DB reads.
- `cookie_id` generation memoised with `useMemo` — computed once per render instead of on every event.

### Database Migrations (7)

- RLS policy fixes on `analytics_events` and `dwell_time_events`.
- New indexes on `analytics_events(page_id, created_at)` and `dwell_time_events(page_id, section_index)`.
- Page version trigger: automatic pruning keeps at most 20 versions per page.

### Changed

- Analytics section description updated to mention dual-layer heatmap and Dwell Time collection.
- Help page updated with new sections: "מפת חום ו-Dwell Time" and "סינון לפי טווח תאריכים".

---

## [0.4.0] - 2026-03-28

### Added

- **Click Heatmap v4 (VH-freeze technique):** iframe loads at real viewport dimensions, `vh`-based CSS heights are frozen via JavaScript before the page expands to its full intrinsic height — eliminating the circular-dependency scroll bug.
- Separate desktop / mobile heatmap views with correct viewport widths (1200 px / 390 px).
- Heatmap scroll: iframe height is decoupled from detected height to break circular dependency.

### Fixed

- Fixed heatmap viewport: `vh`-based heights inside tall iframes are now overridden correctly.
- Heatmap scroll no longer collapses the iframe when content exceeds the initial viewport.

---

## [0.3.0] - 2026-03-10

### Added

- Initial click heatmap implementation with canvas overlay on live page iframe.
- Analytics dashboard: page views, unique visitors, conversion rate, average time on page, scroll depth, daily chart, UTM breakdown.
- First-party analytics event collection (`analytics_events` table) without dependency on Google Analytics.
- Scroll depth milestones tracked at 25 %, 50 %, 75 %, 90 %.
- Lead status column in the leads table (sent / failed / pending for webhook).
- Audit log viewer with filtering by action type, page, user, and date range.

### Changed

- Analytics API now aggregates data server-side, reducing client-side data transfer by ~80 %.

---

## [0.2.0] - 2026-02-15

### Added

- **Analytics module:** full first-party analytics dashboard per landing page.
- **UTM builder:** generate UTM-tagged URLs for campaigns directly from the dashboard.
- **Smart links:** create short, tracked URLs that redirect to landing pages.
- UTM attribution cookie (90-day persistence) — original UTM is preserved across return visits.
- CSV export for leads (filtered by current query).
- Webhook status tracking per lead (sent / failed / pending).

### Changed

- Leads table extended with `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `referrer`, and all click IDs (`gclid`, `fbclid`, `obclid`, `tblclid`, `twclid`).

---

## [0.1.0] - 2026-01-20

### Added

- Initial OnoLeads system launch.
- **Landing page builder:** drag-and-drop section reordering, show/hide, duplicate, delete, version history (20 versions).
- **18 section types:** Hero, About, Benefits, Stats, Curriculum, Career, Faculty, Testimonials, FAQ, Video, Gallery, Countdown, CTA, Map, WhatsApp, and more.
- **Lead capture forms:** 3-field modal (name, phone, email) with Israeli phone validation and privacy consent.
- **8-platform pixel system:** GA4, Meta, Google Ads, TikTok, LinkedIn, Outbrain, Taboola, Twitter/X — client-side + server-side CAPI.
- **Dynamic Text Replacement (DTR):** `{{utm_source}}` and 5 other variables replaced in real time per visitor.
- **Exit Intent Popup** and **Social Proof Toast** (per-page toggles).
- **Thank You Page** routing with conversion pixel firing.
- **Pixel management UI:** per-platform IDs and CAPI access tokens (AES-256-GCM encrypted).
- **SEO:** JSON-LD schemas (Course, FAQPage, Organization), Open Graph, Twitter Cards.
- Hebrew RTL UI throughout the admin dashboard.
