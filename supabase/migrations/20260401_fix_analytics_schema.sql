-- Fix analytics_events schema mismatch.
-- The initial schema created analytics_events with event_data JSONB,
-- but the privacy migration (which adds individual UTM columns) failed
-- because the table already existed. This migration adds the missing columns.

-- Add individual UTM columns (IF NOT EXISTS to be safe)
DO $$
BEGIN
  -- Add utm_source if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analytics_events' AND column_name = 'utm_source') THEN
    ALTER TABLE analytics_events ADD COLUMN utm_source TEXT;
  END IF;

  -- Add utm_medium if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analytics_events' AND column_name = 'utm_medium') THEN
    ALTER TABLE analytics_events ADD COLUMN utm_medium TEXT;
  END IF;

  -- Add utm_campaign if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analytics_events' AND column_name = 'utm_campaign') THEN
    ALTER TABLE analytics_events ADD COLUMN utm_campaign TEXT;
  END IF;

  -- Add utm_content if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analytics_events' AND column_name = 'utm_content') THEN
    ALTER TABLE analytics_events ADD COLUMN utm_content TEXT;
  END IF;

  -- Add utm_term if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analytics_events' AND column_name = 'utm_term') THEN
    ALTER TABLE analytics_events ADD COLUMN utm_term TEXT;
  END IF;

  -- Add referrer_domain if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analytics_events' AND column_name = 'referrer_domain') THEN
    ALTER TABLE analytics_events ADD COLUMN referrer_domain TEXT;
  END IF;

  -- Add device_type if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analytics_events' AND column_name = 'device_type') THEN
    ALTER TABLE analytics_events ADD COLUMN device_type TEXT;
  END IF;

  -- Add webhook_status if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analytics_events' AND column_name = 'webhook_status') THEN
    ALTER TABLE analytics_events ADD COLUMN webhook_status TEXT DEFAULT NULL;
  END IF;
END $$;

-- Add performance indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_analytics_events_utm_source ON analytics_events(utm_source) WHERE utm_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_events_webhook ON analytics_events(webhook_status) WHERE webhook_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_events_page_type_date ON analytics_events(page_id, event_type, created_at DESC);

-- Ensure RLS policies exist for anon insert
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_events' AND policyname = 'anon_insert_analytics') THEN
    CREATE POLICY "anon_insert_analytics" ON analytics_events FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;
