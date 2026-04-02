/**
 * Audit logging utility for tracking security-relevant events.
 * Logs admin actions, lead submissions, and authentication events
 * to the Supabase audit_logs table.
 */

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Categories of auditable events
 */
/** All valid audit action types */
export type AuditAction =
  | "lead_submitted"
  | "lead_webhook_sent"
  | "lead_webhook_failed"
  | "admin_login"
  | "admin_login_failed"
  | "admin_logout"
  | "admin_page_created"
  | "admin_page_updated"
  | "admin_page_deleted"
  | "admin_settings_updated"
  | "rate_limit_exceeded"
  | "bot_detected"
  | "csrf_validation_failed";

/**
 * Structure of an audit log entry
 */
interface AuditLogEntry {
  action: AuditAction;
  actor_id?: string | null;
  actor_email?: string | null;
  resource_type?: string | null;
  resource_id?: string | null;
  metadata?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

/**
 * Writes an audit log entry to the database.
 * Failures are caught and logged to console to avoid disrupting the main flow.
 * @param entry - Audit log data to record
 */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = createAdminClient();

    await supabase.from("audit_logs").insert({
      action: entry.action,
      actor_id: entry.actor_id || null,
      actor_email: entry.actor_email || null,
      resource_type: entry.resource_type || null,
      resource_id: entry.resource_id || null,
      metadata: entry.metadata || null,
      ip_address: entry.ip_address || null,
      user_agent: entry.user_agent || null,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    /* Audit log failures should not break the main flow */
    console.error("Audit log write failed:", error);
  }
}

/**
 * SQL migration to create the audit_logs table.
 * Run this in the Supabase SQL editor to set up the table.
 *
 * CREATE TABLE IF NOT EXISTS audit_logs (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   action text NOT NULL,
 *   actor_id uuid REFERENCES auth.users(id),
 *   actor_email text,
 *   resource_type text,
 *   resource_id text,
 *   metadata jsonb,
 *   ip_address text,
 *   user_agent text,
 *   created_at timestamptz DEFAULT now()
 * );
 *
 * -- Index for fast querying by action and date
 * CREATE INDEX idx_audit_logs_action ON audit_logs(action);
 * CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
 * CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
 *
 * -- Enable RLS (only service role can write)
 * ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
 *
 * -- Policy: only service role can insert
 * CREATE POLICY "Service role can insert audit logs"
 *   ON audit_logs FOR INSERT
 *   TO service_role
 *   WITH CHECK (true);
 *
 * -- Policy: authenticated admins can read
 * CREATE POLICY "Admins can read audit logs"
 *   ON audit_logs FOR SELECT
 *   TO authenticated
 *   USING (true);
 */
