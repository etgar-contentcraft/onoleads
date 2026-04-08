-- Migration: Backfill new TyContentFields on existing templates
--
-- Adds empty default values for the new fields introduced in this batch:
--   - calendar_url        (calendar_focus, multi_channel)
--   - video_url           (video_welcome, resource_library)
--   - phone_number        (multi_channel)
--   - email_address       (multi_channel)
--
-- Existing rows already work because all fields are optional, but filling
-- them with empty strings lets the template editor UI show them as editable
-- blank inputs (rather than "undefined" — which React treats as uncontrolled
-- input and warns about on the console).
--
-- Uses jsonb_set + COALESCE so running the migration multiple times is safe:
-- existing non-empty values are preserved.

-- calendar_focus — seed empty calendar_url on all 3 languages
UPDATE thank_you_templates
SET content = jsonb_set(
  jsonb_set(
    jsonb_set(
      content,
      '{he,calendar_url}',
      COALESCE(content->'he'->'calendar_url', '""'::jsonb),
      true
    ),
    '{en,calendar_url}',
    COALESCE(content->'en'->'calendar_url', '""'::jsonb),
    true
  ),
  '{ar,calendar_url}',
  COALESCE(content->'ar'->'calendar_url', '""'::jsonb),
  true
)
WHERE template_key = 'calendar_focus';

-- video_welcome — seed empty video_url on all 3 languages
UPDATE thank_you_templates
SET content = jsonb_set(
  jsonb_set(
    jsonb_set(
      content,
      '{he,video_url}',
      COALESCE(content->'he'->'video_url', '""'::jsonb),
      true
    ),
    '{en,video_url}',
    COALESCE(content->'en'->'video_url', '""'::jsonb),
    true
  ),
  '{ar,video_url}',
  COALESCE(content->'ar'->'video_url', '""'::jsonb),
  true
)
WHERE template_key = 'video_welcome';

-- multi_channel — seed phone_number (empty) and email_address (Ono default)
UPDATE thank_you_templates
SET content = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            content,
            '{he,phone_number}',
            COALESCE(content->'he'->'phone_number', '""'::jsonb),
            true
          ),
          '{en,phone_number}',
          COALESCE(content->'en'->'phone_number', '""'::jsonb),
          true
        ),
        '{ar,phone_number}',
        COALESCE(content->'ar'->'phone_number', '""'::jsonb),
        true
      ),
      '{he,email_address}',
      COALESCE(content->'he'->'email_address', '"info@ono.ac.il"'::jsonb),
      true
    ),
    '{en,email_address}',
    COALESCE(content->'en'->'email_address', '"info@ono.ac.il"'::jsonb),
    true
  ),
  '{ar,email_address}',
  COALESCE(content->'ar'->'email_address', '"info@ono.ac.il"'::jsonb),
  true
)
WHERE template_key = 'multi_channel';
