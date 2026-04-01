# Section Titles, CTAs & UX Improvements — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make every section's title and CTA editable (with smart defaults), fix RTL arrow direction, fix sticky header truncation, add background video/image options, add DTR guide, ensure empty-state resilience, and ensure LTR for English pages.

**Architecture:** Extend the existing `content` JSONB per section with `cta_text_*`, `cta_enabled`, and `cta_icon` fields. Update the generic editor to show a universal "Title & CTA" panel. Fix all SVG arrow paths in section components to be RTL-aware. Add `sticky_header_title` to page settings.

**Tech Stack:** Next.js App Router, React, Tailwind CSS, Supabase JSONB, shadcn/ui

---

## Task 1: Fix CTA Arrows RTL + Add cta_enabled Toggle

**Files:**
- Modify: `src/components/landing/sections/hero-section.tsx`
- Modify: `src/components/landing/sections/about-section.tsx`
- Modify: `src/components/landing/sections/cta-section.tsx`
- Modify: `src/components/landing/sections/admission-section.tsx`
- Modify: All other sections with CTA buttons

**What:**
- Replace hardcoded right-arrow SVG `M10 6l6 6-6 6` with RTL-aware arrow
- In RTL: chevron-left `M14 18l-6-6 6-6`, in LTR: chevron-right `M10 6l6 6-6 6`
- Read `cta_enabled` from content (default: true). When false, hide CTA button entirely.
- Remove `group-hover:-translate-x-1 rtl:group-hover:translate-x-1` (conflicting)

## Task 2: Add Universal Title & CTA Panel to Generic Editor

**Files:**
- Modify: `src/components/builder/section-editors/generic-editor.tsx`
- Modify: `src/app/dashboard/pages/[id]/builder/page.tsx` (hero editor inline fields)

**What:**
- Add "כותרת וקריאה לפעולה" collapsible panel at top of every section editor
- Fields: heading_he, heading_en (with char counter), cta_text_he, cta_text_en, cta_enabled toggle, cta_icon dropdown
- CTA icon options: none, arrow, phone, whatsapp, lock, checkmark, chat
- Show DTR hint on heading fields

## Task 3: Update getDefaultContent with Hebrew CTA Best Practices

**Files:**
- Modify: `src/app/dashboard/pages/[id]/builder/page.tsx` (getDefaultContent function)

**What:**
- Update all default CTA texts to researched Hebrew best practices
- Add `cta_enabled: true` (default) to all section defaults
- Add `cta_icon: "none"` default to most sections

| Section | Default heading_he | Default cta_text_he | cta_enabled |
|---------|-------------------|--------------------|----|
| hero | כותרת ראשית | השאירו פרטים | true |
| about | אודות התוכנית | גלו עוד | true |
| benefits | למה ללמוד אצלנו | בואו נתחיל | true |
| curriculum | תוכנית הלימודים | (none) | false |
| career | אפשרויות קריירה | (none) | false |
| testimonials | מה אומרים הסטודנטים | הצטרפו גם אתם | true |
| faculty | הסגל האקדמי | (none) | false |
| stats | אנו במספרים | (none) | false |
| faq | שאלות נפוצות | לא מצאתם תשובה? דברו איתנו | true |
| video | צפו בסרטון | (none) | false |
| gallery | גלריה | (none) | false |
| admission | תנאי קבלה | בדקו התאמה | true |
| cta | מוכנים להתחיל? | השאירו פרטים | true |

## Task 4: Fix Sticky Header Title + Add sticky_header_title Setting

**Files:**
- Modify: `src/components/landing/landing-page-layout.tsx` (StickyHeader component)
- Modify: `src/app/dashboard/pages/[id]/builder/page.tsx` (page settings panel)

**What:**
- Remove `max-w-[240px] truncate` from program name
- Replace with responsive: `max-w-[200px] md:max-w-[350px] lg:max-w-[500px]`
- Smart text scaling: text-xs when > 35 chars, truncate only when > 50 chars
- Always add `title={fullName}` for hover tooltip
- Add `sticky_header_title` field to PageOverrideSettings and settings UI
- StickyHeader reads: `stickyTitle || pageTitle || program?.name_he`

## Task 5: Add DTR Guide Modal

**Files:**
- Create: `src/components/builder/dtr-guide-modal.tsx`
- Modify: `src/app/dashboard/pages/[id]/builder/page.tsx` (add "?" link next to DTR hint)

**What:**
- Modal with full DTR documentation:
  - Available variables table
  - Syntax explanation with examples
  - Fallback syntax: `{{utm_source|Google}}`
  - Testing instructions (add ?utm_source=Facebook to URL)
  - Real-world scenarios (Facebook ad → landing page personalization)

## Task 6: Background Video Support for Hero

**Files:**
- Modify: `src/components/landing/sections/hero-section.tsx`
- Modify: `src/components/builder/section-editors/generic-editor.tsx` (hero fields)
- Modify: `src/app/dashboard/pages/[id]/builder/page.tsx` (hero editor)

**What:**
- Add `background_video_url` field to hero content
- If video URL provided, render `<video>` with muted autoplay loop instead of image
- Keep image as poster/fallback
- Admin editor: add video URL field with tip "YouTube or direct MP4 URL"

## Task 7: Empty-State Resilience Audit

**Files:**
- Modify: All 18 section components in `src/components/landing/sections/`

**What:**
- Every section must render gracefully with completely empty content
- No crashes on undefined/null/empty arrays
- Show tasteful placeholder or hide section entirely
- Test: render each section with `content={}`

## Task 8: LTR Layout for English Pages

**Files:**
- Modify: All section components (audit text-alignment, margin directions)
- Modify: `src/components/landing/cta-modal.tsx`

**What:**
- Ensure all `text-right` classes are conditional: `isRtl ? "text-right" : "text-left"`
- Ensure border/padding directions use logical properties or RTL-conditional
- CTA modal form labels align correctly in LTR

## Task 9: Update Help Pages

**Files:**
- Modify: `src/app/dashboard/help/page.tsx`

**What:**
- Add section about editable titles & CTAs
- Add section about CTA icon options
- Expand DTR documentation
- Add section about sticky header custom title
- Add section about background video
- Update section count and descriptions

## Task 10-12: Build, QA, Fix

- Run `npx next build` and fix any errors
- Browser-based QA testing of all features
- Fix all issues found
