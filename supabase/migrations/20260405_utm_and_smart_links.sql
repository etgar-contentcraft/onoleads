-- UTM Links: saved campaign links per landing page
CREATE TABLE IF NOT EXISTS utm_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  label TEXT NOT NULL,
  utm_source TEXT NOT NULL,
  utm_medium TEXT NOT NULL,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  full_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- UTM Presets: reusable templates per user
CREATE TABLE IF NOT EXISTS utm_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  utm_source TEXT NOT NULL,
  utm_medium TEXT NOT NULL,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  is_system BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Smart Links: short trackable links (Bitly-style)
CREATE TABLE IF NOT EXISTS smart_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  slug TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  target_url TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  fallback_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Smart Link Clicks: analytics per click
CREATE TABLE IF NOT EXISTS smart_link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES smart_links(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ DEFAULT now(),
  ip_hash TEXT,
  country TEXT,
  city TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  referrer TEXT,
  user_agent TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_utm_links_page ON utm_links(page_id);
CREATE INDEX IF NOT EXISTS idx_utm_presets_user ON utm_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_smart_links_slug ON smart_links(slug);
CREATE INDEX IF NOT EXISTS idx_smart_links_page ON smart_links(page_id);
CREATE INDEX IF NOT EXISTS idx_smart_link_clicks_link ON smart_link_clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_smart_link_clicks_time ON smart_link_clicks(clicked_at);

-- RLS Policies
ALTER TABLE utm_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE utm_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_link_clicks ENABLE ROW LEVEL SECURITY;

-- utm_links: authenticated users can CRUD their own
CREATE POLICY "utm_links_select" ON utm_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "utm_links_insert" ON utm_links FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "utm_links_delete" ON utm_links FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- utm_presets: users manage their own presets
CREATE POLICY "utm_presets_select" ON utm_presets FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_system = true);
CREATE POLICY "utm_presets_insert" ON utm_presets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "utm_presets_update" ON utm_presets FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "utm_presets_delete" ON utm_presets FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- smart_links: authenticated users can CRUD
CREATE POLICY "smart_links_select" ON smart_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "smart_links_insert" ON smart_links FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "smart_links_update" ON smart_links FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "smart_links_delete" ON smart_links FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- smart_link_clicks: anon can insert (from redirect route), authenticated can read
CREATE POLICY "smart_link_clicks_insert" ON smart_link_clicks FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "smart_link_clicks_select" ON smart_link_clicks FOR SELECT TO authenticated USING (true);
