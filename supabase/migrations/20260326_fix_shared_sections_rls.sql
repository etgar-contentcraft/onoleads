-- Fix RLS policies for shared_sections table.
-- Ensures authenticated users (admins) can fully manage shared sections.
-- Safe to re-run: drops existing policy before recreating it.

-- Make sure RLS is enabled
ALTER TABLE shared_sections ENABLE ROW LEVEL SECURITY;

-- Drop and recreate the admin policy to guarantee correct permissions
DROP POLICY IF EXISTS "Admins can manage shared sections" ON shared_sections;

CREATE POLICY "Admins can manage shared sections"
  ON shared_sections
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Anonymous (public landing pages) can only SELECT shared sections
DROP POLICY IF EXISTS "Public can read shared sections" ON shared_sections;

CREATE POLICY "Public can read shared sections"
  ON shared_sections
  FOR SELECT
  TO anon
  USING (true);
