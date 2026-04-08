/**
 * ThankYouPageSettings — configuration for the post-lead thank you page.
 * Stored globally in the settings table as JSON under key "thank_you_page_settings".
 * Per-page overrides go in pages.custom_styles.thank_you_settings.
 */

export interface ThankYouPageSettings {
  // ── Core message ──────────────────────────────────────────────────────────
  /** Main heading. Use [שם] as a placeholder for the lead's first name. */
  heading_he?: string;
  subheading_he?: string;

  // ── WhatsApp CTA ──────────────────────────────────────────────────────────
  show_whatsapp?: boolean;
  whatsapp_number?: string; // overrides global whatsapp_number for this page
  whatsapp_cta_he?: string; // button label, e.g. "רוצים לדבר עכשיו?"

  // ── Social media follows ──────────────────────────────────────────────────
  show_social?: boolean;
  facebook_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  linkedin_url?: string;
  tiktok_url?: string;

  // ── Referral / Share ──────────────────────────────────────────────────────
  show_referral?: boolean;
  referral_cta_he?: string;

  // ── Calendar booking ──────────────────────────────────────────────────────
  show_calendar?: boolean;
  calendar_url?: string;      // Calendly / Cal.com URL
  calendar_cta_he?: string;   // button label

  // ── Video message ─────────────────────────────────────────────────────────
  show_video?: boolean;
  video_url?: string;

  // ── Custom redirect ───────────────────────────────────────────────────────
  /** If set, skip /ty entirely and redirect here after form submit. */
  custom_redirect_url?: string;

  // ── Linked event (central events table) ──────────────────────────────────
  /**
   * UUID of a row in the `events` table. When set and the selected template
   * is `open_day`, the event's details (title, description, location, dates,
   * organizer) override the template's default content before rendering.
   * Managed via the Events dashboard at /dashboard/events.
   */
  event_id?: string;
}

/** Ono's default thank-you page settings (used when no global/per-page settings are configured) */
export const ONO_TY_DEFAULTS: ThankYouPageSettings = {
  heading_he: "תודה! קיבלנו את פרטיך",
  subheading_he: "יועץ לימודים ייצור איתך קשר בקרוב",
  show_whatsapp: true,
  whatsapp_cta_he: "רוצים לדבר עכשיו? כתבו לנו",
  show_social: true,
  facebook_url: "https://www.facebook.com/OnoAcademic",
  instagram_url: "https://www.instagram.com/ono_academic/",
  youtube_url: "https://www.youtube.com/@OnoAcademic",
  linkedin_url: "https://il.linkedin.com/school/ono-academic-college",
  show_referral: true,
  referral_cta_he: "שתפו עם חבר שמחפש תואר",
  show_calendar: false,
  show_video: false,
};
