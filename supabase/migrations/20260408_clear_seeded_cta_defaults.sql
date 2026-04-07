-- Migration: Clear seeded English/Arabic CTA default text from page_sections
--
-- Problem:
--   The generate-landing-pages.ts script seeded English landing pages with CTA
--   sections that had heading_en = "Ready to Start?", description_en = "...",
--   button_text_en = "Get Info" baked directly into the section content JSONB.
--   When users edited the CTA via the builder (which used to save to _he fields),
--   their changes landed in heading_he — but heading_en from the seed always took
--   priority in the renderer, making user edits invisible on English pages.
--
-- Fix:
--   Clear the pre-seeded English defaults from CTA sections on English pages so
--   the renderer falls through to heading_he (user edits) and then to the
--   hardcoded default. After this migration, users who re-save their CTA via the
--   updated builder (which now writes to heading_en directly) will be unaffected.
--
-- Safe: the hardcoded renderer defaults ("Ready to Start?" / "Leave your details...")
--   are identical to what is being removed, so pages with no custom content look
--   exactly the same as before. Only pages with user content in heading_he will
--   now correctly surface that content.

UPDATE page_sections
SET content = content
  -- remove the seeded heading_en default
  - 'heading_en'::text
  -- remove the seeded description_en default
  - 'description_en'::text
  -- remove the seeded button_text_en default
  - 'button_text_en'::text
WHERE section_type IN ('cta', 'footer_cta')
  -- only touch English-language pages
  AND page_id IN (
    SELECT id FROM pages WHERE language = 'en'
  )
  -- only clear fields that still hold the exact seeded default values
  -- (don't touch sections where the user has already entered custom English text)
  AND (
    content->>'heading_en' = 'Ready to Start?'
    OR content->>'heading_en' IS NULL
  )
  AND (
    content->>'description_en' = 'Leave your details and a counselor will contact you'
    OR content->>'description_en' IS NULL
  )
  AND (
    content->>'button_text_en' = 'Get Info'
    OR content->>'button_text_en' IS NULL
  );

-- Also clear Arabic defaults for Arabic pages
UPDATE page_sections
SET content = content
  - 'heading_ar'::text
  - 'description_ar'::text
  - 'button_text_ar'::text
WHERE section_type IN ('cta', 'footer_cta')
  AND page_id IN (
    SELECT id FROM pages WHERE language = 'ar'
  )
  AND (
    content->>'heading_ar' IN ('مستعد للبدء؟', '')
    OR content->>'heading_ar' IS NULL
  );
