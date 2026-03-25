"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";

// ============================================================================
// CTA Modal Context - allows any component to open/close the form modal
// ============================================================================

interface CtaModalContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const CtaModalContext = createContext<CtaModalContextType>({
  isOpen: false,
  open: () => {},
  close: () => {},
});

export function useCtaModal() {
  return useContext(CtaModalContext);
}

export function CtaModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <CtaModalContext.Provider value={{ isOpen, open, close }}>
      {children}
    </CtaModalContext.Provider>
  );
}

// ============================================================================
// CTA Modal Component
// ============================================================================

interface CtaModalProps {
  pageId?: string;
  programId?: string;
  programName?: string;
}

export function CtaModal({ pageId, programId, programName }: CtaModalProps) {
  const { isOpen, close } = useCtaModal();
  const [formData, setFormData] = useState({ full_name: "", phone: "", email: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    if (isOpen) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, close]);

  // Cookie setup
  useEffect(() => {
    if (!document.cookie.includes("onoleads_id=")) {
      const cookieId = crypto.randomUUID();
      document.cookie = `onoleads_id=${cookieId}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
    }
  }, []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.full_name.trim() || formData.full_name.trim().length < 2) {
      newErrors.full_name = "שדה חובה";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "שדה חובה";
    } else if (!/^[\d\-+() ]{7,15}$/.test(formData.phone.trim())) {
      newErrors.phone = "טלפון לא תקין";
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "אימייל לא תקין";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      const cookieId = document.cookie
        .split("; ")
        .find((c) => c.startsWith("onoleads_id="))
        ?.split("=")[1] || "";

      const urlParams = new URLSearchParams(window.location.search);

      const payload = {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        page_id: pageId || null,
        program_id: programId || null,
        program_interest: programName || null,
        utm_source: urlParams.get("utm_source"),
        utm_medium: urlParams.get("utm_medium"),
        utm_campaign: urlParams.get("utm_campaign"),
        utm_content: urlParams.get("utm_content"),
        utm_term: urlParams.get("utm_term"),
        referrer: document.referrer || null,
        cookie_id: cookieId,
        device_type: window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop",
      };

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSubmitted(true);
      }
    } catch (err) {
      console.error("Form submission failed:", err);
    }
    setSubmitting(false);
  };

  const handleClose = () => {
    close();
    // Reset after animation
    setTimeout(() => {
      if (submitted) {
        setSubmitted(false);
        setFormData({ full_name: "", phone: "", email: "" });
        setErrors({});
      }
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 mb-0 md:mb-0 animate-fade-in-up">
        <div className="bg-[#2a2628] rounded-t-3xl md:rounded-3xl border border-white/10 shadow-[0_-8px_60px_rgba(0,0,0,0.5)] overflow-hidden">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 left-4 z-20 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="סגור"
          >
            <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Green accent top */}
          <div className="h-1 bg-gradient-to-l from-[#B8D900] via-[#c8e920] to-[#B8D900]" />

          <div className="p-6 md:p-8">
            {submitted ? (
              /* Thank you state */
              <div className="text-center py-6 animate-scale-in">
                <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-[#B8D900]/20 flex items-center justify-center">
                  <svg className="w-10 h-10 text-[#B8D900]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" className="animate-check-draw" />
                  </svg>
                </div>
                <h3 className="font-heading text-2xl font-extrabold text-white mb-2">
                  תודה רבה!
                </h3>
                <p className="text-white/60 text-base mb-1">
                  יועץ לימודים יחזור אליכם בהקדם
                </p>
                <p className="text-white/30 text-sm">
                  הקריה האקדמית אונו
                </p>
                <button
                  onClick={handleClose}
                  className="mt-6 px-8 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
                >
                  סגור
                </button>
              </div>
            ) : (
              /* Form state */
              <>
                <div className="text-center mb-6">
                  <h3 className="font-heading text-2xl font-extrabold text-white mb-1">
                    קבלו מידע מלא
                  </h3>
                  {programName && (
                    <p className="text-[#B8D900] font-medium text-sm">
                      {programName}
                    </p>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
                  {/* Full Name */}
                  <div>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="שם מלא *"
                      className="w-full h-13 rounded-xl bg-white/8 border border-white/15 px-4 text-white text-base placeholder:text-white/35 focus:border-[#B8D900] focus:bg-white/12 focus:outline-none focus:ring-2 focus:ring-[#B8D900]/30 transition-all"
                    />
                    {errors.full_name && (
                      <p className="text-red-400 text-xs mt-1.5 font-medium">{errors.full_name}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="טלפון *"
                      dir="ltr"
                      className="w-full h-13 rounded-xl bg-white/8 border border-white/15 px-4 text-white text-base placeholder:text-white/35 text-left focus:border-[#B8D900] focus:bg-white/12 focus:outline-none focus:ring-2 focus:ring-[#B8D900]/30 transition-all"
                    />
                    {errors.phone && (
                      <p className="text-red-400 text-xs mt-1.5 font-medium">{errors.phone}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="אימייל"
                      dir="ltr"
                      className="w-full h-13 rounded-xl bg-white/8 border border-white/15 px-4 text-white text-base placeholder:text-white/35 text-left focus:border-[#B8D900] focus:bg-white/12 focus:outline-none focus:ring-2 focus:ring-[#B8D900]/30 transition-all"
                    />
                    {errors.email && (
                      <p className="text-red-400 text-xs mt-1.5 font-medium">{errors.email}</p>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-14 rounded-xl bg-[#B8D900] text-[#2a2628] font-heading font-bold text-lg transition-all duration-300 hover:bg-[#c8e920] hover:shadow-[0_0_30px_rgba(184,217,0,0.4)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        שולח...
                      </span>
                    ) : (
                      "שלחו לי מידע"
                    )}
                  </button>
                </form>

                {/* Trust indicators */}
                <div className="flex items-center justify-center gap-4 mt-5 text-white/30 text-xs">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    ללא התחייבות
                  </span>
                  <span className="w-px h-3 bg-white/15" />
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    פרטיותכם מובטחת
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Floating CTA Button
// ============================================================================

export function FloatingCtaButton() {
  const { open } = useCtaModal();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 600);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <button
      onClick={open}
      className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#B8D900] text-[#2a2628] font-heading font-bold text-sm shadow-[0_4px_25px_rgba(184,217,0,0.4)] hover:shadow-[0_4px_35px_rgba(184,217,0,0.6)] hover:scale-105 transition-all duration-500 ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-20 opacity-0 pointer-events-none"
      }`}
      aria-label="השאירו פרטים"
    >
      <span>השאירו פרטים</span>
      <svg className="w-4 h-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6l6 6-6 6" />
      </svg>
    </button>
  );
}
