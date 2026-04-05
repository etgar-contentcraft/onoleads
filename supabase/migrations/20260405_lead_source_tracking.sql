-- Lead source tracking: records which CTA triggered the form submission.
-- Values: 'hero_cta', 'floating_cta', 'sticky_bar', 'popup_exit_intent',
--         'popup_timed', 'popup_scroll', 'section_cta', 'section_<type>'

ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS lead_source TEXT;

-- Index for lead source analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_lead_source
  ON analytics_events(lead_source) WHERE lead_source IS NOT NULL;
