-- Fix RLS policies for page_sections table.
-- The original policy used USING without WITH CHECK, which can block INSERTs
-- in some Supabase/PostgreSQL configurations.
-- Safe to re-run: drops existing policies before recreating them.

-- Make sure RLS is enabled
ALTER TABLE page_sections ENABLE ROW LEVEL SECURITY;

-- Drop and recreate the admin policy with explicit WITH CHECK
DROP POLICY IF EXISTS "Admin all sections" ON page_sections;

CREATE POLICY "Admin all sections"
  ON page_sections
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Keep public SELECT for visible sections on published landing pages
DROP POLICY IF EXISTS "Public read visible sections" ON page_sections;

CREATE POLICY "Public read visible sections"
  ON page_sections
  FOR SELECT
  TO anon
  USING (is_visible = true);
