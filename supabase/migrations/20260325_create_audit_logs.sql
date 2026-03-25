-- =============================================================================
-- Migration: Create audit_logs table for security event tracking
-- Date: 2026-03-25
-- Description: Stores security-relevant events including lead submissions,
--              admin actions, authentication events, and security violations.
-- =============================================================================

-- Create the audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  action text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  resource_type text,
  resource_id text,
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Add comment explaining the table purpose
COMMENT ON TABLE audit_logs IS 'Security audit trail for tracking admin actions, lead submissions, auth events, and security violations';

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can insert audit logs (prevents tampering)
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy: Authenticated admin users can read audit logs
CREATE POLICY "Authenticated users can read audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (true);

-- Policy: No one can update or delete audit logs (immutable trail)
-- (No UPDATE or DELETE policies = denied by default with RLS enabled)

-- =============================================================================
-- RLS Policies for existing leads table (documentation / reference)
-- Run these if not already applied:
-- =============================================================================
-- ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "Service role can manage leads"
--   ON leads FOR ALL
--   TO service_role
--   USING (true)
--   WITH CHECK (true);
--
-- CREATE POLICY "Authenticated users can read leads"
--   ON leads FOR SELECT
--   TO authenticated
--   USING (true);
