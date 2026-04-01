-- OnoLeads Database Schema
-- Complete schema for lead generation landing page platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE program_level AS ENUM ('bachelor', 'master', 'certificate', 'continuing_ed');
CREATE TYPE page_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE page_type AS ENUM ('degree', 'event', 'sales', 'specialization');
CREATE TYPE page_language AS ENUM ('he', 'en', 'ar');
CREATE TYPE template_type AS ENUM ('degree_program', 'event', 'sales_event', 'specialization');
CREATE TYPE event_type AS ENUM ('open_day', 'webinar', 'sales', 'info_session');
-- NOTE: webhook_status enum removed — no longer needed (leads table removed)

-- ============================================
-- CORE TABLES
-- ============================================

-- Faculties
CREATE TABLE faculties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_he TEXT NOT NULL,
  name_en TEXT,
  name_ar TEXT,
  slug TEXT UNIQUE NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Programs
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  faculty_id UUID REFERENCES faculties(id) ON DELETE SET NULL,
  name_he TEXT NOT NULL,
  name_en TEXT,
  name_ar TEXT,
  slug TEXT UNIQUE NOT NULL,
  degree_type TEXT NOT NULL, -- B.A, B.Sc, LL.B, MBA, M.A, etc.
  level program_level NOT NULL,
  original_url TEXT,
  description_he TEXT,
  description_en TEXT,
  description_ar TEXT,
  duration_semesters INTEGER,
  campuses TEXT[] DEFAULT '{}',
  schedule_options TEXT[] DEFAULT '{}',
  is_international BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  hero_image_url TEXT,
  hero_stat_value TEXT,
  hero_stat_label_he TEXT,
  hero_stat_label_en TEXT,
  career_outcomes JSONB DEFAULT '[]',
  meta JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Specializations
CREATE TABLE specializations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  name_he TEXT NOT NULL,
  name_en TEXT,
  name_ar TEXT,
  slug TEXT UNIQUE NOT NULL,
  promote_as_standalone BOOLEAN DEFAULT false,
  description_he TEXT,
  description_en TEXT,
  description_ar TEXT,
  meta JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Templates
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type template_type NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  section_schema JSONB NOT NULL DEFAULT '[]',
  default_styles JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pages (Landing Pages)
CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  specialization_id UUID REFERENCES specializations(id) ON DELETE SET NULL,
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  title_he TEXT,
  title_en TEXT,
  title_ar TEXT,
  slug TEXT UNIQUE NOT NULL,
  language page_language DEFAULT 'he',
  status page_status DEFAULT 'draft',
  page_type page_type DEFAULT 'degree',
  seo_title TEXT,
  seo_description TEXT,
  og_image_url TEXT,
  custom_styles JSONB DEFAULT '{}',
  published_at TIMESTAMPTZ,
  last_built_at TIMESTAMPTZ,
  build_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Page Sections (Building blocks)
CREATE TABLE page_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  content JSONB NOT NULL DEFAULT '{}',
  styles JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTE: leads table removed in 20260401_privacy_analytics migration (privacy-first approach)
-- PII is no longer stored. See analytics_events table instead.

-- Media Library
CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  width INTEGER,
  height INTEGER,
  alt_text_he TEXT,
  alt_text_en TEXT,
  folder TEXT DEFAULT 'general',
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_he TEXT NOT NULL,
  name_en TEXT,
  name_ar TEXT,
  event_type event_type NOT NULL,
  event_date TIMESTAMPTZ,
  event_end_date TIMESTAMPTZ,
  location TEXT,
  description_he TEXT,
  description_en TEXT,
  programs UUID[] DEFAULT '{}',
  page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics Events
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
  cookie_id TEXT,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings (webhooks, global config)
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_programs_faculty ON programs(faculty_id);
CREATE INDEX idx_programs_slug ON programs(slug);
CREATE INDEX idx_programs_level ON programs(level);
CREATE INDEX idx_programs_active ON programs(is_active);

CREATE INDEX idx_specializations_program ON specializations(program_id);
CREATE INDEX idx_specializations_slug ON specializations(slug);
CREATE INDEX idx_specializations_standalone ON specializations(promote_as_standalone) WHERE promote_as_standalone = true;

CREATE INDEX idx_pages_program ON pages(program_id);
CREATE INDEX idx_pages_slug ON pages(slug);
CREATE INDEX idx_pages_status ON pages(status);
CREATE INDEX idx_pages_type ON pages(page_type);

CREATE INDEX idx_page_sections_page_order ON page_sections(page_id, sort_order);

-- NOTE: leads indexes removed — table no longer exists

CREATE INDEX idx_analytics_page ON analytics_events(page_id);
CREATE INDEX idx_analytics_created ON analytics_events(created_at DESC);
CREATE INDEX idx_analytics_cookie ON analytics_events(cookie_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_sections ENABLE ROW LEVEL SECURITY;
-- NOTE: leads RLS removed — table no longer exists
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Public read for published content
CREATE POLICY "Public read faculties" ON faculties FOR SELECT USING (true);
CREATE POLICY "Public read programs" ON programs FOR SELECT USING (is_active = true);
CREATE POLICY "Public read specializations" ON specializations FOR SELECT USING (true);
CREATE POLICY "Public read templates" ON templates FOR SELECT USING (is_active = true);
CREATE POLICY "Public read published pages" ON pages FOR SELECT USING (status = 'published');
CREATE POLICY "Public read visible sections" ON page_sections FOR SELECT USING (is_visible = true);

-- NOTE: leads insert policy removed — table no longer exists
CREATE POLICY "Anon insert analytics" ON analytics_events FOR INSERT WITH CHECK (true);

-- Admin full access (authenticated users)
CREATE POLICY "Admin all faculties" ON faculties FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all programs" ON programs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all specializations" ON specializations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all templates" ON templates FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all pages" ON pages FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all sections" ON page_sections FOR ALL USING (auth.role() = 'authenticated');
-- NOTE: leads read/update policies removed — table no longer exists
CREATE POLICY "Admin all media" ON media FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all events" ON events FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin read analytics" ON analytics_events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all settings" ON settings FOR ALL USING (auth.role() = 'authenticated');

-- Public read media (for images on landing pages)
CREATE POLICY "Public read media" ON media FOR SELECT USING (true);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_faculties_updated_at BEFORE UPDATE ON faculties FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON programs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_specializations_updated_at BEFORE UPDATE ON specializations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON pages FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_page_sections_updated_at BEFORE UPDATE ON page_sections FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- DEFAULT SETTINGS
-- ============================================

INSERT INTO settings (key, value) VALUES
  ('webhook_url', '"https://hook.make.com/placeholder"'),
  ('site_name', '{"he": "הקריה האקדמית אונו", "en": "Ono Academic College", "ar": "الحرم الأكاديمي أونو"}'),
  ('brand_colors', '{"primary_green": "#B8D900", "primary_gray": "#716C70", "text_gray": "#716C70", "light_bg": "#F5F5F5", "white": "#FFFFFF"}'),
  ('brand_fonts', '{"hebrew": "Foodifot, Arial, sans-serif", "english": "Tahoma, sans-serif", "arabic": "Tahoma, Arial, sans-serif"}'),
  ('default_form_fields', '[{"name": "full_name", "type": "text", "label_he": "שם מלא", "label_en": "Full Name", "required": true}, {"name": "phone", "type": "tel", "label_he": "טלפון", "label_en": "Phone", "required": true}, {"name": "email", "type": "email", "label_he": "אימייל", "label_en": "Email", "required": false}]'),
  ('whatsapp_number', '"972501234567"'),
  ('slogan', '{"he": "משנים את פני החברה בישראל", "en": "Changing the Face of Israeli Society"}');
