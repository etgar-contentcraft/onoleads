/**
 * CAPI and pixel tracking configuration schema.
 *
 * Design decisions:
 * - pixel_configurations: one row per platform, access tokens AES-256-GCM encrypted
 * - page_pixel_overrides: per-page overrides (disable/swap pixel_id); never stores tokens
 * - capi_event_log: audit trail for every CAPI attempt (90-day retention, no PII)
 * - capi_failed_events: dead-letter queue for failed retries (encrypted payload)
 *
 * Security:
 * - pixel_configurations has NO anon RLS policy — anon key cannot read encrypted tokens
 * - page_pixel_overrides allows anon SELECT (needed for server-side LP rendering)
 * - capi_event_log INSERT is service_role only; SELECT is authenticated only
 */

-- ============================================================
-- TABLE: pixel_configurations
-- Global pixel/CAPI config per platform.
-- One row per platform. Tokens encrypted at application layer before INSERT.
-- ============================================================
CREATE TABLE IF NOT EXISTS pixel_configurations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform          TEXT NOT NULL UNIQUE,       -- 'ga4' | 'meta' | 'google' | 'tiktok' | 'linkedin' | 'outbrain' | 'taboola' | 'twitter'
  is_enabled        BOOLEAN NOT NULL DEFAULT false,
  pixel_id          TEXT,                        -- Platform pixel/dataset ID (not secret)
  access_token_enc  TEXT,                        -- AES-256-GCM encrypted access token (CAPI platforms only)
  test_event_code   TEXT,                        -- Test mode (Meta only); null = production
  additional_config JSONB NOT NULL DEFAULT '{}', -- Platform-specific extras (e.g. Google conversion label)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  CONSTRAINT pixel_configurations_platform_check
    CHECK (platform IN ('ga4', 'meta', 'google', 'tiktok', 'linkedin', 'outbrain', 'taboola', 'twitter'))
);

-- Seed default rows so the UI always has a row to update (one per platform)
INSERT INTO pixel_configurations (platform) VALUES
  ('ga4'),
  ('meta'),
  ('google'),
  ('tiktok'),
  ('linkedin'),
  ('outbrain'),
  ('taboola'),
  ('twitter')
ON CONFLICT (platform) DO NOTHING;

-- ============================================================
-- TABLE: page_pixel_overrides
-- Per-page pixel overrides. Never stores access tokens.
-- ============================================================
CREATE TABLE IF NOT EXISTS page_pixel_overrides (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id             UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  platform            TEXT NOT NULL,
  is_enabled          BOOLEAN NOT NULL DEFAULT true,  -- false = suppress global pixel for this page
  pixel_id_override   TEXT,                            -- null = use global pixel_id
  event_name_override TEXT,                            -- null = use platform default ('Lead')
  custom_data         JSONB NOT NULL DEFAULT '{}',     -- Extra params (value, currency, content_name)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (page_id, platform),

  CONSTRAINT page_pixel_overrides_platform_check
    CHECK (platform IN ('ga4', 'meta', 'google', 'tiktok', 'linkedin', 'outbrain', 'taboola', 'twitter'))
);

-- ============================================================
-- TABLE: capi_event_log
-- Audit trail for every CAPI attempt. No PII, no tokens.
-- ============================================================
CREATE TABLE IF NOT EXISTS capi_event_log (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform            TEXT NOT NULL,
  event_name          TEXT NOT NULL DEFAULT 'Lead',
  page_id             UUID REFERENCES pages(id) ON DELETE SET NULL,
  analytics_event_id  UUID,                        -- FK to analytics_events row that triggered this
  success             BOOLEAN NOT NULL,
  http_status         INTEGER,
  platform_error_code TEXT,                        -- Platform's own error code string
  attempts            INTEGER NOT NULL DEFAULT 1,
  duration_ms         INTEGER,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT capi_event_log_platform_check
    CHECK (platform IN ('ga4', 'meta', 'google', 'tiktok', 'linkedin', 'outbrain', 'taboola', 'twitter'))
);

CREATE INDEX IF NOT EXISTS idx_capi_event_log_platform_created
  ON capi_event_log(platform, created_at DESC);

-- Partial index — only failed events need fast lookup for retry dashboard
CREATE INDEX IF NOT EXISTS idx_capi_event_log_failed
  ON capi_event_log(created_at DESC)
  WHERE success = false;

-- ============================================================
-- TABLE: capi_failed_events (dead-letter queue)
-- Encrypted payloads for failed CAPI events — enables manual/automatic retry.
-- Payload encrypted because it contains hashed PII fields.
-- ============================================================
CREATE TABLE IF NOT EXISTS capi_failed_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform        TEXT NOT NULL,
  payload_enc     TEXT NOT NULL,               -- AES-GCM encrypted JSON payload
  error_code      INTEGER,
  attempts        INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  retry_after     TIMESTAMPTZ,                 -- Backoff — don't retry before this timestamp
  resolved        BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT capi_failed_events_platform_check
    CHECK (platform IN ('ga4', 'meta', 'google', 'tiktok', 'linkedin', 'outbrain', 'taboola', 'twitter'))
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE pixel_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_pixel_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE capi_event_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE capi_failed_events ENABLE ROW LEVEL SECURITY;

-- pixel_configurations: authenticated full access; anon has NO access (tokens encrypted but still sensitive)
CREATE POLICY "Admin manage pixel_configurations" ON pixel_configurations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- page_pixel_overrides: admin manages, anon reads (needed for LP server rendering)
CREATE POLICY "Admin manage page_pixel_overrides" ON page_pixel_overrides
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anon read page_pixel_overrides" ON page_pixel_overrides
  FOR SELECT TO anon USING (true);

-- capi_event_log: service role inserts (from API route), authenticated reads (dashboard)
CREATE POLICY "Admin read capi_event_log" ON capi_event_log
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role insert capi_event_log" ON capi_event_log
  FOR INSERT TO service_role WITH CHECK (true);

-- capi_failed_events: service role manages, authenticated reads
CREATE POLICY "Admin read capi_failed_events" ON capi_failed_events
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role manage capi_failed_events" ON capi_failed_events
  FOR ALL TO service_role USING (true);

-- ============================================================
-- AUTO updated_at TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'pixel_configurations_updated_at') THEN
    CREATE TRIGGER pixel_configurations_updated_at
      BEFORE UPDATE ON pixel_configurations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'page_pixel_overrides_updated_at') THEN
    CREATE TRIGGER page_pixel_overrides_updated_at
      BEFORE UPDATE ON page_pixel_overrides
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
