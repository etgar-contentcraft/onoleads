# New Sections + Rich Text Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add three new landing-page section types (programs_list, partners, text_block) and a Tiptap-based rich text editor that progressively replaces all long-text fields in the builder.

**Architecture:** Tiptap editor wrapped in a `RichTextField` component replaces `TextareaField` for body/description fields. HTML output stored in existing `section.content` JSONB. A `renderRichText()` helper on the landing page sanitizes and renders both legacy plain-text and new HTML values. Three new section renderers registered in the standard pipeline (section-palette → builder case → landing-page-layout → section component).

**Tech Stack:** Tiptap 2 (React + StarterKit + Link + TextAlign + Underline), isomorphic-dompurify, Next.js 14, Supabase, Tailwind CSS, @dnd-kit (already installed).

---

### Task 1: Install Tiptap + DOMPurify Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install all new packages**

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-text-align @tiptap/extension-underline @tiptap/pm isomorphic-dompurify
npm install --save-dev @types/dompurify
```

**Step 2: Verify installation**

Run: `npx tsc --noEmit 2>&1 | head -5`
Expected: No new errors

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "Add: Tiptap rich text editor + DOMPurify deps"
```

---

### Task 2: Build renderRichText Helper

**Files:**
- Create: `src/lib/rich-text/render.ts`

**Step 1: Create the sanitize + render helper**

```ts
// src/lib/rich-text/render.ts
/**
 * Rich-text rendering helper for landing pages.
 *
 * Accepts either plain text (\n-separated paragraphs, legacy data) or HTML
 * (produced by Tiptap in the builder). Returns a sanitized HTML string safe
 * for dangerouslySetInnerHTML.
 *
 * Loaded only on the landing-page side — the builder never imports this file.
 */

import DOMPurify from "isomorphic-dompurify";

/** Tags the Tiptap toolbar can produce — nothing else gets through. */
const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "h2", "h3",
  "ul", "ol", "li", "a", "span",
];

/** Attributes the RTE needs (href for links, style for text-align). */
const ALLOWED_ATTR = ["href", "target", "rel", "style", "dir"];

/**
 * Detect whether a string is HTML (contains at least one tag) or plain text.
 */
function isHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}

/**
 * Convert plain text with \n separators into simple HTML paragraphs.
 * Double newlines become paragraph breaks; single newlines become <br>.
 */
function plainTextToHtml(text: string): string {
  return text
    .split(/\n\n+/)
    .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/**
 * Render a rich-text value (HTML or legacy plain-text) into sanitized HTML.
 *
 * @param value — raw string from section.content JSONB
 * @returns sanitized HTML string, or empty string if value is falsy
 */
export function renderRichText(value: string | null | undefined): string {
  if (!value || !value.trim()) return "";

  const html = isHtml(value) ? value : plainTextToHtml(value);

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Strip style values other than text-align to prevent injection
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Convenience wrapper returning the shape React expects for
 * dangerouslySetInnerHTML.
 */
export function richTextHtml(value: string | null | undefined): { __html: string } {
  return { __html: renderRichText(value) };
}
```

**Step 2: Verify TS compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/lib/rich-text/render.ts
git commit -m "Add: renderRichText helper — sanitize HTML + auto-wrap legacy plain text"
```

---

### Task 3: Build RichTextField Component (Builder)

**Files:**
- Create: `src/components/builder/rich-text/rich-text-toolbar.tsx`
- Create: `src/components/builder/rich-text/rich-text-editor.tsx`
- Create: `src/components/builder/rich-text/rich-text-field.tsx`

**Step 1: Create the toolbar**

File: `src/components/builder/rich-text/rich-text-toolbar.tsx`

The toolbar renders icon buttons for: H2, H3, Bold, Italic, Underline, BulletList, OrderedList, AlignRight, AlignCenter, AlignLeft, Link, ClearFormatting. Each button toggles its Tiptap command and shows active state.

Key implementation details:
- Import `type { Editor } from "@tiptap/react"`
- Each button: `onClick={() => editor.chain().focus().toggleBold().run()}`
- Active state: `editor.isActive("bold")` → `bg-[#B8D900]/20`
- Link button: opens `window.prompt("URL:")` → `editor.chain().focus().setLink({ href: url }).run()`
- Use Lucide icons: `Bold, Italic, Underline, List, ListOrdered, AlignRight, AlignCenter, AlignLeft, Link2, Heading2, Heading3, RemoveFormatting`
- Wrap in `<div className="flex flex-wrap gap-0.5 p-1.5 border-b border-[#E5E5E5] bg-[#FAFAFA] rounded-t-lg">`
- Each button: `<button className="w-7 h-7 rounded flex items-center justify-center text-[#716C70] hover:bg-[#F0F0F0] ...">`

**Step 2: Create the editor wrapper**

File: `src/components/builder/rich-text/rich-text-editor.tsx`

Key implementation details:
- `useEditor` from `@tiptap/react` with extensions: `StarterKit.configure({ heading: { levels: [2, 3] } })`, `Underline`, `Link.configure({ openOnClick: false })`, `TextAlign.configure({ types: ["heading", "paragraph"] })`
- `EditorContent` from `@tiptap/react` renders inside a styled container
- `onUpdate: ({ editor }) => onChange(editor.getHTML())` — pushes HTML to parent
- `useEffect` to update content when `value` prop changes externally (e.g. reset)
- Wrap `EditorContent` in `<div dir="auto" className="prose prose-sm max-w-none px-3 py-2 min-h-[120px] focus-within:ring-2 focus-within:ring-[#B8D900]/30 border border-[#E5E5E5] rounded-b-lg">`
- Import Toolbar component above the editor content

**Step 3: Create the field wrapper**

File: `src/components/builder/rich-text/rich-text-field.tsx`

```tsx
"use client";
/**
 * RichTextField — drop-in replacement for TextareaField in the builder.
 *
 * Wraps the Tiptap editor in a labeled field that matches the visual style
 * of the existing Field/TextareaField components.
 */

import dynamic from "next/dynamic";
import { Label } from "@/components/ui/label";

// Lazy-load the editor to keep the builder's initial bundle lean.
// Tiptap + ProseMirror add ~65kb gzipped — only loaded when RichTextField mounts.
const RichTextEditor = dynamic(
  () => import("./rich-text-editor").then((m) => ({ default: m.RichTextEditor })),
  { ssr: false, loading: () => <div className="h-[120px] rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] animate-pulse" /> }
);

interface RichTextFieldProps {
  label: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  dir?: "rtl" | "ltr" | "auto";
}

export function RichTextField({ label, value, onChange, placeholder, dir = "auto" }: RichTextFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-[#716C70]">{label}</Label>
      <RichTextEditor value={value} onChange={onChange} placeholder={placeholder} dir={dir} />
    </div>
  );
}
```

**Step 4: Verify TS compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 5: Commit**

```bash
git add src/components/builder/rich-text/
git commit -m "Add: RichTextField component — Tiptap editor with toolbar for builder"
```

---

### Task 4: Build text_block Section (Renderer + Editor + Registration)

**Files:**
- Create: `src/components/landing/sections/text-block-section.tsx`
- Modify: `src/components/landing/landing-page-layout.tsx` (add import + case)
- Modify: `src/app/dashboard/pages/[id]/builder/page.tsx` (add SECTION_LIBRARY entry ~line 258, getDefaultContent case ~line 470, SectionEditModal case ~line 2560)

**Step 1: Create the landing-page renderer**

File: `src/components/landing/sections/text-block-section.tsx`

A simple section that renders:
- Optional heading (H2 or H3 based on `heading_size`)
- Rich text body via `renderRichText()` + `dangerouslySetInnerHTML`
- Optional CTA button via `useCtaModal()`
- Background variants: white, dark (#1e1a2e navy from screenshot), brand (#B8D900), custom hex
- Text color auto-derived: dark bg → white text, light bg → dark text (unless overridden)
- Width: narrow (`max-w-xl`), normal (`max-w-3xl`), wide (`max-w-5xl`)
- Padding: compact (`py-12`), normal (`py-20 md:py-28`), spacious (`py-32 md:py-40`)
- Alignment: `text-right`, `text-center`, `text-left`
- IntersectionObserver for fade-in animation (same pattern as AccordionSection)
- Use `richTextHtml()` from `src/lib/rich-text/render.ts`

**Step 2: Register in landing-page-layout.tsx**

At top of file (~line 42), add dynamic import:
```tsx
const TextBlockSection = dynamic(() => import("./sections/text-block-section").then(mod => ({ default: mod.TextBlockSection })));
```

In `renderSection()` switch (~line 386), add:
```tsx
case "text_block":
  return <TextBlockSection content={content} language={language} />;
```

**Step 3: Register in builder — SECTION_LIBRARY**

At `src/app/dashboard/pages/[id]/builder/page.tsx` after the `countdown` entry (~line 258), add three new entries:

```tsx
{
  type: "text_block",
  nameHe: "בלוק טקסט",
  descriptionHe: "כותרת + טקסט עשיר + CTA אופציונלי",
  color: "bg-slate-100 text-slate-600",
  iconPath: "M4 6h16M4 12h16M4 18h7",
},
{
  type: "partners",
  nameHe: "שותפים ולוגואים",
  descriptionHe: "רצועת לוגואים של שותפים ומשתפי פעולה",
  color: "bg-fuchsia-100 text-fuchsia-600",
  iconPath: "M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5m-4 0h4",
},
{
  type: "programs_list",
  nameHe: "רשימת תארים",
  descriptionHe: "אקורדיון תארים עם תמונה, טקסט עשיר ולינק",
  color: "bg-emerald-100 text-emerald-600",
  iconPath: "M12 14l9-5-9-5-9 5 9 5zm0 7l9-5-9-5-9 5 9 5zm0-7l9-5-9-5-9 5 9 5z",
},
```

**Step 4: Add getDefaultContent for all three new types**

In `getDefaultContent()` (~line 470, after the `accordion` case), add:

```tsx
case "text_block":
  return {
    heading_he: "כותרת",
    heading_en: "Heading",
    body_he: "",
    body_en: "",
    background: "white",
    text_color: "auto",
    alignment: "center",
    width: "normal",
    heading_size: "h2",
    padding: "normal",
    cta_enabled: false,
    cta_text_he: "השאירו פרטים",
    cta_text_en: "Get Info",
    cta_style: "button",
  };
case "partners":
  return {
    heading_he: "",
    heading_en: "",
    items: [],
    logo_height: 64,
    background: "white",
    show_separator_line: false,
    alignment: "center",
  };
case "programs_list":
  return {
    heading_he: "התוכניות שלנו",
    heading_en: "Our Programs",
    items: [],
    expand_mode: "single",
    cta_enabled: false,
    cta_text_he: "השאירו פרטים",
    cta_text_en: "Get Info",
  };
```

**Step 5: Add SectionEditModal case for text_block**

In the SectionEditModal switch (~line 2560, after `accordion` case), add `case "text_block":` with:

- `Field` for heading_he/en
- `RichTextField` for body_he/en — **this is the first use of the new editor**
- Select dropdowns for: background (4 options), alignment (3), width (3), heading_size (2), padding (3)
- Color input for `background_custom` (visible only when background=custom)
- CTA toggle with text fields (same pattern as existing sections)
- `cta_style` toggle: button vs link

Import `RichTextField` at top of file via dynamic:
```tsx
const RichTextField = dynamic(
  () => import("@/components/builder/rich-text/rich-text-field").then((m) => ({ default: m.RichTextField })),
  { ssr: false }
);
```

**Step 6: Verify TS compiles + build**

Run: `npx tsc --noEmit && npx next build 2>&1 | tail -10`
Expected: 0 errors, clean build

**Step 7: Commit**

```bash
git add src/components/landing/sections/text-block-section.tsx src/components/landing/landing-page-layout.tsx src/app/dashboard/pages/\[id\]/builder/page.tsx
git commit -m "Add: text_block section — heading + rich text + style toggles + CTA"
```

---

### Task 5: Build partners Section (Renderer + Editor + Drag-to-Reorder)

**Files:**
- Create: `src/components/landing/sections/partners-section.tsx`
- Modify: `src/components/landing/landing-page-layout.tsx` (add import + case)
- Modify: `src/app/dashboard/pages/[id]/builder/page.tsx` (add SectionEditModal case)

**Step 1: Create the landing-page renderer**

File: `src/components/landing/sections/partners-section.tsx`

Renders:
- Optional heading + subheading
- Flex row of logo images: `flex flex-wrap items-center justify-center gap-8 md:gap-12`
- Each logo: `<div style={{ height: logo_height + "px" }} className="flex items-center justify-center"><img className="h-full w-auto max-w-none object-contain" /></div>`
- Optional caption below each logo (when `caption_*` is set)
- Optional link wrapping each logo (when `link_url` is set)
- Background: white / gray (#F5F5F5) / transparent
- Optional separator line at top: `border-t border-[#E5E5E5]`
- Lazy load images: `loading="lazy"`

**Step 2: Register in landing-page-layout.tsx**

```tsx
const PartnersSection = dynamic(() => import("./sections/partners-section").then(mod => ({ default: mod.PartnersSection })));
```

```tsx
case "partners":
  return <PartnersSection content={content} language={language} />;
```

**Step 3: Add SectionEditModal case for partners**

This is the most involved editor because of drag-to-reorder + image uploads. Key pieces:

- `Field` for heading_he/en, subheading_he/en
- Range slider for `logo_height` (40-120, step 4)
- Select for `background` and `alignment`
- Checkbox for `show_separator_line`
- **Partner items editor**: a sortable grid using `@dnd-kit/sortable` (already installed in project):
  - Each item card shows: thumbnail preview + name + × delete button
  - Drag handle on each card for reorder
  - Upload button per card (uses existing `uploadFile()` from `src/lib/supabase/storage.ts`)
  - Expandable fields per card: name, link_url, caption_he/en
  - "הוסף שותף" button at bottom creates a new empty item

Important: generate client-side `id` for each item using `crypto.randomUUID()` — needed by @dnd-kit.

Import `DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors` from `@dnd-kit/core` and `SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy, arrayMove` from `@dnd-kit/sortable`.

**Step 4: Verify TS compiles + build**

Run: `npx tsc --noEmit && npx next build 2>&1 | tail -10`

**Step 5: Commit**

```bash
git add src/components/landing/sections/partners-section.tsx src/components/landing/landing-page-layout.tsx src/app/dashboard/pages/\[id\]/builder/page.tsx
git commit -m "Add: partners section — logo strip with drag-reorder + uploads"
```

---

### Task 6: Build programs_list Section (Renderer + Server Loader + Editor)

**Files:**
- Create: `src/components/landing/sections/programs-list-section.tsx`
- Modify: `src/app/lp/[slug]/page.tsx` (~line 190, after eventsMap block — add programsMap batch-fetch)
- Modify: `src/components/landing/landing-page-layout.tsx` (add import + case + propagate programsMap)
- Modify: `src/app/dashboard/pages/[id]/builder/page.tsx` (add SectionEditModal case)

**Step 1: Add programsMap to server-side loader**

In `src/app/lp/[slug]/page.tsx`, after the `eventsMap` block (~line 200), add a mirrored block:

```tsx
// ── Fetch linked programs referenced by programs_list sections ───────
const programIds = new Set<string>();
for (const section of sections) {
  if (section.section_type === "programs_list") {
    const items = (section.content as Record<string, unknown>)?.items;
    if (Array.isArray(items)) {
      for (const item of items as { program_id?: string }[]) {
        if (typeof item.program_id === "string" && item.program_id) {
          programIds.add(item.program_id);
        }
      }
    }
  }
}
const programsMap: Record<string, { id: string; name_he: string; name_en: string | null; name_ar: string | null; description_he: string | null; description_en: string | null; image_url: string | null; slug: string | null }> = {};
if (programIds.size > 0) {
  const { data: progRows } = await adminClient
    .from("programs")
    .select("id, name_he, name_en, name_ar, description_he, description_en, image_url, slug")
    .in("id", Array.from(programIds))
    .eq("is_active", true);
  for (const row of progRows || []) {
    programsMap[row.id] = row;
  }
}
```

Add `programsMap` to the return object (~line 241) and propagate through `landing-page-layout.tsx` props + `renderSection()`.

**Step 2: Create the landing-page renderer**

File: `src/components/landing/sections/programs-list-section.tsx`

Based on the existing `AccordionSection` pattern but enhanced with:
- Image display (if `image_url` present — either from item override or programsMap fallback)
- Rich text body via `richTextHtml()` with `dangerouslySetInnerHTML`
- Per-item "learn more" link button (only shown when `link_url` is set)
- `expand_mode: "single"` → `openIndex` state (single number | null); `"multiple"` → `Set<number>`
- Heading + CTA at bottom (same pattern as AccordionSection)
- For each item: resolve `title = item.title_he || programsMap[item.program_id]?.name_he || ""`

**Step 3: Register in landing-page-layout.tsx**

Add dynamic import, add case in renderSection passing `programsMap`.

**Step 4: Add SectionEditModal case for programs_list**

In the builder, `case "programs_list":` with:
- `Field` for heading_he/en
- Toggle for `expand_mode` (single/multiple)
- Items list with per-item sub-form:
  - **ProgramPicker dropdown**: fetches programs from Supabase on mount (same pattern as EventPickerBlock), shows dropdown with program names. When selected, sets `item.program_id`. Shows a green chip with program name when linked.
  - **Mode toggle per item**: "מהספרייה" vs "override ידני"
  - When linked: shows preview of program name + description from DB, with "override" button for each field
  - Override fields: title_he/en, `RichTextField` for body_he/en, `ImageUrlField` for image_url, `Field` for link_url + link_text_he/en
- CTA toggle + text (standard pattern)

**Step 5: Verify TS compiles + build**

Run: `npx tsc --noEmit && npx next build 2>&1 | tail -10`

**Step 6: Commit**

```bash
git add src/components/landing/sections/programs-list-section.tsx src/app/lp/\[slug\]/page.tsx src/components/landing/landing-page-layout.tsx src/app/dashboard/pages/\[id\]/builder/page.tsx
git commit -m "Add: programs_list section — hybrid programs accordion with server-side batch fetch"
```

---

### Task 7: Progressive Enhancement — Replace TextareaField with RichTextField

**Files:**
- Modify: `src/app/dashboard/pages/[id]/builder/page.tsx` (multiple locations)
- Modify: `src/components/landing/sections/accordion-section.tsx` (change `whitespace-pre-line` `<p>` → `dangerouslySetInnerHTML + richTextHtml`)
- Modify: `src/components/landing/sections/about-section.tsx` (same)
- Modify: `src/components/landing/sections/faq-section.tsx` (answer field)
- Modify: `src/components/landing/sections/cta-section.tsx` (description field)
- Modify: `src/components/landing/sections/benefits-section.tsx` (item description field)

**Step 1: Replace TextareaField calls in builder**

In `src/app/dashboard/pages/[id]/builder/page.tsx`, find every `TextareaField` used for body/description long-text (NOT for subheading, short fields, or HTML). Replace with:

```tsx
<RichTextField
  label="תיאור"
  value={(draft[lk("description")] as string) || ""}
  onChange={(html) => set(lk("description"), html)}
/>
```

Specifically replace at these locations:
- Line ~2018: about section `description_he/en` (2 fields)
- Line ~2407: cta section `description_he/en`
- Line ~2553: accordion items `body_he/en` (inside ObjectListField — needs special handling, see note below)
- Line ~2132: faq items `answer_he/en` (inside ObjectListField)
- Line ~2034: benefits items `description_he/en` (inside ObjectListField)

**Note on ObjectListField**: The existing `ObjectListField` renders `<textarea>` for `type: "textarea"` fields. For progressive enhancement, we change `type: "textarea"` to `type: "richtext"` in the field definitions and update `ObjectListField` to render `RichTextField` when `type === "richtext"`.

In `ObjectListField` (around line 1754), find the rendering logic for each field type and add:
```tsx
if (field.type === "richtext") {
  return (
    <RichTextField
      label={field.label}
      value={(item[field.key] as string) || ""}
      onChange={(html) => updateItem(index, field.key, html)}
    />
  );
}
```

**Step 2: Update landing-page renderers to use richTextHtml()**

In each section component, replace:
```tsx
<p className="... whitespace-pre-line">{body}</p>
```
With:
```tsx
<div className="prose prose-sm max-w-none ..." dangerouslySetInnerHTML={richTextHtml(body)} />
```

Add import: `import { richTextHtml } from "@/lib/rich-text/render";`

Files to update:
- `accordion-section.tsx` line ~153: body `<p>` → `<div dangerouslySetInnerHTML>`
- `about-section.tsx`: description field
- `faq-section.tsx`: answer field
- `cta-section.tsx`: description field
- `benefits-section.tsx`: item description

**Step 3: Add Tailwind prose styling for RTE output**

The rich text output needs basic prose styling. Add a small utility class in the RTE render divs:

```tsx
className="prose prose-sm max-w-none prose-headings:font-heading prose-a:text-[#B8D900] prose-a:underline"
```

If `@tailwindcss/typography` is not installed, add it. Check first:
```bash
grep "typography" package.json
```

If missing:
```bash
npm install @tailwindcss/typography
```

And add to `tailwind.config.ts` plugins array.

**Step 4: Verify TS compiles + build**

Run: `npx tsc --noEmit && npx next build 2>&1 | tail -10`

**Step 5: Commit**

```bash
git add -A
git commit -m "Update: progressive RTE enhancement — replace textarea with RichTextField across builder + renderers"
```

---

### Task 8: Final Verification + Push

**Step 1: Full TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 2: Production build**

Run: `npx next build`
Expected: Clean build, all routes compile

**Step 3: Push**

```bash
git push origin main
```

---

## File Summary

### New files (7)
| File | Purpose |
|------|---------|
| `src/lib/rich-text/render.ts` | Sanitize + render HTML/plain-text |
| `src/components/builder/rich-text/rich-text-toolbar.tsx` | Tiptap toolbar buttons |
| `src/components/builder/rich-text/rich-text-editor.tsx` | Tiptap editor wrapper |
| `src/components/builder/rich-text/rich-text-field.tsx` | Field component (label + lazy editor) |
| `src/components/landing/sections/text-block-section.tsx` | Text block renderer |
| `src/components/landing/sections/partners-section.tsx` | Partners logo strip renderer |
| `src/components/landing/sections/programs-list-section.tsx` | Programs accordion renderer |

### Modified files (7+)
| File | Changes |
|------|---------|
| `package.json` | +7 deps |
| `landing-page-layout.tsx` | 3 imports + 3 cases + programsMap prop |
| `lp/[slug]/page.tsx` | programsMap batch-fetch |
| `builder/page.tsx` | 3 SECTION_LIBRARY + 3 defaults + 3 editor cases + RTE in ObjectListField |
| `accordion-section.tsx` | `whitespace-pre-line` → `dangerouslySetInnerHTML` |
| `about-section.tsx` | description → `richTextHtml()` |
| `faq-section.tsx` | answer → `richTextHtml()` |
| `cta-section.tsx` | description → `richTextHtml()` |
| `benefits-section.tsx` | item description → `richTextHtml()` |
