-- Add category column to shared_sections for organizing by degree/program type.
-- Example values: "משפטים", "ניהול עסקי", "פסיכולוגיה", "הנדסה", "כללי"
-- Empty string = uncategorized (default for existing rows).

ALTER TABLE shared_sections
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT '';

-- Index for filtering by category in the builder picker
CREATE INDEX IF NOT EXISTS idx_shared_sections_category ON shared_sections (category);
