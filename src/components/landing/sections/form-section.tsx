"use client";

import { useState, useEffect } from "react";
import type { Language } from "@/lib/types/database";

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
}

export function FormSection({ content, language, pageId, programId }: FormSectionProps) {
  const isRtl = language === "he" || language === "ar";
  const heading = (content[`heading_${language}`] as string) || (content.heading_he as string) || "";
  const submitText = (content[`submit_text_${language}`] as string) || (content.submit_text_he as string) || "שלחו לי פרטים";
  const thankYouMessage = (content[`thank_you_message_${language}`] as string) || (content.thank_you_message_he as string) || "";

  const fields: FormField[] = (content.fields as FormField[]) || [
    { name: "full_name", type: "text", label_he: "שם מלא", label_en: "Full Name", required: true },
    { name: "phone", type: "tel", label_he: "טלפון", label_en: "Phone", required: true },
    { name: "email", type: "email", label_he: "אימייל", label_en: "Email", required: false },
  ];

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Generate first-party cookie on mount
  useEffect(() => {
    if (!document.cookie.includes("onoleads_id=")) {
      const cookieId = crypto.randomUUID();
      document.cookie = `onoleads_id=${cookieId}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
    }
  }, []);

  const getLabel = (field: FormField) => {
    return (field[`label_${language}` as keyof FormField] as string) || field.label_he || field.name;
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

    try {
      const cookieId = document.cookie
        .split("; ")
        .find((c) => c.startsWith("onoleads_id="))
        ?.split("=")[1] || "";

      const urlParams = new URLSearchParams(window.location.search);

      const payload = {
        full_name: formData.full_name || "",
        phone: formData.phone || null,
        email: formData.email || null,
        page_id: pageId || null,
        program_id: programId || null,
        program_interest: formData.program_interest || null,
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

  if (submitted) {
    return (
      <section id="form" className="py-16 md:py-20 bg-white" dir={isRtl ? "rtl" : "ltr"}>
        <div className="max-w-lg mx-auto px-5 text-center">
          <div className="animate-fade-in-up">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#B8D900]/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-[#B8D900]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-[#4A4648] mb-3">
              {thankYouMessage || (isRtl ? "תודה! נציג יחזור אליך בהקדם" : "Thank you! We'll be in touch soon")}
            </h3>
            <p className="text-[#716C70]">
              {isRtl ? "הקריה האקדמית אונו - המכללה המומלצת בישראל" : "Ono Academic College"}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="form" className="py-16 md:py-20 bg-white" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-lg mx-auto px-5">
        {heading && (
          <h2 className="text-2xl md:text-3xl font-bold text-[#4A4648] text-center mb-8">
            {heading}
          </h2>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-[0_4px_40px_rgba(0,0,0,0.08)] border border-gray-100 p-6 md:p-8 space-y-5"
        >
          {fields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-semibold text-[#4A4648] mb-2">
                {getLabel(field)}
                {field.required && <span className="text-red-500 mr-1">*</span>}
              </label>

              {field.type === "select" ? (
                <select
                  value={formData[field.name] || ""}
                  onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                  className="w-full h-12 rounded-xl border-2 border-gray-200 bg-gray-50/50 px-4 text-[#4A4648] text-base transition-all duration-200 focus:border-[#B8D900] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B8D900]/20"
                >
                  <option value="">{isRtl ? "בחרו..." : "Select..."}</option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  value={formData[field.name] || ""}
                  onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                  dir={field.type === "tel" || field.type === "email" ? "ltr" : undefined}
                  className="w-full h-12 rounded-xl border-2 border-gray-200 bg-gray-50/50 px-4 text-[#4A4648] text-base transition-all duration-200 focus:border-[#B8D900] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B8D900]/20 placeholder:text-gray-400"
                  placeholder={getLabel(field)}
                />
              )}

              {errors[field.name] && (
                <p className="text-red-500 text-xs mt-1.5 font-medium">{errors[field.name]}</p>
              )}
            </div>
          ))}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-14 rounded-xl bg-[#B8D900] text-[#2a2628] font-bold text-lg transition-all duration-200 hover:bg-[#c8e920] hover:shadow-[0_4px_20px_rgba(184,217,0,0.3)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#B8D900]/50"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
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

          <p className="text-center text-xs text-[#716C70] mt-3">
            {isRtl
              ? "הפרטים מאובטחים ולא יועברו לצד שלישי"
              : "Your details are secure and will not be shared"}
          </p>
        </form>
      </div>
    </section>
  );
}
