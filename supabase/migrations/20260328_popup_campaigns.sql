-- Migration: Popup Campaigns System
-- Manages popup overlays and sticky CTA bars with per-page assignment,
-- trigger configuration, frequency gating, and basic analytics.

-- ============================================================================
-- Table: popup_campaigns
-- ============================================================================

CREATE TABLE IF NOT EXISTS popup_campaigns (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name            TEXT        NOT NULL,
  campaign_type   TEXT        NOT NULL CHECK (campaign_type IN (
    'exit_intent', 'timed', 'scroll_triggered', 'sticky_bar'
  )),
  template_id     TEXT,

  -- Content (JSONB — shape depends on campaign_type)
  content         JSONB       NOT NULL DEFAULT '{}',
  -- Popup types: { title_he, body_he, cta_text_he, dismiss_text_he, image_url, bg_color, accent_color, include_form }
  -- Sticky bar:  { text_he, cta_text_he, phone_number, bg_color, accent_color, show_phone, position }

  -- Trigger configuration (JSONB — shape depends on campaign_type)
  trigger_config  JSONB       NOT NULL DEFAULT '{}',
  -- exit_intent:      { sensitivity: "subtle"|"medium"|"aggressive" }
  -- timed:            { delay_seconds: number }
  -- scroll_triggered: { scroll_percent: number }
  -- sticky_bar:       { show_after_scroll_px: number }

  -- Display rules
  frequency       TEXT        NOT NULL DEFAULT 'once_per_session' CHECK (frequency IN (
    'once_per_session', 'once_per_day', 'once_ever', 'every_visit'
  )),
  show_on_mobile  BOOLEAN     NOT NULL DEFAULT true,
  show_on_desktop BOOLEAN     NOT NULL DEFAULT true,

  -- Scheduling
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  start_date      TIMESTAMPTZ,
  end_date        TIMESTAMPTZ,

  -- Analytics counters (incremented via API)
  views_count         INTEGER NOT NULL DEFAULT 0,
  conversions_count   INTEGER NOT NULL DEFAULT 0,

  -- Audit
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for listing by type
CREATE INDEX IF NOT EXISTS idx_popup_campaigns_type ON popup_campaigns (campaign_type);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_popup_campaigns_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER popup_campaigns_updated_at
  BEFORE UPDATE ON popup_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_popup_campaigns_updated_at();

-- RLS
ALTER TABLE popup_campaigns ENABLE ROW LEVEL SECURITY;

-- Authenticated users can fully manage campaigns
DROP POLICY IF EXISTS "Authenticated manage campaigns" ON popup_campaigns;
CREATE POLICY "Authenticated manage campaigns"
  ON popup_campaigns FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- Anonymous users can read active campaigns (needed for landing page rendering)
DROP POLICY IF EXISTS "Anon read active campaigns" ON popup_campaigns;
CREATE POLICY "Anon read active campaigns"
  ON popup_campaigns FOR SELECT
  TO anon USING (is_active = true);

-- ============================================================================
-- Table: page_popup_assignments (many-to-many)
-- ============================================================================

CREATE TABLE IF NOT EXISTS page_popup_assignments (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id      UUID    NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  campaign_id  UUID    NOT NULL REFERENCES popup_campaigns(id) ON DELETE CASCADE,
  priority     INTEGER NOT NULL DEFAULT 0,
  is_enabled   BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(page_id, campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_page_popup_page ON page_popup_assignments (page_id);
CREATE INDEX IF NOT EXISTS idx_page_popup_campaign ON page_popup_assignments (campaign_id);

-- RLS
ALTER TABLE page_popup_assignments ENABLE ROW LEVEL SECURITY;

-- Authenticated users can fully manage assignments
DROP POLICY IF EXISTS "Authenticated manage assignments" ON page_popup_assignments;
CREATE POLICY "Authenticated manage assignments"
  ON page_popup_assignments FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- Anonymous users can read enabled assignments (needed for landing page rendering)
DROP POLICY IF EXISTS "Anon read enabled assignments" ON page_popup_assignments;
CREATE POLICY "Anon read enabled assignments"
  ON page_popup_assignments FOR SELECT
  TO anon USING (is_enabled = true);

-- ============================================================================
-- RPC functions for atomic counter increments (called from /api/popup-events)
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_campaign_views(cid UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE popup_campaigns SET views_count = views_count + 1 WHERE id = cid;
$$;

CREATE OR REPLACE FUNCTION increment_campaign_conversions(cid UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE popup_campaigns SET conversions_count = conversions_count + 1 WHERE id = cid;
$$;
