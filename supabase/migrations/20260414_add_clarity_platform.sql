-- Add Microsoft Clarity as a supported pixel platform.
-- Clarity is analytics-only (session recording + heatmaps) — no CAPI, no token needed.

INSERT INTO pixel_configurations (platform, is_enabled, pixel_id, access_token_enc, test_event_code, additional_config)
VALUES ('clarity', false, NULL, NULL, NULL, '{}')
ON CONFLICT (platform) DO NOTHING;
