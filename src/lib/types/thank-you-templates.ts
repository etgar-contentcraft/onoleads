/**
 * Type definitions for the thank-you-page template system.
 *
 * A "template" is a row in `thank_you_templates`. It pairs:
 *   - a layout_id (which React renderer to use — one of 10 built-in layouts)
 *   - per-language content (heading, subheading, button labels, etc.)
 *   - visual config (colors, animation speed, etc.)
 *
 * Each landing page can choose a template via PageSettings.thank_you_template_id.
 * One template is marked as the global default (is_default = true).
 */

/** Languages supported by every template */
export type TyLang = "he" | "en" | "ar";

/** All available built-in layouts. Each maps to a React component in the registry. */
export type TyLayoutId =
  | "classic_dark"
  | "minimal_light"
  | "celebration"
  | "personal_advisor"
  | "calendar_focus"
  | "video_welcome"
  | "resource_library"
  | "social_proof"
  | "urgency_cohort"
  | "multi_channel"
  | "simple_thanks";

/**
 * Editable content fields for a single language.
 * Not all fields are used by every layout — each layout reads only what it needs.
 * Fields are optional so editors can leave layout-specific fields blank.
 */
export interface TyContentFields {
  // ── Always-visible core ──────────────────────────────────────────────
  /** Main heading. Use [שם] / [name] as a placeholder for the lead's first name. */
  heading?: string;
  subheading?: string;
  thank_you_word?: string;       // e.g. "תודה" / "Thank you"

  // ── "What happens next" timeline (used by most layouts) ───────────────
  steps_label?: string;          // "מה קורה עכשיו?" / "What happens next?"
  step_1?: string;
  step_2?: string;
  step_3?: string;

  // ── WhatsApp CTA ─────────────────────────────────────────────────────
  whatsapp_cta?: string;         // button label
  whatsapp_msg?: string;         // pre-filled message

  // ── Calendar booking ─────────────────────────────────────────────────
  calendar_cta?: string;
  calendar_label?: string;       // "Book a call" header

  // ── Video welcome ────────────────────────────────────────────────────
  video_label?: string;

  // ── Social media follows ─────────────────────────────────────────────
  social_label?: string;         // "Follow us"

  // ── Referral / share ─────────────────────────────────────────────────
  share_cta?: string;
  share_text?: string;
  shared_label?: string;         // confirmation toast text

  // ── Footer ───────────────────────────────────────────────────────────
  back_link?: string;
  copyright?: string;

  // ── Personal advisor (used by personal_advisor layout) ───────────────
  advisor_name?: string;
  advisor_title?: string;
  advisor_quote?: string;
  advisor_photo_url?: string;

  // ── Resource library (used by resource_library layout) ───────────────
  brochure_label?: string;
  brochure_url?: string;
  faq_label?: string;
  faq_url?: string;

  // ── Urgency / cohort (used by urgency_cohort layout) ─────────────────
  intake_label?: string;         // "Next intake date"
  intake_date_text?: string;     // free-form date text
  countdown_label?: string;      // "Application closes in"

  // ── Social proof (used by social_proof layout) ───────────────────────
  testimonials_label?: string;   // "What our students say"
  testimonial_1_name?: string;
  testimonial_1_quote?: string;
  testimonial_1_photo_url?: string;
  testimonial_2_name?: string;
  testimonial_2_quote?: string;
  testimonial_2_photo_url?: string;
  testimonial_3_name?: string;
  testimonial_3_quote?: string;
  testimonial_3_photo_url?: string;

  // ── Multi-channel connect (used by multi_channel layout) ─────────────
  channels_label?: string;       // "Choose how to connect"
  phone_cta?: string;
  email_cta?: string;
}

/** Per-language content map */
export type TyContent = Partial<Record<TyLang, TyContentFields>>;

/** Visual configuration (colors, animations, etc.) */
export interface TyConfig {
  /** Primary accent color (default: brand green #B8D900) */
  accent_color?: string;
  /** Background style: 'dark' | 'light' | 'gradient' */
  bg_style?: "dark" | "light" | "gradient";
  /** Show success checkmark animation */
  show_checkmark?: boolean;
  /** Show confetti animation (celebration layout) */
  show_confetti?: boolean;
}

/** Full row from the thank_you_templates table */
export interface ThankYouTemplate {
  id: string;
  template_key: string;
  layout_id: TyLayoutId;
  name_he: string;
  name_en: string;
  name_ar: string;
  description_he: string;
  description_en: string;
  description_ar: string;
  preview_image_url: string;
  content: TyContent;
  config: TyConfig;
  is_system: boolean;
  is_active: boolean;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Helper: pick the right language fields, falling back to Hebrew then to empty */
export function pickContent(
  content: TyContent,
  language: TyLang | string,
): TyContentFields {
  const lang = (language as TyLang) || "he";
  return content[lang] || content.he || content.en || content.ar || {};
}

/** Helper: get a single field with sensible cross-language fallback */
export function pickField(
  content: TyContent,
  language: TyLang | string,
  field: keyof TyContentFields,
): string {
  const primary = pickContent(content, language);
  if (primary[field]) return primary[field] as string;
  // Fallback chain: requested → he → en → ar
  for (const lang of ["he", "en", "ar"] as TyLang[]) {
    const fields = content[lang];
    if (fields?.[field]) return fields[field] as string;
  }
  return "";
}
