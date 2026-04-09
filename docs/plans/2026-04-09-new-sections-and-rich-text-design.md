# New Section Types + Rich Text Editor — Design Document

**Date:** 2026-04-09
**Status:** Approved
**Author:** Claude + Etgar

## Problem

Three capabilities are missing from the landing page builder:

1. **Programs / degrees list section** — an expandable list (like an accordion)
   where each item shows an image, rich-formatted descriptive text, and an
   optional "learn more" link. Used to render "Our Bachelor's Programs" style
   blocks on program-directory landing pages.

2. **Partners / logos section** — a horizontal strip of partner/sponsor logos
   with mixed aspect ratios (square, rectangular, wide) that must render at
   a uniform height while preserving each logo's original proportions.

3. **Simple text block section** — a flexible "heading + paragraph + optional
   CTA" section with style toggles for background color, alignment, width,
   and CTA on/off. Replaces the current pattern of shoe-horning these into
   the `about` or `cta` sections.

Additionally, every long-form text field in the builder today is a plain
`<textarea>` with `whitespace-pre-line` rendering. Editors need WordPress-style
rich text formatting: headings, bold/italic/underline, bullet and numbered
lists, text alignment, and links.

## Design Decisions (approved in brainstorm)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Programs source of truth | Hybrid: pull from `programs` table, override per-section |
| 2 | Logos source of truth | Standalone per-section uploads (NOT tied to existing logos library) |
| 3 | Rich text editor library | Tiptap (open-source, zero external cost) |
| 4 | Text block variants | Single `text_block` section with style toggles |
| 5 | RTE rollout scope | Progressive enhancement: RTE available on all long-text fields, plain-text values auto-render as paragraphs |
| 6 | Partners reordering | Drag-to-reorder via `@dnd-kit` |

## Architecture

### Rich text pipeline

```
Builder                                 Landing Page
┌──────────────────┐                   ┌──────────────────┐
│ RichTextField    │                   │ renderRichText() │
│  └─ Tiptap       │  HTML string      │  ├─ DOMPurify    │
│      └─ Toolbar  │ ─────────────────▶│  └─ dSetInnerHTML│
└──────────────────┘   (section.       └──────────────────┘
                        content JSONB)
```

- Editor only loaded in `/dashboard/**` routes via `dynamic()`. Zero bundle
  impact on public landing pages.
- Output is sanitized HTML with a whitelist: `p, br, strong, em, u, h2, h3,
  ul, ol, li, a`. No inline styles, no scripts, no custom tags.
- Plain-text legacy values (`\n`-separated paragraphs with no `<` characters)
  are auto-wrapped in `<p>` tags by `renderRichText()` so no migration is
  needed. Existing accordion body content, about descriptions, etc., all
  continue to render correctly.

### Section types

| section_type | Purpose | Data shape |
|--------------|---------|------------|
| `programs_list` | Expandable program cards | `{ heading, items: ProgramListItem[], expand_mode, cta_* }` |
| `partners` | Logo strip | `{ heading?, items: PartnerItem[], logo_height, background, alignment }` |
| `text_block` | Heading + rich text + optional CTA | `{ heading?, body, background, alignment, width, heading_size, padding, cta_* }` |

### `programs_list` hybrid resolution

Each `ProgramListItem` can have an optional `program_id` that links to the
`programs` table, plus optional override fields. At render time:

1. Server-side loader (`/lp/[slug]/page.tsx`) batch-fetches all unique
   `program_id`s referenced by `programs_list` sections in one query. This
   mirrors the existing `eventsMap` pattern that was added in the previous
   session.
2. The map is passed down through `landing-page-layout.tsx` to
   `ProgramsListSection`.
3. When rendering each item, the component prefers `item.title_he` if set,
   falling back to `programsMap[item.program_id].name_he`. Same pattern for
   body, image, and link. **Override always wins.**

This gives a "single source of truth with escape hatch": editors can link a
program and get all its data for free, or override any individual field for
copy that differs on a specific landing page.

### `partners` section — uniform-height logos

The crux of the user's requirement is: "some logos are square, some are
rectangular — render at uniform height without stretching." Solution:

```tsx
<div style={{ height: `${logo_height}px` }} className="flex items-center justify-center">
  <img src={item.image_url} className="h-full w-auto max-w-none object-contain" />
</div>
```

- `h-full` locks the image to the container height (same for every logo).
- `w-auto` lets the browser compute the width from the image's natural
  aspect ratio.
- `object-contain` prevents any cropping or stretching.
- `max-w-none` overrides Tailwind's default `img { max-width: 100% }` so
  wide logos can extend past their flex slot.

Wrapping all logos in `flex flex-wrap items-center gap-8 md:gap-12` produces
a responsive strip where mixed-aspect logos line up visually centered.

### `text_block` section

Single section with toggles replaces two planned variants (light-centered and
dark-hero-with-CTA). Toggles:
- `background`: `white | dark | brand | custom`
- `text_color`: `auto | dark | light` (auto = inverse of background)
- `alignment`: `right | center | left`
- `width`: `narrow | normal | wide` (maps to Tailwind `max-w-*` prose widths)
- `heading_size`: `h2 | h3` (H1 is reserved for the page hero)
- `padding`: `compact | normal | spacious`
- `cta_enabled`: boolean + `cta_text_*`
- `cta_style`: `button | link`

CTA opens the shared `useCtaModal()` (same as all other sections), not an
external URL.

## File map

### New files
- `src/components/builder/rich-text/rich-text-field.tsx` — outer field wrapper (label + editor)
- `src/components/builder/rich-text/rich-text-editor.tsx` — Tiptap instance
- `src/components/builder/rich-text/rich-text-toolbar.tsx` — toolbar buttons
- `src/lib/rich-text/render.ts` — `renderRichText()` + sanitize helper
- `src/components/landing/sections/text-block-section.tsx`
- `src/components/landing/sections/partners-section.tsx`
- `src/components/landing/sections/programs-list-section.tsx`

### Modified files
- `package.json` — add `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-text-align`, `@tiptap/extension-underline`, `isomorphic-dompurify`
- `src/components/landing/landing-page-layout.tsx` — register 3 new cases + propagate `programsMap`
- `src/app/lp/[slug]/page.tsx` — batch-fetch `programsMap` (mirror `eventsMap` pattern)
- `src/app/dashboard/pages/[id]/builder/page.tsx` — 3 editor cases + swap `TextareaField`→`RichTextField` on long-text fields
- `src/components/builder/section-palette.tsx` — 3 new palette entries

## Out of scope (YAGNI)

- Inline images inside rich text — uses `ImageUrlField` separately where needed
- Color picker for text inside RTE — backgrounds handled at section level
- Font size selector — `heading_size` handles the one case that matters
- Collaborative editing in Tiptap — builder is single-editor
- Migration script for existing `\n`-separated text — handled by auto-wrap at render time

## Rollout order

1. Install deps + scaffold `RichTextField` infrastructure
2. Build `text_block` section (simplest — validates RTE end-to-end)
3. Build `partners` section (standalone — no server-side changes)
4. Build `programs_list` section (most complex — includes `programsMap`)
5. Progressive enhancement: swap `TextareaField` → `RichTextField` on existing
   body fields (accordion, about, cta, benefits)
6. TypeScript check → production build → commit → push
