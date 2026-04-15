"use client";

/**
 * FormSection — inline lead capture form on landing pages.
 * Includes full bot-protection suite (CSRF, form token, behavior score, honeypot)
 * and multi-platform click-ID attribution, matching the CTA modal's payload.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Language } from "@/lib/types/database";
import { getLeadClickIds } from "@/lib/analytics/click-ids";
import { generateEventId } from "@/lib/analytics/event-id";

interface FormField {
  name: string;
  type: "text" | "email" | "tel" | "select";
  label_he: string;
  label_en: string;
  label_ar?: string;
  required: boolean;
  options?: string[];
}

interface FormSectionProps {
  content: Record<string, unknown>;
  language: Language;
  pageId?: string;
  programId?: string;
  pageSlug?: string;
}

export function FormSection({ content, language, pageId, programId, pageSlug }: FormSectionProps) {
  const router = useRouter();
  const isRtl = language === "he" || language === "ar";
  const heading = (content[`heading_${language}`] as string) || (content.heading_he as string) || (isRtl ? "השאירו פרטים ונחזור אליכם" : "Leave your details");
  const subheading = (content[`subheading_${language}`] as string) || (content.subheading_he as string) || (isRtl ? "יועץ לימודים אישי יחזור אליכם בקרוב" : "");
  const submitText = (content[`submit_text_${language}`] as string) || (content.submit_text_he as string) || (isRtl ? "שלחו לי מידע מלא" : "Send me full info");
  const thankYouMessage = (content[`thank_you_message_${language}`] as string) || (content.thank_you_message_he as string) || "";

  const fields: FormField[] = Array.isArray(content.fields) ? (content.fields as FormField[]) : [
    { name: "full_name", type: "text", label_he: "שם מלא", label_en: "Full Name", required: true },
    { name: "phone", type: "tel", label_he: "טלפון", label_en: "Phone", required: true },
    { name: "email", type: "email", label_he: "אימייל", label_en: "Email", required: false },
  ];

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldValid, setFieldValid] = useState<Record<string, boolean>>({});
  const [apiError, setApiError] = useState(false);
  const [apiErrorMsg, setApiErrorMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  /** Draft session-storage key — unique per page, never sent to server */
  const draftKey = `fs_draft_${pageSlug || pageId || "default"}`;

  /** Bot-protection state */
  const [csrfToken, setCsrfToken] = useState("");
  const [formToken, setFormToken] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const formMountTimeRef = useRef<number>(Date.now());
  const hasKeystrokeRef = useRef(false);
  const hasInteractionRef = useRef(false);

  /** Computes a 0–100 behavioral score from dwell time, keystrokes, and interaction */
  const computeBehaviorScore = useCallback((): number => {
    const dwell = Date.now() - formMountTimeRef.current;
    const dwellScore = dwell < 2000 ? 0 : dwell < 5000 ? 40 : 60;
    const keystrokeScore = hasKeystrokeRef.current ? 30 : 0;
    const interactionScore = hasInteractionRef.current ? 10 : 0;
    return Math.min(dwellScore + keystrokeScore + interactionScore, 100);
  }, []);

  // Cookie setup + CSRF + form token + behavioral tracking + draft restore
  useEffect(() => {
    if (!document.cookie.includes("onoleads_id=")) {
      const cookieId = crypto.randomUUID();
      document.cookie = `onoleads_id=${cookieId}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
    }

    // Restore draft from sessionStorage (local only, never transmitted)
    try {
      const saved = sessionStorage.getItem(draftKey);
      if (saved) setFormData(JSON.parse(saved));
    } catch { /* ignore */ }

    // Read CSRF token from cookie (set by middleware)
    const csrf = document.cookie
      .split("; ")
      .find((c) => c.startsWith("csrf_token="))
      ?.split("=")[1] || "";
    setCsrfToken(csrf);

    // Generate time-based form token
    const token = { t: Date.now(), n: crypto.randomUUID() };
    setFormToken(btoa(JSON.stringify(token)));

    // Record mount time for dwell-time scoring
    formMountTimeRef.current = Date.now();

    // Track mouse/touch interaction (bots have none)
    const handleInteraction = () => { hasInteractionRef.current = true; };
    window.addEventListener("mousemove", handleInteraction, { once: true });
    window.addEventListener("touchstart", handleInteraction, { once: true });

    return () => {
      window.removeEventListener("mousemove", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
    };
  }, []);

  // Scroll reveal
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const getLabel = (field: FormField) => {
    return (field[`label_${language}` as keyof FormField] as string) || field.label_he || field.name;
  };

  /**
   * Formats an Israeli phone number with a dash (052-8742573).
   * Only applies to numbers starting with 0 and 9–10 digits total.
   * International numbers (+XX...) are left untouched.
   */
  const formatPhone = (value: string): string => {
    const digits = value.replace(/\D/g, "");
    if (!digits.startsWith("0") || digits.length < 9 || digits.length > 10) return value;
    if (digits.length === 10 && digits.startsWith("05")) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    if (digits.length === 9) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return value;
  };

  /** Updates a field value, auto-saves draft, clears error, tracks keystrokes */
  const handleChange = (fieldName: string, rawValue: string) => {
    hasKeystrokeRef.current = true;
    const value = fieldName === "phone" ? rawValue : rawValue; // formatter applied on blur
    const next = { ...formData, [fieldName]: value };
    setFormData(next);
    // Save draft locally (sessionStorage) — never sent to server
    try { sessionStorage.setItem(draftKey, JSON.stringify(next)); } catch { /* ignore */ }
    if (errors[fieldName]) setErrors((prev) => { const e = { ...prev }; delete e[fieldName]; return e; });
    if (fieldValid[fieldName]) setFieldValid((prev) => { const v = { ...prev }; delete v[fieldName]; return v; });
    if (apiError) { setApiError(false); setApiErrorMsg(null); }
  };

  /** On blur: format phone, validate inline, mark field as touched + valid/invalid */
  const handleBlur = (field: FormField) => {
    const value = (formData[field.name] || "").trim();
    setTouched((prev) => ({ ...prev, [field.name]: true }));

    // Apply Israeli phone formatting on blur
    if (field.type === "tel" && value) {
      const formatted = formatPhone(value);
      if (formatted !== value) {
        const next = { ...formData, [field.name]: formatted };
        setFormData(next);
        try { sessionStorage.setItem(draftKey, JSON.stringify(next)); } catch { /* ignore */ }
      }
    }

    // Inline validity check (show ✓ when valid)
    let valid = true;
    if (field.required && !value) valid = false;
    if (field.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) valid = false;
    if (field.type === "tel" && value && !/^[\d\-+() ]{7,15}$/.test(value)) valid = false;
    setFieldValid((prev) => ({ ...prev, [field.name]: valid && !!value }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    fields.forEach((field) => {
      const value = (formData[field.name] || "").trim();

      if (field.required && !value) {
        newErrors[field.name] = isRtl ? "שדה חובה" : "Required";
      }

      if (field.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        newErrors[field.name] = isRtl ? "אימייל לא תקין" : "Invalid email";
      }

      if (field.type === "tel" && value && !/^[\d\-+() ]{7,15}$/.test(value)) {
        newErrors[field.name] = isRtl ? "טלפון לא תקין" : "Invalid phone";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setApiError(false);
    setApiErrorMsg(null);

    try {
      const cookieId = document.cookie
        .split("; ")
        .find((c) => c.startsWith("onoleads_id="))
        ?.split("=")[1] || "";

      const urlParams = new URLSearchParams(window.location.search);

      /* UTM cookie persistence — store on first visit, reuse on subsequent */
      const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
      const utmFromUrl: Record<string, string> = {};
      for (const k of UTM_KEYS) {
        const v = urlParams.get(k);
        if (v) utmFromUrl[k] = v;
      }
      const hasUrlUtm = Object.keys(utmFromUrl).length > 0;

      let storedUtm: Record<string, string> = {};
      const storedUtmCookie = document.cookie.split("; ").find((c) => c.startsWith("ono_utm="))?.split("=").slice(1).join("=") || "";
      if (storedUtmCookie) {
        try { storedUtm = JSON.parse(decodeURIComponent(storedUtmCookie)); } catch { /* ignore */ }
      }
      if (hasUrlUtm) {
        const utmJson = encodeURIComponent(JSON.stringify(utmFromUrl));
        document.cookie = `ono_utm=${utmJson}; path=/; max-age=${90 * 24 * 60 * 60}; SameSite=Lax`;
        storedUtm = utmFromUrl;
      }

      /* Click IDs + dedup event ID */
      const clickIds = getLeadClickIds();
      const eventId = generateEventId("lead_submit", pageId || "unknown", cookieId);

      const payload = {
        full_name: (formData.full_name || "").trim(),
        phone: (formData.phone || "").trim() || null,
        email: (formData.email || "").trim() || null,
        page_id: pageId || null,
        page_slug: pageSlug || null,
        program_id: programId || null,
        program_interest: formData.program_interest || null,
        utm_source: utmFromUrl.utm_source || storedUtm.utm_source || null,
        utm_medium: utmFromUrl.utm_medium || storedUtm.utm_medium || null,
        utm_campaign: utmFromUrl.utm_campaign || storedUtm.utm_campaign || null,
        utm_content: utmFromUrl.utm_content || storedUtm.utm_content || null,
        utm_term: utmFromUrl.utm_term || storedUtm.utm_term || null,
        referrer: document.referrer || null,
        cookie_id: cookieId,
        device_type: window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop",
        /* Security fields — required by /api/leads */
        csrf_token: csrfToken,
        form_token: formToken,
        behavior_score: computeBehaviorScore(),
        website: honeypot,
        /* Attribution */
        lead_source: "form_section",
        event_id: eventId,
        marketing_consent: true,
        ...clickIds,
        fbp: (() => {
          const fbpCookie = document.cookie.split("; ").find(c => c.startsWith("_fbp="));
          return fbpCookie ? fbpCookie.split("=").slice(1).join("=") : null;
        })(),
        ga_client_id: (() => {
          const gaCookie = document.cookie.split("; ").find(c => c.startsWith("_ga="));
          return gaCookie ? gaCookie.split("=").slice(1).join("=") : null;
        })(),
      };

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        /* Store event_id for TY page pixel deduplication */
        sessionStorage.setItem("ty_event_id", eventId);
        const fullName = (formData.full_name || "").trim();
        if (fullName) sessionStorage.setItem("ty_name", fullName);
        if (formData.email) sessionStorage.setItem("ty_email", formData.email);
        if (formData.phone) sessionStorage.setItem("ty_phone", formData.phone);
        /* Record submit time for 15-second session cooldown */
        sessionStorage.setItem("last_lead_submit", Date.now().toString());
        // Clear saved draft on successful submission
        try { sessionStorage.removeItem(draftKey); } catch { /* ignore */ }
        /* Redirect to the thank-you page — fires conversion pixel (same flow as CTA modal) */
        const tyUrl = pageSlug ? `/ty?slug=${encodeURIComponent(pageSlug)}` : "/ty";
        router.push(tyUrl);
      } else {
        const errorData = await res.json().catch(() => null);
        setApiErrorMsg(errorData?.error || null);
        setApiError(true);
      }
    } catch (err) {
      console.error("Form submission failed:", err);
      setApiError(true);
    } finally {
      setSubmitting(false);
    }
  };

  // Thank you state
  if (submitted) {
    return (
      <section id="form" className="py-20 md:py-28 relative overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#2a2628] via-[#3a3638] to-[#2a2628]" />
        <div className="relative z-10 max-w-lg mx-auto px-5 text-center">
          <div className="animate-scale-in">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#B8D900]/20 flex items-center justify-center">
              <svg className="w-12 h-12 text-[#B8D900]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" className="animate-check-draw" />
              </svg>
            </div>
            <h3 className="font-heading text-3xl font-extrabold text-white mb-3">
              {thankYouMessage || (isRtl ? "תודה רבה!" : "Thank you!")}
            </h3>
            <p className="text-white/70 text-lg">
              {isRtl ? "נציג יחזור אליכם בהקדם" : "We'll be in touch soon"}
            </p>
            <p className="text-white/40 text-sm mt-4">
              {isRtl ? "הקריה האקדמית אונו - המכללה המומלצת בישראל" : "Ono Academic College"}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="form"
      ref={sectionRef}
      className="py-20 md:py-28 relative overflow-hidden bg-mesh-light"
      dir={isRtl ? "rtl" : "ltr"}
    >

      <div className="relative z-10 max-w-xl mx-auto px-5">
        {/* Header */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center gap-3 mb-5 opacity-0"
            style={{ animation: inView ? "blur-in 0.6s var(--ease-out-expo) forwards" : "none" }}
          >
            <div className="w-8 h-0.5 bg-[#B8D900] rounded-full" />
            <span className="px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold font-heebo border border-[#B8D900]/20">
              {isRtl ? "הרשמה" : "Register"}
            </span>
            <div className="w-8 h-0.5 bg-[#B8D900] rounded-full" />
          </div>
          {heading && (
            <h2
              className="font-heading text-3xl md:text-4xl font-extrabold text-[#2a2628] mb-3 opacity-0"
              style={{ animation: inView ? "slide-up-spring 0.7s var(--ease-out-expo) 0.1s forwards" : "none" }}
            >
              {heading}
            </h2>
          )}
          {subheading && (
            <p
              className="text-[#5A5658] text-lg opacity-0"
              style={{ animation: inView ? "slide-up-spring 0.7s var(--ease-out-expo) 0.2s forwards" : "none" }}
            >
              {subheading}
            </p>
          )}
        </div>

        {/* Form Card */}
        <div
          className="opacity-0"
          style={{ animation: inView ? "slide-up-spring 0.7s var(--ease-out-expo) 0.3s forwards" : "none" }}
        >
          <form
            onSubmit={handleSubmit}
            className="bg-white/80 backdrop-blur-2xl rounded-3xl border border-gray-100/80 card-premium gradient-border-green p-7 md:p-10"
          >
            {/* Progress steps (item 9) */}
            <div className="flex items-center justify-center gap-2 mb-7">
              {[
                { he: "מלאו פרטים", en: "Fill Details", ar: "أدخل التفاصيل" },
                { he: "שיחת ייעוץ", en: "Advisory Call", ar: "مكالمة استشارية" },
                { he: "התחלת לימודים", en: "Begin Studies", ar: "ابدأ الدراسة" },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${i === 0 ? "bg-[#B8D900] text-[#2a2628]" : "bg-gray-100 text-[#767276]"}`}>
                      {i + 1}
                    </div>
                    <span className={`text-[11px] font-medium whitespace-nowrap ${i === 0 ? "text-[#2a2628]" : "text-[#767276]"}`}>
                      {language === "en" ? step.en : language === "ar" ? step.ar : step.he}
                    </span>
                  </div>
                  {i < 2 && <span className="text-[#767276]/40 text-xs mx-0.5">›</span>}
                </div>
              ))}
            </div>

            <div className="space-y-5">
              {fields.map((field) => {
                /* Stable per-field id so the <label> can be associated with its
                 * input via htmlFor. WCAG 1.3.1 + 4.1.2 — clicking the label
                 * focuses the input and screen readers announce the label. */
                const fieldId = `form-field-${field.name}`;
                const errorId = `${fieldId}-error`;
                return (
                <div key={field.name}>
                  <label htmlFor={fieldId} className="block text-[#2a2628] text-sm font-medium mb-2">
                    {getLabel(field)}
                    {field.required && <span className={`text-[#B8D900] ${isRtl ? "mr-1" : "ml-1"}`}>*</span>}
                  </label>

                  {field.type === "select" ? (
                    <select
                      id={fieldId}
                      value={formData[field.name] || ""}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      onBlur={() => handleBlur(field)}
                      aria-required={field.required || undefined}
                      aria-invalid={errors[field.name] ? true : undefined}
                      aria-describedby={errors[field.name] ? errorId : undefined}
                      required={field.required}
                      className={`w-full h-14 rounded-xl bg-white border px-5 text-[#2a2628] text-base focus:border-[#B8D900] focus:outline-none focus:ring-2 focus:ring-[#B8D900]/30 transition-all appearance-none ${errors[field.name] ? "border-red-400/60" : fieldValid[field.name] ? "border-[#B8D900]/50" : "border-gray-200"}`}
                    >
                      <option value="">{isRtl ? "בחרו..." : "Select..."}</option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="relative">
                      <input
                        id={fieldId}
                        type={field.type}
                        value={formData[field.name] || ""}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        onBlur={() => handleBlur(field)}
                        dir={field.type === "tel" || field.type === "email" ? "ltr" : undefined}
                        aria-required={field.required || undefined}
                        aria-invalid={errors[field.name] ? true : undefined}
                        aria-describedby={errors[field.name] ? errorId : undefined}
                        required={field.required}
                        className={`w-full h-14 rounded-xl bg-white border px-5 ${(field.type === "tel" || field.type === "email") ? "pr-10" : ""} text-[#2a2628] text-base placeholder:text-[#767276] focus:border-[#B8D900] focus:outline-none focus:ring-2 focus:ring-[#B8D900]/30 transition-all ${errors[field.name] ? "border-red-400/60" : fieldValid[field.name] ? "border-[#B8D900]/50" : "border-gray-200"}`}
                        placeholder={getLabel(field)}
                      />
                      {/* Inline ✓ on valid blur — phone & email only, positioned at input end */}
                      {fieldValid[field.name] && (field.type === "tel" || field.type === "email") && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B8D900] pointer-events-none transition-opacity">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                    </div>
                  )}

                  {errors[field.name] && (
                    <p id={errorId} role="alert" className="text-red-500 text-xs mt-2 font-medium flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {errors[field.name]}
                    </p>
                  )}
                </div>
                );
              })}
            </div>

            {/* Honeypot field — hidden from humans, bots will auto-fill */}
            <div className="absolute opacity-0 -z-10" aria-hidden="true" tabIndex={-1}>
              <input
                type="text"
                name="website"
                autoComplete="off"
                tabIndex={-1}
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            {/* API error feedback */}
            {apiError && (
              <div className="mt-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {apiErrorMsg || (isRtl ? "שגיאה בשליחת הטופס. אנא נסו שוב." : "Error submitting form. Please try again.")}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-16 mt-8 rounded-2xl bg-[#B8D900] text-[#2a2628] font-heading font-bold text-xl transition-all duration-300 hover:bg-[#c8e920] hover:shadow-[var(--shadow-green)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {isRtl ? "שולח..." : "Sending..."}
                </span>
              ) : (
                submitText
              )}
            </button>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
              <div className="flex items-center gap-1.5 text-[#5A5658] text-xs">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>{isRtl ? "פרטיכם מאובטחים" : "Your data is secure"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#5A5658] text-xs">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>{isRtl ? "ללא התחייבות" : "No commitment"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#5A5658] text-xs">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>{isRtl ? "100% פרטיות" : "100% privacy"}</span>
              </div>
            </div>

            {/* What happens next? (item 13) */}
            <div className="mt-8 pt-6 border-t border-gray-200/60">
              <p className="text-center text-[#767276] text-[11px] uppercase tracking-widest mb-4">
                {language === "en" ? "What happens next?" : language === "ar" ? "ماذا يحدث بعد ذلك؟" : "מה קורה אחרי?"}
              </p>
              <div className="space-y-3">
                {[
                  {
                    he: "קיבלנו את פרטיכם בהצלחה",
                    en: "We received your details",
                    ar: "استلمنا بياناتك",
                    done: true,
                  },
                  {
                    he: "יועץ לימודים יחזור אליכם בקרוב",
                    en: "An advisor will contact you shortly",
                    ar: "مستشار سيتواصل معك قريبًا",
                    done: false,
                  },
                  {
                    he: "נתחיל לתכנן את המסלול שלכם",
                    en: "We'll plan your academic path together",
                    ar: "سنخطط مسارك الأكاديمي معاً",
                    done: false,
                  },
                ].map((step, i) => (
                  <div key={i} className={`flex items-center gap-3 ${isRtl ? "flex-row-reverse text-right" : ""}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${step.done ? "bg-[#B8D900]/20 text-[#5a7200]" : "bg-gray-100 text-[#767276]"}`}>
                      {step.done
                        ? <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        : i + 1}
                    </div>
                    <span className={`text-xs ${step.done ? "text-[#5A5658]" : "text-[#767276]"}`}>
                      {language === "en" ? step.en : language === "ar" ? step.ar : step.he}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Security badge (item 14) — very subtle */}
            <p className="text-center text-[#767276]/60 text-[10px] mt-4 flex items-center justify-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              {language === "en" ? "Secured with SSL 256-bit encryption" : language === "ar" ? "مؤمّن بتشفير SSL 256-bit" : "מאובטח בהצפנת SSL 256-bit"}
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
