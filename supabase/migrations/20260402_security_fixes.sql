/**
 * Security fixes for RLS policies identified during security audit.
 *
 * CRIT-2: Restrict anonymous INSERT on analytics_events to valid event types only.
 * CRIT-3: Remove anonymous write access to media storage bucket.
 * HIGH-4: Remove anonymous read access to audit_logs.
 */

-- ============================================================================
-- CRIT-2: Restrict analytics_events anonymous INSERT to known event types
-- Prevents poisoning analytics with arbitrary event types and unlimited rows.
-- ============================================================================

DROP POLICY IF EXISTS "Anon insert analytics" ON analytics_events;
CREATE POLICY "Anon insert analytics (restricted)" ON analytics_events
  FOR INSERT TO anon
  WITH CHECK (
    event_type IN ('page_view', 'form_submit', 'cta_click', 'popup_view', 'popup_dismiss', 'scroll_depth')
  );

-- ============================================================================
-- CRIT-3: Remove anonymous write/delete access to media storage bucket.
-- The anon role is unauthenticated — authenticated users already have correct
-- policies for upload/update/delete. Public read access is preserved.
-- ============================================================================

DROP POLICY IF EXISTS "Anon can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Anon can update media" ON storage.objects;
DROP POLICY IF EXISTS "Anon can delete media" ON storage.objects;

-- ============================================================================
-- HIGH-4: Remove anonymous read access to audit_logs.
-- The authenticated role policy is sufficient for logged-in admins.
-- Anon access exposes admin emails, IPs, and action metadata.
-- ============================================================================

DROP POLICY IF EXISTS "Anon read audit logs" ON audit_logs;
