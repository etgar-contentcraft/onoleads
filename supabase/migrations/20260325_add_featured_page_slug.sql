-- Migration: Add featured_page_slug to programs table
-- Allows each program to designate one landing page as the "featured" page
-- that is linked from the homepage smart finder.
--
-- Usage:
--   The admin can set featured_page_slug per program in Dashboard > Programs.
--   The homepage reads this field to route clicks to the correct landing page.

ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS featured_page_slug TEXT;

-- Optional: index for fast lookup when building homepage links
CREATE INDEX IF NOT EXISTS idx_programs_featured_page_slug
  ON programs (featured_page_slug)
  WHERE featured_page_slug IS NOT NULL;

COMMENT ON COLUMN programs.featured_page_slug IS
  'Slug of the landing page that should be linked from the homepage smart finder for this program. NULL means use the program default slug.';
