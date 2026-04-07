# Changelog

All notable changes to **OnoLeads** are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

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
