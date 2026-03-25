-- Migration: shared_sections (Global Sections)
-- Stores section templates shared across multiple landing pages.
-- A page_section can reference a shared_section; at render time,
-- the shared content overrides the local content.

CREATE TABLE IF NOT EXISTS shared_sections (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name_he     TEXT        NOT NULL,
  section_type TEXT       NOT NULL,
  content     JSONB       NOT NULL DEFAULT '{}',
  styles      JSONB                DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for listing by section type
CREATE INDEX IF NOT EXISTS idx_shared_sections_type ON shared_sections (section_type);

-- Add FK from page_sections to shared_sections
-- SET NULL on delete: if shared section is removed, page section becomes standalone
ALTER TABLE page_sections
  ADD COLUMN IF NOT EXISTS shared_section_id UUID
  REFERENCES shared_sections(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE shared_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage shared sections"
  ON shared_sections
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION update_shared_sections_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER shared_sections_updated_at
  BEFORE UPDATE ON shared_sections
  FOR EACH ROW EXECUTE FUNCTION update_shared_sections_updated_at();
