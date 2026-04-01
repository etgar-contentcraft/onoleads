# Privacy-First Anonymous Analytics — Design Document

**Date:** 2026-04-01
**Status:** Approved
**Goal:** Remove all PII storage, replace with anonymous analytics, webhook-only lead forwarding.

## Summary

Replace the `leads` table (which stores full_name, phone, email, IP, user-agent) with an anonymous `analytics_events` table that tracks only non-PII data. Lead form submissions forward PII exclusively via webhook to Make.com — nothing is stored in the database.

## Data Model

### New: `analytics_events` table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| event_type | ENUM | page_view, form_submit, cta_click, popup_view, popup_dismiss |
| page_id | UUID FK | Landing page reference |
| cookie_id | TEXT | Anonymous 1st-party cookie |
| utm_source | TEXT | |
| utm_medium | TEXT | |
| utm_campaign | TEXT | |
| utm_content | TEXT | |
| utm_term | TEXT | |
| referrer_domain | TEXT | Domain only (no full URL) |
| device_type | TEXT | mobile / desktop / tablet |
| webhook_status | TEXT | pending / sent / failed (form_submit only) |
| created_at | TIMESTAMPTZ | |

### Removed

- `leads` table — DROP TABLE entirely
- All PII fields: full_name, phone, email, ip_address, user_agent

## API Changes

### POST /api/leads (rewrite)
1. Validate & sanitize form inputs
2. Rate limit + CSRF + bot detection (unchanged)
3. Fire webhook to Make.com with full lead data (PII)
4. Insert anonymous `form_submit` event into analytics_events (no PII)
5. Return success/failure based on webhook status

### POST /api/analytics/event (new)
- Accepts: page_view, cta_click, popup_view, popup_dismiss
- Stores anonymous event with UTM + cookie_id + device_type

## Dashboard

### Per-Page Analytics (/dashboard/pages/[id]/analytics)
- Views / unique visitors / submissions / conversion rate
- Timeline chart (daily)
- UTM breakdown tables (source, medium, campaign)
- Device type breakdown
- Period comparison (this week vs last week, etc.)
- Accessible from page editor via link

### Overview Dashboard (/dashboard/analytics)
- Top pages by leads, conversion rate
- Campaign performance across pages
- Global UTM breakdown
- Device trends
- Period comparison

## Tracking

### Page Views
- Client-side beacon on landing page load
- Uses 1st-party cookie (onoleads_id) for unique visitor counting
- Sends: page_id, cookie_id, UTM params, device_type, referrer_domain

### Unique Visitors
- Based on cookie_id (1st-party, anonymous)
- COUNT(DISTINCT cookie_id) for unique visitors
- COUNT(*) for total views

## Social Proof
- Stays, based on COUNT(form_submit) from analytics_events
- No PII involved

## Privacy Compliance
- No PII stored in database at any point
- No Israeli Privacy Protection Law database registration needed (no personal data)
- Cookie consent still required for 1st-party analytics cookie
- Webhook payload (with PII) is transient — sent and forgotten
- Audit logs sanitized to remove any PII references

## Security Hardening
- Review and harden all existing security (rate limiting, CSRF, sanitization)
- Ensure no PII leaks into logs, audit trail, or error messages
- Verify webhook HMAC signing
- Add security headers review
