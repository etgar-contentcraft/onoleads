-- Session analytics extension.
-- Adds scroll_depth and time_on_page tracking to analytics_events.
-- Enables Hotjar-like per-page insights: scroll depth charts and engagement scoring.

-- Add scroll depth column (0-100 integer, NULL for non-scroll events)
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS scroll_depth INTEGER CHECK (scroll_depth >= 0 AND scroll_depth <= 100);

-- Add time on page column (seconds, NULL unless explicitly tracked before unload)
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS time_on_page INTEGER CHECK (time_on_page >= 0);

-- Add section ID for section-level click tracking (e.g. 'hero', 'faq', 'cta_bar')
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS section_id TEXT;

-- Index for scroll depth queries (used in per-page funnel charts)
CREATE INDEX IF NOT EXISTS idx_analytics_scroll_depth
  ON analytics_events(page_id, scroll_depth)
  WHERE scroll_depth IS NOT NULL;

-- Allow scroll_depth event type (it's already in the security fix but adding here for clarity)
-- The existing RLS policy "anon_insert_analytics (restricted)" allows scroll_depth via the
-- 20260402_security_fixes.sql migration. No new RLS change needed.
