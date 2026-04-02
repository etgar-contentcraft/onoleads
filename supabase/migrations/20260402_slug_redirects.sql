-- Migration: slug_redirects table for handling old slug redirects to pages

-- Create the slug_redirects table
CREATE TABLE slug_redirects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  old_slug TEXT UNIQUE NOT NULL,
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_slug_redirects_old_slug ON slug_redirects(old_slug);

-- Enable Row Level Security
ALTER TABLE slug_redirects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read slug redirects" ON slug_redirects FOR SELECT USING (true);
CREATE POLICY "Admin all slug redirects" ON slug_redirects FOR ALL USING (auth.role() = 'authenticated');
