-- Migration: Thank You Page Templates
--
-- Adds a system for managing multiple thank you page templates that can be
-- assigned to landing pages individually or used as the global default.
--
-- Architecture:
--   - thank_you_templates: stores template configs (10 system + N custom)
--   - Each template references a layout_id (which React renderer to use)
--   - Content is stored per-language ({he, en, ar}) so editors can localize
--   - Per-page selection lives in pages.custom_styles.thank_you_settings.template_id
--   - Global default is the row with is_default = true (only one allowed)

CREATE TABLE IF NOT EXISTS thank_you_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Stable identifier (e.g. 'classic_dark', 'celebration', 'personal_advisor')
  template_key TEXT UNIQUE NOT NULL,
  -- Maps to a React layout component (one of 10 built-in layouts)
  layout_id TEXT NOT NULL,

  -- Display info (per language)
  name_he TEXT NOT NULL,
  name_en TEXT DEFAULT '',
  name_ar TEXT DEFAULT '',
  description_he TEXT DEFAULT '',
  description_en TEXT DEFAULT '',
  description_ar TEXT DEFAULT '',
  preview_image_url TEXT DEFAULT '',

  -- Editable content per language - structure varies by layout but always
  -- has shape { he: {...fields...}, en: {...}, ar: {...} }
  content JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Visual config (colors, spacing, animation, etc.)
  config JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Lifecycle
  is_system BOOLEAN NOT NULL DEFAULT false,    -- system templates can't be deleted
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,   -- exactly one row should be default

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_ty_templates_active ON thank_you_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ty_templates_default ON thank_you_templates(is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_ty_templates_layout ON thank_you_templates(layout_id);

-- Enforce only one default template at a time
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ty_templates_one_default
  ON thank_you_templates ((is_default))
  WHERE is_default = true;

-- updated_at trigger
CREATE OR REPLACE FUNCTION ty_templates_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ty_templates_updated_at ON thank_you_templates;
CREATE TRIGGER ty_templates_updated_at
  BEFORE UPDATE ON thank_you_templates
  FOR EACH ROW EXECUTE FUNCTION ty_templates_set_updated_at();

-- RLS: anon can SELECT (the public /ty page reads templates), authenticated can CRUD
ALTER TABLE thank_you_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ty_templates_select ON thank_you_templates;
CREATE POLICY ty_templates_select ON thank_you_templates
  FOR SELECT USING (true);

DROP POLICY IF EXISTS ty_templates_insert ON thank_you_templates;
CREATE POLICY ty_templates_insert ON thank_you_templates
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS ty_templates_update ON thank_you_templates;
CREATE POLICY ty_templates_update ON thank_you_templates
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS ty_templates_delete ON thank_you_templates;
CREATE POLICY ty_templates_delete ON thank_you_templates
  FOR DELETE TO authenticated USING (NOT is_system);

COMMENT ON TABLE thank_you_templates IS 'Stores thank-you page templates. 10 system templates seeded on first run; admins can clone or create custom templates via the dashboard.';
COMMENT ON COLUMN thank_you_templates.layout_id IS 'Which React layout component to render. Must match a key in src/lib/thank-you/layouts/registry.ts';
COMMENT ON COLUMN thank_you_templates.content IS 'Per-language content map: { he: {heading, subheading, step_1, ...}, en: {...}, ar: {...} }';
