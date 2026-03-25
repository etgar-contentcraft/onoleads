-- Faculty members table: stores lecturer/faculty profiles for use in landing page sections
-- and the faculty management dashboard.

CREATE TABLE faculty_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_he TEXT NOT NULL,
  name_en TEXT,
  title_he TEXT,  -- short bio/tagline in Hebrew
  title_en TEXT,
  image_url TEXT,
  phone TEXT,
  email TEXT,
  linkedin_url TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  website_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient sorted listing
CREATE INDEX IF NOT EXISTS idx_faculty_members_sort ON faculty_members (sort_order);

-- Row Level Security: only authenticated admins may read/write
ALTER TABLE faculty_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage faculty members"
  ON faculty_members FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Automatically update updated_at on every row change
CREATE OR REPLACE FUNCTION update_faculty_members_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER faculty_members_updated_at
  BEFORE UPDATE ON faculty_members
  FOR EACH ROW
  EXECUTE FUNCTION update_faculty_members_updated_at();
