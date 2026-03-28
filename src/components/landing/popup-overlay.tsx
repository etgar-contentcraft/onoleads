/**
 * Generalized popup overlay component for the OnoLeads landing page system.
 * Renders a centered modal dialog driven by a PopupCampaign's content,
 * supporting inline lead forms, WhatsApp CTAs, or the standard CTA modal.
 */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { PopupContent } from "@/lib/types/popup-campaigns";
import { useCtaModal } from "@/components/landing/cta-modal";

// ============================================================================
// Props
// ============================================================================

interface PopupOverlayProps {
  content: PopupContent;
  language?: "he" | "en" | "ar";
  whatsappNumber?: string;
  pageId?: string;
  programId?: string;
  pageSlug?: string;
  onDismiss: () => void;
  onCtaClick: () => void;
}

// ============================================================================
// Constants
// ============================================================================

/** Minimum length for full name validation */
const MIN_NAME_LENGTH = 2;

/** Phone number regex: digits, dashes, plus, parens, spaces — 7-15 chars */
const PHONE_REGEX = /^[\d\-+() ]{7,15}$/;

/** Basic email regex */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** WhatsApp base URL for building click-to-chat links */
const WHATSAPP_BASE_URL = "https://wa.me/";

// ============================================================================
// Component
// ============================================================================

/**
 * Popup overlay that displays campaign content as a centered modal.
 * Supports three CTA modes:
 *   1. Inline lead form (when content.include_form is true)
 *   2. WhatsApp link (when content.whatsapp_action is true)
 *   3. Standard CTA modal (default)
 *
 * @param content - The popup campaign content (title, body, colors, flags)
 * @param language - Display language; defaults to "he" (Hebrew, RTL)
 * @param whatsappNumber - WhatsApp number for click-to-chat links
 * @param pageId - Current landing page ID for lead attribution
 * @param programId - Program ID for lead attribution
 * @param pageSlug - Page slug used to build the /ty redirect URL
 * @param onDismiss - Callback fired when the user dismisses the popup
 * @param onCtaClick - Callback fired when the user clicks the CTA (for analytics)
 */
export function PopupOverlay({
  content,
  language = "he",
  whatsappNumber,
  pageId,
  programId,
  pageSlug,
  onDismiss,
  onCtaClick,
}: PopupOverlayProps) {
  const { open: openCtaModal } = useCtaModal();
  const router = useRouter();
  const isRtl = language === "he" || language === "ar";

  // ---------------------------------------------------------------------------
  // Inline form state (used only when content.include_form is true)
  // ---------------------------------------------------------------------------

  const [formData, setFormData] = useState({ full_name: "", phone: "", email: "" });
  const [honeypot, setHoneypot] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  /** Whether the entrance animation has completed its mount cycle */
  const [mounted, setMounted] = useState(false);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  /** Trigger entrance animation on mount */
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  /** Lock body scroll while the overlay is visible */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  /** Close on ESC key */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onDismiss]);

  /** Generate a CSRF token for the inline form */
  useEffect(() => {
    if (content.include_form) {
      setCsrfToken(crypto.randomUUID());
    }
  }, [content.include_form]);

  // ---------------------------------------------------------------------------
  // Form helpers
  // ---------------------------------------------------------------------------

  /**
   * Validates the inline lead form fields.
   * @returns true when all required fields pass validation
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name.trim() || formData.full_name.trim().length < MIN_NAME_LENGTH) {
      newErrors.full_name = isRtl ? "שדה חובה" : "Required";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = isRtl ? "שדה חובה" : "Required";
    } else if (!PHONE_REGEX.test(formData.phone.trim())) {
      newErrors.phone = isRtl ? "טלפון לא תקין" : "Invalid phone";
    }

    if (formData.email && !EMAIL_REGEX.test(formData.email)) {
      newErrors.email = isRtl ? "אימייל לא תקין" : "Invalid email";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Submits the inline lead form to the /api/leads endpoint.
   * Includes CSRF token, honeypot field, and popup source attribution.
   */
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) return;
    setSubmitting(true);

    try {
      const payload = {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        page_id: pageId || null,
        program_id: programId || null,
        source: "popup",
        csrf_token: csrfToken,
        /* Honeypot — bots will fill this, real users never see it */
        website: honeypot,
      };

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onCtaClick();

        /* Store first name for the thank-you page */
        const firstName = formData.full_name.trim().split(" ")[0] || "";
        if (firstName) sessionStorage.setItem("ty_name", firstName);

        if (pageSlug) {
          onDismiss();
          router.push(`/lp/${encodeURIComponent(pageSlug)}/ty`);
        } else {
          setSubmitSuccess(true);
        }
      } else {
        const errorData = await res.json().catch(() => null);
        setSubmitError(
          errorData?.error || (isRtl ? "אירעה שגיאה. אנא נסו שוב." : "An error occurred. Please try again."),
        );
      }
    } catch {
      setSubmitError(isRtl ? "אירעה שגיאה בחיבור. אנא נסו שוב." : "Connection error. Please try again.");
    }

    setSubmitting(false);
  };

  // ---------------------------------------------------------------------------
  // CTA handler
  // ---------------------------------------------------------------------------

  /**
   * Handles the primary CTA button click based on the campaign mode.
   * Opens WhatsApp or the standard CTA modal, then fires the analytics callback.
   */
  const handleCtaClick = () => {
    onCtaClick();

    if (content.whatsapp_action && whatsappNumber) {
      const cleanNumber = whatsappNumber.replace(/\D/g, "");
      window.open(`${WHATSAPP_BASE_URL}${cleanNumber}`, "_blank", "noopener,noreferrer");
      onDismiss();
    } else {
      onDismiss();
      openCtaModal();
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className={`fixed inset-0 z-[90] flex items-center justify-center p-4 transition-opacity duration-300 ${
        mounted ? "opacity-100" : "opacity-0"
      }`}
      dir={isRtl ? "rtl" : "ltr"}
      role="dialog"
      aria-modal="true"
      aria-label={content.title_he}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onDismiss}
        aria-hidden="true"
      />

      {/* Card */}
      <div
        className={`relative rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transition-all duration-300 ${
          mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
        style={{ backgroundColor: content.bg_color }}
      >
        {/* Close button (top-left) */}
        <button
          onClick={onDismiss}
          className="absolute top-3 left-3 z-10 w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={isRtl ? "סגור" : "Close"}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Accent color bar */}
        <div className="w-12 h-1 rounded-full mx-auto mt-5" style={{ backgroundColor: content.accent_color }} />

        {/* Content area */}
        <div className="p-7 text-center">
          {/* Optional image */}
          {content.image_url && (
            <div className="mb-4 flex justify-center">
              <img
                src={content.image_url}
                alt=""
                className="max-h-28 w-auto rounded-lg object-contain"
                aria-hidden="true"
              />
            </div>
          )}

          {/* Title */}
          <h2 className="font-heading text-xl font-extrabold text-[#2a2628] mb-2">
            {content.title_he}
          </h2>

          {/* Body */}
          <p className="font-heebo text-[#716C70] text-sm mb-5 leading-relaxed">
            {content.body_he}
          </p>

          {/* ---------------------------------------------------------------- */}
          {/* Mode: Inline Lead Form                                           */}
          {/* ---------------------------------------------------------------- */}
          {content.include_form && !submitSuccess && (
            <>
              {/* Server-side error */}
              {submitError && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center">
                  {submitError}
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-3 text-right" dir="rtl" noValidate>
                {/* Honeypot field — hidden from real users */}
                <div aria-hidden="true" className="absolute -left-[9999px] -top-[9999px]">
                  <label htmlFor="popup_website">{isRtl ? "אל תמלאו שדה זה" : "Do not fill"}</label>
                  <input
                    id="popup_website"
                    name="website"
                    type="text"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                {/* Full Name */}
                <div>
                  <label htmlFor="popup_full_name" className="sr-only">
                    {isRtl ? "שם מלא" : "Full name"}
                  </label>
                  <input
                    id="popup_full_name"
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder={isRtl ? "שם מלא *" : "Full name *"}
                    autoComplete="name"
                    className="w-full h-11 rounded-xl bg-black/5 border border-black/10 px-4 text-[#2a2628] text-sm placeholder:text-[#9A969A] focus:border-[#B8D900] focus:outline-none focus:ring-2 focus:ring-[#B8D900]/30 transition-all"
                    aria-required="true"
                    aria-invalid={!!errors.full_name}
                    aria-describedby={errors.full_name ? "popup_full_name_error" : undefined}
                  />
                  {errors.full_name && (
                    <p id="popup_full_name_error" role="alert" className="text-red-500 text-xs mt-1 font-medium">
                      {errors.full_name}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="popup_phone" className="sr-only">
                    {isRtl ? "טלפון" : "Phone"}
                  </label>
                  <input
                    id="popup_phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder={isRtl ? "טלפון *" : "Phone *"}
                    dir="ltr"
                    autoComplete="tel"
                    className="w-full h-11 rounded-xl bg-black/5 border border-black/10 px-4 text-[#2a2628] text-sm placeholder:text-[#9A969A] text-left focus:border-[#B8D900] focus:outline-none focus:ring-2 focus:ring-[#B8D900]/30 transition-all"
                    aria-required="true"
                    aria-invalid={!!errors.phone}
                    aria-describedby={errors.phone ? "popup_phone_error" : undefined}
                  />
                  {errors.phone && (
                    <p id="popup_phone_error" role="alert" className="text-red-500 text-xs mt-1 font-medium">
                      {errors.phone}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="popup_email" className="sr-only">
                    {isRtl ? "אימייל" : "Email"}
                  </label>
                  <input
                    id="popup_email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder={isRtl ? "אימייל" : "Email"}
                    dir="ltr"
                    autoComplete="email"
                    className="w-full h-11 rounded-xl bg-black/5 border border-black/10 px-4 text-[#2a2628] text-sm placeholder:text-[#9A969A] text-left focus:border-[#B8D900] focus:outline-none focus:ring-2 focus:ring-[#B8D900]/30 transition-all"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "popup_email_error" : undefined}
                  />
                  {errors.email && (
                    <p id="popup_email_error" role="alert" className="text-red-500 text-xs mt-1 font-medium">
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl font-heading font-bold text-base transition-all duration-300 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ backgroundColor: content.accent_color, color: "#2a2628" }}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {isRtl ? "שולח..." : "Sending..."}
                    </span>
                  ) : (
                    content.cta_text_he
                  )}
                </button>
              </form>
            </>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Mode: Inline form — success message                              */}
          {/* ---------------------------------------------------------------- */}
          {content.include_form && submitSuccess && (
            <div className="py-4 text-center">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: content.accent_color }}>
                <svg className="w-6 h-6 text-[#2a2628]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-heading text-lg font-bold text-[#2a2628]">
                {isRtl ? "הפרטים נשלחו בהצלחה!" : "Details sent successfully!"}
              </p>
              <p className="font-heebo text-[#716C70] text-sm mt-1">
                {isRtl ? "ניצור איתכם קשר בהקדם" : "We will contact you soon"}
              </p>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Mode: WhatsApp / Standard CTA button                             */}
          {/* ---------------------------------------------------------------- */}
          {!content.include_form && (
            <button
              onClick={handleCtaClick}
              className="w-full py-3 rounded-xl font-heading font-bold text-base transition-all duration-300 active:scale-[0.98]"
              style={{ backgroundColor: content.accent_color, color: "#2a2628" }}
            >
              {content.cta_text_he}
            </button>
          )}

          {/* Dismiss text button */}
          <button
            onClick={onDismiss}
            className="w-full py-2 mt-3 text-xs text-[#9A969A] hover:text-[#716C70] transition-colors"
          >
            {content.dismiss_text_he}
          </button>
        </div>
      </div>
    </div>
  );
}
