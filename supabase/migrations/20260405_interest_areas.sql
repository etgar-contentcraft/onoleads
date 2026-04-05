-- ============================================================================
-- Interest Areas (תחומי עניין)
-- Many-to-many: each page can have one or more interest areas.
-- When a page has exactly one area, it is passed silently in the webhook.
-- When a page has multiple, a dropdown is shown in the lead form.
-- ============================================================================

-- Main table
CREATE TABLE IF NOT EXISTS interest_areas (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name_he     TEXT        NOT NULL,
  name_en     TEXT,
  name_ar     TEXT,
  slug        TEXT        UNIQUE NOT NULL,
  sort_order  INTEGER     DEFAULT 0,
  is_active   BOOLEAN     DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Junction table: pages ↔ interest_areas
CREATE TABLE IF NOT EXISTS page_interest_areas (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id           UUID        NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  interest_area_id  UUID        NOT NULL REFERENCES interest_areas(id) ON DELETE CASCADE,
  sort_order        INTEGER     DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (page_id, interest_area_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_page_interest_areas_page_id     ON page_interest_areas(page_id);
CREATE INDEX IF NOT EXISTS idx_page_interest_areas_area_id     ON page_interest_areas(interest_area_id);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_interest_areas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_interest_areas_updated_at ON interest_areas;
CREATE TRIGGER trg_interest_areas_updated_at
  BEFORE UPDATE ON interest_areas
  FOR EACH ROW EXECUTE FUNCTION update_interest_areas_updated_at();

-- ============================================================================
-- RLS policies
-- ============================================================================

ALTER TABLE interest_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_interest_areas ENABLE ROW LEVEL SECURITY;

-- interest_areas: authenticated full CRUD
CREATE POLICY "interest_areas_auth_all"
  ON interest_areas FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- interest_areas: anon read-only (landing pages need area names)
CREATE POLICY "interest_areas_anon_read"
  ON interest_areas FOR SELECT TO anon
  USING (is_active = true);

-- page_interest_areas: authenticated full CRUD
CREATE POLICY "page_interest_areas_auth_all"
  ON page_interest_areas FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- page_interest_areas: anon read-only (landing page needs to know its areas)
CREATE POLICY "page_interest_areas_anon_read"
  ON page_interest_areas FOR SELECT TO anon
  USING (true);

-- ============================================================================
-- Seed interest areas
-- ============================================================================

INSERT INTO interest_areas (name_he, name_en, slug, sort_order) VALUES
  ('משפטים',                      'Law',                          'law',                   1),
  ('סיעוד',                       'Nursing',                      'nursing',               2),
  ('MBA',                          'MBA',                          'mba',                   3),
  ('MBA עם התמחות בסייבר',        'MBA with Cyber Specialization','mba-cyber',             4)
ON CONFLICT (slug) DO NOTHING;
