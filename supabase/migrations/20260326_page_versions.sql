-- Migration: page_versions
-- Stores snapshots of page sections before each save in the builder.
-- Enables rollback to any of the last 20 versions per page.

CREATE TABLE IF NOT EXISTS page_versions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id     UUID        NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  version_num INTEGER     NOT NULL,
  -- Snapshot of page_sections rows at save time
  sections_snapshot JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Efficient lookup: latest versions first for a given page
CREATE INDEX IF NOT EXISTS idx_page_versions_page_id_num
  ON page_versions (page_id, version_num DESC);

-- RLS: admins can read/write; anonymous cannot
ALTER TABLE page_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage page versions"
  ON page_versions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
