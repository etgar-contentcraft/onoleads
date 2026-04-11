/**
 * Types for the popup campaign system — popup overlays and sticky CTA bars
 * with per-page assignment, trigger configuration, and analytics.
 */

export type CampaignType = "exit_intent" | "timed" | "scroll_triggered" | "sticky_bar";

export type CampaignFrequency = "once_per_session" | "once_per_day" | "once_ever" | "every_visit";

export type MediaType = "none" | "image" | "video";
export type MediaPosition = "top" | "side" | "background";

/** Star rating display config */
export interface RatingConfig {
  score: number;   // 0–5 (supports decimals, e.g., 4.8)
  count: number;   // review count to display
}

/** Overridable content fields for device-specific variants */
export interface PopupContentOverride {
  title_he?: string;
  body_he?: string;
  cta_text_he?: string;
  dismiss_text_he?: string;
  image_url?: string;
  media_url?: string;
  social_proof_text?: string;
  countdown_end?: string | null;
}

/** Content shape for popup overlays (exit_intent, timed, scroll_triggered) */
export interface PopupContent {
  title_he: string;
  body_he: string;
  cta_text_he: string;
  dismiss_text_he: string;
  bg_color: string;
  accent_color: string;

  /** When true, the popup renders an inline lead-capture form instead of opening the CTA modal */
  include_form: boolean;
  /** When true, CTA opens a WhatsApp link instead of the lead form */
  whatsapp_action?: boolean;

  /* ── Media ── */
  /** Legacy single image URL (kept for backwards compatibility) */
  image_url?: string;
  /** Media type: 'none' | 'image' | 'video' */
  media_type?: MediaType;
  /**
   * For image: any URL (absolute or relative).
   * For video: YouTube or Vimeo URL — rendered as an embedded iframe.
   */
  media_url?: string;
  /** Where the media appears relative to the text content */
  media_position?: MediaPosition;

  /* ── Engagement elements ── */
  /**
   * ISO date string for a countdown clock.
   * When set, a live DD:HH:MM:SS timer is shown above the CTA.
   */
  countdown_end?: string | null;
  /** Social proof line, e.g. "כבר 47 אנשים נרשמו השבוע" */
  social_proof_text?: string;
  /** Star rating config shown below the body text */
  rating?: RatingConfig | null;
  /** When true, a confetti burst fires after a successful inline form submit */
  confetti_on_submit?: boolean;

  /* ── Device variants ── */
  /**
   * Partial content override applied on mobile screens (< 768 px).
   * Fields here replace the base values on mobile only.
   * Leave undefined to use the same content on all devices.
   */
  mobile_override?: PopupContentOverride;
}

/** Content shape for sticky CTA bars */
export interface StickyBarContent {
  text_he: string;
  text_en?: string;
  text_ar?: string;
  cta_text_he: string;
  cta_text_en?: string;
  cta_text_ar?: string;
  phone_number?: string;
  bg_color: string;
  accent_color: string;
  show_phone: boolean;
  position: "top" | "bottom";
  /** Social proof or urgency line shown beside CTA on desktop */
  social_proof_text?: string;
  /** ISO date for countdown inside the bar */
  countdown_end?: string | null;
}

/** Trigger config for exit-intent campaigns */
export interface ExitIntentTrigger {
  sensitivity: "subtle" | "medium" | "aggressive";
}

/** Trigger config for timed campaigns */
export interface TimedTrigger {
  delay_seconds: number;
}

/** Trigger config for scroll-triggered campaigns */
export interface ScrollTrigger {
  scroll_percent: number;
}

/** Trigger config for sticky bar campaigns */
export interface StickyBarTrigger {
  show_after_scroll_px: number;
}

/** Full popup campaign record from the database */
export interface PopupCampaign {
  id: string;
  name: string;
  campaign_type: CampaignType;
  template_id: string | null;
  content: PopupContent | StickyBarContent;
  trigger_config: ExitIntentTrigger | TimedTrigger | ScrollTrigger | StickyBarTrigger;
  frequency: CampaignFrequency;
  show_on_mobile: boolean;
  show_on_desktop: boolean;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  views_count: number;
  conversions_count: number;
  created_at: string;
  updated_at: string;
}

/** Assignment linking a campaign to a specific page */
export interface PagePopupAssignment {
  id: string;
  page_id: string;
  campaign_id: string;
  priority: number;
  is_enabled: boolean;
  created_at: string;
  /** Joined campaign data (populated when querying with select) */
  campaign?: PopupCampaign;
}

/** Template definition used in the template picker UI */
export interface PopupTemplate {
  id: string;
  name_he: string;
  description_he: string;
  campaign_type: CampaignType;
  icon: string;
  content: PopupContent | StickyBarContent;
  trigger_config: ExitIntentTrigger | TimedTrigger | ScrollTrigger | StickyBarTrigger;
}
