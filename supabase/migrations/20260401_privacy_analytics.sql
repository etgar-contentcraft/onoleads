-- Privacy-First Analytics Migration
-- Replaces PII-storing leads table with anonymous analytics_events table.
-- No personal data is stored — only anonymous event counts, UTM params, and cookie IDs.

-- Create event type enum
CREATE TYPE analytics_event_type AS ENUM (
  'page_view',
  'form_submit',
  'cta_click',
  'popup_view',
  'popup_dismiss'
);

-- Create anonymous analytics events table
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type analytics_event_type NOT NULL,
  page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
  cookie_id TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  referrer_domain TEXT,
  device_type TEXT,
  webhook_status TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes for analytics queries
CREATE INDEX idx_analytics_events_page ON analytics_events(page_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_cookie ON analytics_events(cookie_id);
CREATE INDEX idx_analytics_events_utm_source ON analytics_events(utm_source) WHERE utm_source IS NOT NULL;
CREATE INDEX idx_analytics_events_webhook ON analytics_events(webhook_status) WHERE webhook_status IS NOT NULL;

-- Composite index for common dashboard queries (page + type + date range)
CREATE INDEX idx_analytics_events_page_type_date ON analytics_events(page_id, event_type, created_at DESC);

-- RLS policies
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Anonymous users can insert events (page views, form submissions from public pages)
CREATE POLICY "anon_insert_analytics" ON analytics_events
  FOR INSERT TO anon WITH CHECK (true);

-- Authenticated admins can read all analytics
CREATE POLICY "admin_read_analytics" ON analytics_events
  FOR SELECT TO authenticated USING (true);

-- Authenticated admins can update webhook status
CREATE POLICY "admin_update_analytics" ON analytics_events
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Drop the leads table and its enum (contains PII — no longer needed)
DROP TABLE IF EXISTS leads CASCADE;
DROP TYPE IF EXISTS webhook_status;
