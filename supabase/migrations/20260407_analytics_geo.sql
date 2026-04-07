-- =====================================================================
-- Migration: Add geo columns to analytics_events
-- Purpose:   Capture visitor country / region / city from Vercel edge
--            headers so we can show geo breakdowns in the analytics UI.
-- Author:    OnoLeads
-- Date:      2026-04-07
-- =====================================================================

-- ----------------------------------------------------------------------
-- 1. Add the three geo columns
-- ----------------------------------------------------------------------
-- All three are nullable — older rows have no geo data, and Vercel may
-- not always provide them (e.g. local development, missing IP info).

ALTER TABLE analytics_events
  ADD COLUMN IF NOT EXISTS country TEXT,    -- ISO 3166-1 alpha-2 (e.g. "IL", "US")
  ADD COLUMN IF NOT EXISTS region  TEXT,    -- State / district / province
  ADD COLUMN IF NOT EXISTS city    TEXT;    -- City name

-- ----------------------------------------------------------------------
-- 2. Indexes for fast filtering & aggregation
-- ----------------------------------------------------------------------
-- Partial indexes (skip NULLs) keep them small while still letting the
-- analytics dashboard filter by country quickly.

CREATE INDEX IF NOT EXISTS idx_analytics_events_country
  ON analytics_events (country)
  WHERE country IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_region
  ON analytics_events (region)
  WHERE region IS NOT NULL;

-- Composite index for "country + page + date" queries (page-level geo
-- breakdowns over a date range — the most common query shape).
CREATE INDEX IF NOT EXISTS idx_analytics_events_country_page_date
  ON analytics_events (country, page_id, created_at DESC)
  WHERE country IS NOT NULL;

-- ----------------------------------------------------------------------
-- 3. Documentation comments
-- ----------------------------------------------------------------------
COMMENT ON COLUMN analytics_events.country IS
  'ISO 3166-1 alpha-2 country code from Vercel x-vercel-ip-country header. NULL for older rows or local dev.';

COMMENT ON COLUMN analytics_events.region IS
  'State / region / district from Vercel x-vercel-ip-region header.';

COMMENT ON COLUMN analytics_events.city IS
  'City name from Vercel x-vercel-ip-city header.';
