-- Migration: logos table
-- Stores a managed library of brand logos. The "default" logo is used everywhere
-- unless a per-page override picks a different logo. Page settings still store the
-- logo URL (string) so deletes/renames don't break existing pages.
-- Created: 2026-04-07

CREATE TABLE IF NOT EXISTS logos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  storage_path TEXT,                       -- nullable: external URLs have no storage path
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one row can be marked as the default logo at a time.
CREATE UNIQUE INDEX IF NOT EXISTS logos_one_default
  ON logos (is_default)
  WHERE is_default = true;

-- Auto-update updated_at on edits
CREATE OR REPLACE FUNCTION logos_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS logos_updated_at ON logos;
CREATE TRIGGER logos_updated_at
  BEFORE UPDATE ON logos
  FOR EACH ROW
  EXECUTE FUNCTION logos_set_updated_at();

-- Row-level security: any authenticated user (admin dashboard) can read/write,
-- anon (landing pages) needs read only so the rendered logo can be referenced.
ALTER TABLE logos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon can read logos" ON logos;
CREATE POLICY "Anon can read logos"
  ON logos FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Authenticated full access to logos" ON logos;
CREATE POLICY "Authenticated full access to logos"
  ON logos FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Seed: register the existing hardcoded ONO logo as the default if no rows exist.
INSERT INTO logos (name, url, is_default)
SELECT
  'לוגו אונו (ברירת מחדל)',
  'https://www.ono.ac.il/wp-content/uploads/2025/12/לוגו-אונו.png',
  true
WHERE NOT EXISTS (SELECT 1 FROM logos);

COMMENT ON TABLE logos IS
  'Managed library of brand logos. Default logo is used site-wide unless a per-page override picks another.';
