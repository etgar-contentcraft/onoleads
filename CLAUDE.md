# CLAUDE.md -- OnoLeads System Documentation

> Complete documentation for the OnoLeads landing page platform.
> Read this before making any changes to the codebase.

---

## Project Overview

**Project Name:** OnoLeads
**Description:** SaaS landing page builder for Ono Academic College (Israel). Admins create, manage, and publish Hebrew/Arabic/English landing pages for academic programs, events, and campaigns. Includes lead capture forms, analytics, popup campaigns, and thank-you pages.
**Stack:** Next.js 14.2 (App Router) + React 18 + TypeScript + Supabase + Tailwind CSS 4
**Deployment:** Vercel (https://onoleads.vercel.app/)
**GitHub Account:** etgar-contentcraft
**Last Updated:** 2026-04-11

---

## Architecture

### How It Works

```
User visits /lp/law-ma
    |
    v
Next.js SSG/ISR page (server component)
    |
    v
Fetches from Supabase: page -> sections -> program -> settings -> campaigns
    |
    v
Renders LandingPageLayout (client component tree)
    |-- 27 section types (hero, about, faq, gallery, etc.)
    |-- CTA modal with lead form
    |-- Pixel tracking (GA4, Meta, TikTok, LinkedIn, etc.)
    |-- Popup campaigns (exit intent, timed, scroll, sticky bar)
    |-- Cookie consent (Consent Mode v2)
    v
Lead submitted -> /api/leads -> Supabase + webhook + CAPI
    |
    v
Thank-you page (/ty?page_id=X) with 12 template layouts
```

### Key Subsystems

| Subsystem | Purpose | Key Files |
|-----------|---------|-----------|
| **Landing Pages** | SSG rendering of 27 section types | `src/app/lp/[slug]/page.tsx`, `src/components/landing/` |
| **Builder** | Drag-and-drop section editor | `src/app/dashboard/pages/[id]/builder/page.tsx` |
| **Lead Capture** | Form submission + webhook + CAPI | `src/app/api/leads/route.ts`, `src/components/landing/cta-modal.tsx` |
| **Analytics** | Session tracking, click heatmaps, pixel firing | `src/lib/analytics/`, `src/components/landing/pixel-tracker.tsx` |
| **Popup Campaigns** | Exit intent, timed, scroll, sticky bar | `src/components/landing/popup-manager.tsx`, `src/app/dashboard/campaigns/page.tsx` |
| **Thank-You Pages** | 12 template layouts with ICS calendar invites | `src/lib/thank-you/`, `src/components/landing/thank-you-renderer.tsx` |
| **Security** | CSRF, rate limiting, SSRF protection, audit logs | `src/lib/security/` |
| **i18n** | Hebrew (RTL), Arabic (RTL), English (LTR) | Language field on each page; sections use `field_${language}` pattern |
| **Rich Text** | Tiptap 2 editor for body content | `src/components/builder/rich-text/` |

### Folder Structure

```
/
├── src/
│   ├── app/                    # Next.js App Router pages + API routes
│   │   ├── api/                # 13 API routes (leads, analytics, revalidate, etc.)
│   │   ├── dashboard/          # Admin dashboard (20+ pages)
│   │   ├── lp/[slug]/          # Landing page SSG route
│   │   ├── lp/events/[slug]/   # Event page route
│   │   └── ty/                 # Thank-you page route
│   ├── components/
│   │   ├── landing/            # 17 landing page components + 27 section types
│   │   ├── builder/            # Page builder UI (editors, canvas, palette)
│   │   ├── admin/              # Dashboard components (sidebar, header, forms)
│   │   ├── compliance/         # Cookie consent, accessibility widget
│   │   └── ui/                 # 18 shadcn/ui primitives
│   ├── lib/
│   │   ├── analytics/          # Pixel manager, click IDs, event IDs
│   │   ├── capi/               # Conversions API (8 platforms)
│   │   ├── security/           # CSRF, rate limit, sanitize, audit, webhook
│   │   ├── supabase/           # Client, server, admin, storage clients
│   │   ├── thank-you/          # 12 TY template layouts + calendar invites
│   │   ├── types/              # TypeScript type definitions (6 files)
│   │   ├── rich-text/          # Rich text HTML rendering
│   │   └── i18n/               # Admin UI translations (he/en/ar)
│   ├── contexts/               # React contexts (admin language)
│   └── hooks/                  # Custom hooks (page tracking, URL params)
├── supabase/migrations/        # 29 SQL migration files
├── data/                       # Static data (programs catalog, images)
├── docs/                       # Design docs, plans, generated docs
├── scripts/                    # Utility scripts (seed, migration runner)
├── next.config.mjs             # Security headers, image optimization, caching
├── middleware.ts                # Auth, CSP, CSRF, session timeout
└── tailwind.config.ts          # Custom fonts, animations
```

---

## Database (Supabase)

### Core Tables

| Table | Purpose |
|-------|---------|
| `pages` | Landing page records (slug, title, language, status, program_id, seo fields) |
| `page_sections` | Sections belonging to a page (section_type, content JSONB, sort_order) |
| `programs` | Academic programs (name, degree, campus, duration, etc.) |
| `leads` | Captured lead submissions (name, phone, email, page_id, utm fields) |
| `settings` | Global key-value settings (webhook_url, phone, logo, etc.) |
| `pixel_configurations` | Per-platform pixel IDs + config (ga4, meta, tiktok, etc.) |
| `page_pixel_overrides` | Per-page pixel overrides (different pixel ID per page) |
| `popup_campaigns` | Popup/sticky bar campaigns (type, content, trigger, frequency) |
| `page_popup_assignments` | Many-to-many: which campaigns show on which pages |
| `events` | Event records for event-type sections |
| `shared_sections` | Reusable section templates across pages |
| `faculty_members` | Faculty/staff for faculty sections |
| `interest_areas` | Interest area taxonomy for lead routing |
| `page_interest_areas` | Many-to-many: interest areas assigned to pages |
| `profiles` | User profiles (linked to Supabase auth) |
| `audit_logs` | Admin action audit trail |
| `slug_redirects` | Old slug -> new slug redirects |
| `session_analytics` | Visitor session data |
| `logos` | Shared logo/partner assets |
| `thank_you_templates` | Custom thank-you page templates |
| `utm_links` | Smart UTM tracking links |

### RLS (Row Level Security)

- **Authenticated users**: Full CRUD on most tables
- **Anonymous users**: SELECT only on `pages`, `page_sections`, `programs`, `popup_campaigns` (needed for landing page rendering)
- **Admin client** (`createAdminClient`): Bypasses RLS for settings reads and cross-table joins

### Migrations

29 migration files in `supabase/migrations/`. Run order matters -- files are numbered/dated sequentially. Initial schema is `001_initial_schema.sql`.

---

## Landing Page Sections (27 Types)

Each section type has:
- A **renderer** in `src/components/landing/sections/` (client component with "use client")
- An **editor case** in `src/app/dashboard/pages/[id]/builder/page.tsx`
- Content stored as JSONB in `page_sections.content`

| Section Type | File | Description |
|---|---|---|
| `hero` | hero-section.tsx | Full-width hero with background image/video, heading, CTA |
| `about` | about-section.tsx | Two-column text + image/video with bullets |
| `faq` | faq-section.tsx | Expandable Q&A accordion |
| `testimonials` | testimonials-section.tsx | Student/alumni testimonials carousel |
| `stats` | stats-section.tsx | Animated number counters |
| `benefits` | benefits-section.tsx | Icon + text benefit cards |
| `gallery` | gallery-section.tsx | Photo/video grid with lightbox |
| `faculty` | faculty-section.tsx | Faculty member cards |
| `curriculum` | curriculum-section.tsx | Year-by-year course breakdown |
| `career` | career-section.tsx | Career outcome cards |
| `admission` | admission-section.tsx | Admission requirements |
| `program_info_bar` | program-info-bar.tsx | Horizontal bar with program metadata |
| `program_outcomes` | program-outcomes-section.tsx | Program outcome metrics |
| `single_image` | single-image-section.tsx | Full-width image or YouTube video |
| `video` | video-section.tsx | Standalone video embed |
| `form` | form-section.tsx | Inline lead capture form |
| `cta` | cta-section.tsx | Call-to-action banner |
| `map` | map-section.tsx | Campus location map |
| `contact_info` | contact-info-section.tsx | Contact details |
| `countdown` | countdown-section.tsx | Countdown timer to event/deadline |
| `whatsapp` | whatsapp-section.tsx | WhatsApp contact widget |
| `custom_html` | custom-html-section.tsx | Raw HTML injection |
| `text_block` | text-block-section.tsx | Rich text content block |
| `partners` | partners-section.tsx | Partner/sponsor logo grid |
| `programs_list` | programs-list-section.tsx | Expandable programs accordion |
| `accordion` | accordion-section.tsx | Generic expandable content |
| `event` | event-section.tsx | Event details with countdown |

### Content Field Convention

Sections use per-language fields with Hebrew fallback:
```
content[`heading_${language}`] || content.heading_he || "default"
```

### YouTube Video Support

Sections that support video: `hero`, `about`, `single_image`, `gallery`, `programs_list`.
- `video_url` field accepts any YouTube URL format
- `extractYoutubeId()` in `src/lib/utils/youtube.ts` parses all formats
- `MediaBlock` component (`src/components/landing/media-block.tsx`) renders either Image or 16:9 YouTube iframe
- YouTube embeds use privacy-enhanced mode: `youtube-nocookie.com`

### Rich Text

4 field types use the Tiptap rich text editor (HTML output):
- `programs_list` item body
- `faq` answer
- `benefits` description
- `accordion` body

Rich text is rendered via `richTextHtml()` from `src/lib/rich-text/render.ts` using `dangerouslySetInnerHTML` (sanitized by DOMPurify).

---

## Analytics & Tracking

### Pixel Platforms (8)

| Platform | Config Key | CAPI Support |
|----------|------------|-------------|
| GA4 | `ga4` | Yes |
| Meta/Facebook | `meta` | Yes |
| TikTok | `tiktok` | Yes |
| Google Ads | `google` | Yes |
| LinkedIn | `linkedin` | Yes |
| Outbrain | `outbrain` | Yes |
| Taboola | `taboola` | Yes |
| Twitter/X | `twitter` | Yes |

Pixel config lives in `pixel_configurations` table. Per-page overrides in `page_pixel_overrides`.

### Consent Mode v2

5-layer enforcement:
1. `consent-mode-v2` init script in `<head>` (before any pixel loads)
2. Cookie consent banner (`src/components/compliance/cookie-consent.tsx`)
3. Pixel manager checks consent before firing (`src/lib/analytics/pixel-manager.ts`)
4. CAPI sends server-side regardless (consented data only)
5. CSP headers whitelist only approved pixel domains

### Bot Protection (Lead Forms)

4-layer defense:
- `form_token` (encrypted, time-limited)
- `behavior_score` (mouse/keyboard interaction tracking)
- Honeypot field
- Session cooldown (prevents rapid resubmission)

---

## Security

### Headers (next.config.mjs + middleware.ts)

- **CSP**: Strict content security policy whitelisting only approved domains
- **HSTS**: 2-year max-age with preload
- **X-Frame-Options**: SAMEORIGIN
- **X-Content-Type-Options**: nosniff
- **Referrer-Policy**: strict-origin-when-cross-origin
- **Permissions-Policy**: Disables camera, mic, geolocation, payment

### Authentication

- Supabase Auth with email/password
- 30-minute session inactivity timeout (middleware enforced)
- CSRF token on every authenticated request
- Dashboard protected by middleware redirect to `/login`

### Webhook Security

- SSRF allowlist: only sends to approved domains
- HMAC signing on webhook payloads
- Token encryption for sensitive config (`src/lib/security/token-encryption.ts`)

---

## Key API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/leads` | POST | Lead form submission (validates, saves, fires webhook + CAPI) |
| `/api/revalidate` | POST | On-demand ISR revalidation (called after admin saves a page) |
| `/api/analytics/event` | POST | Client-side analytics event ingestion |
| `/api/popup-events` | POST | Popup view/conversion tracking |
| `/api/social-proof` | GET | Recent lead count for social proof toast |
| `/api/youtube-meta` | GET | Fetch YouTube video/playlist metadata |
| `/api/admin/users` | GET/POST | User management (list, invite) |
| `/api/admin/users/[id]` | PATCH/DELETE | User update/deactivation |
| `/api/pixels/encrypt-token` | POST | Encrypt pixel access tokens |
| `/api/audit` | GET | Fetch audit log entries |
| `/api/import-page` | POST | AI-assisted page import |
| `/api/setup` | POST | Initial database setup |

---

## Development

### Prerequisites

- Node.js 18+
- npm
- Supabase project (URL + anon key + service role key)

### Environment Variables (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TOKEN_ENCRYPTION_KEY=64-char-hex-key
```

### Commands

```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Production build (SSG for all published pages)
npm run start        # Start production server
npm run lint         # ESLint check
```

### Adding a New Section Type

1. Create renderer: `src/components/landing/sections/my-section.tsx` (must have "use client")
2. Register in `src/lib/sections/registry.ts`
3. Add editor case in `src/app/dashboard/pages/[id]/builder/page.tsx` (inside the main switch)
4. Add to `SECTION_LABELS` map in the builder
5. Add to section palette in `src/components/builder/section-palette.tsx`
6. Test: create page in dashboard, add section, publish, verify at `/lp/slug`

### Adding a New Pixel Platform

1. Add platform config to `pixel_configurations` table
2. Update CSP directives in both `middleware.ts` AND `next.config.mjs`
3. Add pixel loader in `src/lib/analytics/pixel-manager.ts`
4. Add CAPI endpoint in `src/lib/capi/endpoints.ts`
5. Update `src/components/landing/pixel-tracker.tsx` to fire events

### Database Changes

1. Create migration file: `supabase/migrations/YYYYMMDD_description.sql`
2. Include RLS policies for both authenticated and anon roles
3. Run via Supabase dashboard SQL editor or `scripts/run-migration.js`
4. Update TypeScript types in `src/lib/types/`

---

## Deployment

### Vercel

- Auto-deploys from `main` branch to https://onoleads.vercel.app/
- Environment variables set in Vercel dashboard
- ISR revalidation: pages are statically generated at build time; admin saves trigger `/api/revalidate` for on-demand regeneration

### Cache Strategy

| Route | Strategy |
|-------|----------|
| `/lp/*` | SSG at build time + on-demand ISR via revalidate API |
| `/_next/image` | 30-day cache, immutable |
| `/dashboard/*` | No cache (dynamic, auth-protected) |
| `/api/*` | No cache (dynamic) |

---

## Common Patterns

### Language Handling

Every section renderer follows this pattern:
```tsx
const isRtl = language === "he" || language === "ar";
const heading = content[`heading_${language}`] || content.heading_he || "default";
```

For 3-language labels (Hebrew/Arabic/English), use explicit checks:
```tsx
const label = language === "ar" ? "Arabic" : language === "he" ? "Hebrew" : "English";
```

Do NOT use `isRtl` to determine language — Arabic and Hebrew are both RTL but need different text.

### Supabase Clients

- `createClient()` — server-side, respects RLS (use for authenticated operations)
- `createAdminClient()` — bypasses RLS (use for settings, cross-table joins, landing page data fetching)
- Client-side uses `@supabase/ssr` cookie-based auth

### Component Conventions

- All landing page section components must have `"use client"` directive
- All section renderers accept `{ content: Record<string, unknown>; language: Language }` props
- Use `IntersectionObserver` for entrance animations (consistent pattern across all sections)
- Use `useCtaModal()` hook to open the lead capture modal from any section

---

## Notes for Claude

When helping with this project:

1. Always follow the workflow: branch -> code -> test -> commit -> PR
2. Always write clean, documented code with JSDoc comments
3. Always push to the GitHub account etgar-contentcraft
4. Deployment target: https://onoleads.vercel.app/
5. Run `npm run build` to verify changes before committing -- build must pass with 0 errors
6. When modifying sections: update both the renderer AND the builder editor case
7. When modifying CSP: update BOTH `middleware.ts` AND `next.config.mjs`
8. When adding fields to sections: use the `field_${language}` naming convention with Hebrew fallback
9. Rich text fields use `type: "richtext"` in the builder and `richTextHtml()` in renderers
10. Test landing pages on all 3 languages and verify RTL/LTR direction
