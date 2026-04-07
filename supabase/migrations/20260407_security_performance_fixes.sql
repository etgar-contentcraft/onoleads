-- ============================================================
-- Security & Performance Fixes — 2026-04-07
-- Applied after the 5-agent code review.
-- Each section is idempotent (IF NOT EXISTS / OR REPLACE).
-- ============================================================

-- ------------------------------------------------------------
-- 1. faculty_members: add anon SELECT policy
--    Without this, landing pages that display faculty members
--    return empty rows when queried with the anon key.
-- ------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'faculty_members'
      AND policyname = 'Public read faculty members'
  ) THEN
    CREATE POLICY "Public read faculty members"
      ON faculty_members FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- ------------------------------------------------------------
-- 2. utm_links: add missing UPDATE policy
--    Without this, editing a UTM link silently writes 0 rows.
-- ------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'utm_links'
      AND policyname = 'utm_links_update'
  ) THEN
    CREATE POLICY "utm_links_update" ON utm_links
      FOR UPDATE TO authenticated
      USING (auth.uid() = created_by)
      WITH CHECK (auth.uid() = created_by);
  END IF;
END $$;

-- ------------------------------------------------------------
-- 3. audit_logs: restrict SELECT to admin/super_admin only
--    Previously any authenticated user could read audit logs
--    which contain actor_email, ip_address, user_agent.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can read audit logs" ON audit_logs;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audit_logs'
      AND policyname = 'Admins read audit logs'
  ) THEN
    CREATE POLICY "Admins read audit logs" ON audit_logs
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

-- ------------------------------------------------------------
-- 4. pixel_configurations: restrict to admin/super_admin
--    Viewer-role users could previously SELECT access_token_enc.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Admin manage pixel_configurations" ON pixel_configurations;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pixel_configurations'
      AND policyname = 'Admin manage pixel_configurations v2'
  ) THEN
    CREATE POLICY "Admin manage pixel_configurations v2" ON pixel_configurations
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

-- ------------------------------------------------------------
-- 5. analytics_events: composite index for session queries
--    Joins by (page_id, cookie_id) were doing full page scans.
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_analytics_events_page_cookie
  ON analytics_events(page_id, cookie_id)
  WHERE cookie_id IS NOT NULL;

-- ------------------------------------------------------------
-- 6. page_popup_assignments: partial index for enabled check
--    Landing pages query WHERE page_id = X AND is_enabled = true.
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_page_popup_page_enabled
  ON page_popup_assignments(page_id)
  WHERE is_enabled = true;

-- ------------------------------------------------------------
-- 7. smart_links: index for active-link lookups per page
--    The link management UI lists all active links for a page.
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_smart_links_page_active
  ON smart_links(page_id, is_active)
  WHERE is_active = true;

-- Also add updated_at if missing
ALTER TABLE smart_links
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ------------------------------------------------------------
-- 8. page_versions: enforce 20-version limit per page
--    Without this trigger, the versions table grows unboundedly.
--    Each version stores a full JSONB snapshot (~50-200 KB).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_page_version_limit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM page_versions
  WHERE page_id = NEW.page_id
    AND id NOT IN (
      SELECT id FROM page_versions
      WHERE page_id = NEW.page_id
      ORDER BY version_num DESC
      LIMIT 20
    );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_page_version_limit ON page_versions;
CREATE TRIGGER trg_page_version_limit
  AFTER INSERT ON page_versions
  FOR EACH ROW EXECUTE FUNCTION enforce_page_version_limit();

-- ------------------------------------------------------------
-- 9. profiles: replace self-referential RLS with a stable
--    SECURITY DEFINER function to avoid N+1 subquery per row.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth_is_admin()
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
$$;

-- Grant execution to authenticated role
GRANT EXECUTE ON FUNCTION auth_is_admin() TO authenticated;

-- ------------------------------------------------------------
-- 10. smart_links: add CHECK constraint on target_url protocol
--     Prevents open-redirect abuse at the database layer.
--     (Application-level check in go/[slug]/route.ts added too.)
-- ------------------------------------------------------------
ALTER TABLE smart_links
  DROP CONSTRAINT IF EXISTS chk_smart_links_target_url_https;

ALTER TABLE smart_links
  ADD CONSTRAINT chk_smart_links_target_url_https
  CHECK (target_url LIKE 'https://%');

ALTER TABLE smart_links
  DROP CONSTRAINT IF EXISTS chk_smart_links_fallback_url_https;

ALTER TABLE smart_links
  ADD CONSTRAINT chk_smart_links_fallback_url_https
  CHECK (fallback_url IS NULL OR fallback_url LIKE 'https://%');

-- ------------------------------------------------------------
-- 11. capi_event_log: add real FK + index on analytics_event_id
-- ------------------------------------------------------------
ALTER TABLE capi_event_log
  DROP CONSTRAINT IF EXISTS fk_capi_event_log_analytics_event;

ALTER TABLE capi_event_log
  ADD CONSTRAINT fk_capi_event_log_analytics_event
  FOREIGN KEY (analytics_event_id)
  REFERENCES analytics_events(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_capi_event_log_analytics_event
  ON capi_event_log(analytics_event_id)
  WHERE analytics_event_id IS NOT NULL;
