-- Add Microsoft Clarity as a supported pixel platform.
-- Clarity is analytics-only (session recording + heatmaps) — no CAPI, no token needed.

-- 1. Expand CHECK constraints to include 'clarity' on all platform columns.
--    The original constraint (from 20260406_capi_pixels_schema.sql) only allows 8 platforms.

ALTER TABLE pixel_configurations
  DROP CONSTRAINT pixel_configurations_platform_check,
  ADD CONSTRAINT pixel_configurations_platform_check
    CHECK (platform IN ('ga4', 'meta', 'google', 'tiktok', 'linkedin', 'outbrain', 'taboola', 'twitter', 'clarity'));

ALTER TABLE page_pixel_overrides
  DROP CONSTRAINT page_pixel_overrides_platform_check,
  ADD CONSTRAINT page_pixel_overrides_platform_check
    CHECK (platform IN ('ga4', 'meta', 'google', 'tiktok', 'linkedin', 'outbrain', 'taboola', 'twitter', 'clarity'));

ALTER TABLE capi_event_log
  DROP CONSTRAINT capi_event_log_platform_check,
  ADD CONSTRAINT capi_event_log_platform_check
    CHECK (platform IN ('ga4', 'meta', 'google', 'tiktok', 'linkedin', 'outbrain', 'taboola', 'twitter', 'clarity'));

ALTER TABLE capi_failed_events
  DROP CONSTRAINT capi_failed_events_platform_check,
  ADD CONSTRAINT capi_failed_events_platform_check
    CHECK (platform IN ('ga4', 'meta', 'google', 'tiktok', 'linkedin', 'outbrain', 'taboola', 'twitter', 'clarity'));

-- 2. Insert the Clarity platform row.
INSERT INTO pixel_configurations (platform, is_enabled, pixel_id, access_token_enc, test_event_code, additional_config)
VALUES ('clarity', false, NULL, NULL, NULL, '{}')
ON CONFLICT (platform) DO NOTHING;
