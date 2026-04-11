"use client";

/**
 * Contact Info Section — clean contact details block with icons.
 *
 * Shows phone, email, address, opening hours, and (optionally) social
 * links. Each item is clickable (tel:, mailto:, maps link). Optional
 * CTA button at the bottom opens the lead form modal.
 */

import { useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/types/database";
import { useCtaModal } from "../cta-modal";

interface ContactInfoSectionProps {
  content: Record<string, unknown>;
  language: Language;
}

export function ContactInfoSection({ content, language }: ContactInfoSectionProps) {
  const { open } = useCtaModal();
  const isRtl = language === "he" || language === "ar";

  const heading =
    (content[`heading_${language}`] as string) ||
    (content.heading_he as string) ||
    (isRtl ? "צרו איתנו קשר" : "Contact Us");

  const subheading =
    (content[`subheading_${language}`] as string) ||
    (content.subheading_he as string) ||
    "";

  const phone = (content.phone as string) || "";
  const email = (content.email as string) || "";
  const address =
    (content[`address_${language}`] as string) ||
    (content.address_he as string) ||
    "";
  const hours =
    (content[`hours_${language}`] as string) ||
    (content.hours_he as string) ||
    "";
  const mapUrl = (content.map_url as string) || "";

  const ctaText =
    (content[`cta_text_${language}`] as string) ||
    (content.cta_text_he as string) ||
    (isRtl ? "השאירו פרטים ונחזור אליכם" : "Leave Details — We'll Call You Back");

  const ctaEnabled = content.cta_enabled !== false;

  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /** Build the list of contact items, skipping any that are empty */
  const items: Array<{
    icon: JSX.Element;
    label: string;
    value: string;
    href?: string;
  }> = [];
  if (phone) {
    items.push({
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
        </svg>
      ),
      label: isRtl ? "טלפון" : "Phone",
      value: phone,
      href: `tel:${phone.replace(/[^\d+]/g, "")}`,
    });
  }
  if (email) {
    items.push({
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      ),
      label: isRtl ? "אימייל" : "Email",
      value: email,
      href: `mailto:${email}`,
    });
  }
  if (address) {
    items.push({
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
      ),
      label: isRtl ? "כתובת" : "Address",
      value: address,
      href: mapUrl || undefined,
    });
  }
  if (hours) {
    items.push({
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: isRtl ? "שעות פעילות" : "Hours",
      value: hours,
    });
  }

  return (
    <section
      ref={sectionRef}
      className="py-20 md:py-28 bg-gradient-to-b from-[#FAFAFA] to-white"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="max-w-5xl mx-auto px-5">
        {/* Header */}
        <div className="text-center mb-12">
          <h2
            className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#2a2628] opacity-0"
            style={{ animation: inView ? "fade-in-up 0.6s ease-out forwards" : "none" }}
          >
            {heading}
          </h2>
          {subheading && (
            <p
              className="mt-4 text-[#5A5658] font-heebo text-base md:text-lg max-w-2xl mx-auto opacity-0"
              style={{ animation: inView ? "fade-in-up 0.6s ease-out 0.1s forwards" : "none" }}
            >
              {subheading}
            </p>
          )}
        </div>

        {/* Contact items grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((item, index) => {
            const inner = (
              <>
                <div className="w-12 h-12 rounded-full bg-[#B8D900]/15 text-[#7a9400] flex items-center justify-center mb-4 shadow-[0_2px_6px_rgba(184,217,0,0.08)]">
                  {item.icon}
                </div>
                <p className="text-xs uppercase tracking-widest text-[#7A7678] font-heebo font-semibold mb-1">
                  {item.label}
                </p>
                <p className="font-heading text-base font-bold text-[#2a2628] leading-snug break-words">
                  {item.value}
                </p>
              </>
            );

            const baseClass =
              "block bg-white border border-gray-200/80 rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-all duration-300 hover:border-[#B8D900]/50 hover:shadow-[0_8px_30px_rgba(184,217,0,0.12)] hover:-translate-y-0.5 opacity-0";
            const animStyle = {
              animation: inView
                ? `fade-in-up 0.5s ease-out ${0.15 + index * 0.08}s forwards`
                : "none",
            };

            return item.href ? (
              <a
                key={index}
                href={item.href}
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className={baseClass}
                style={animStyle}
                dir={item.label === "Phone" || item.label === "אימייל" ? "ltr" : undefined}
              >
                {inner}
              </a>
            ) : (
              <div key={index} className={baseClass} style={animStyle}>
                {inner}
              </div>
            );
          })}
        </div>

        {/* CTA */}
        {ctaEnabled && (
          <div
            className="text-center mt-14 opacity-0"
            style={{
              animation: inView
                ? `fade-in-up 0.6s ease-out ${0.3 + items.length * 0.08}s forwards`
                : "none",
            }}
          >
            <button
              onClick={() => open("section_contact_info")}
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[#B8D900] text-[#2a2628] font-heading font-bold text-base transition-all duration-300 hover:bg-[#c8e920] hover:shadow-[0_8px_30px_rgba(184,217,0,0.25)] hover:scale-[1.02] active:scale-[0.98]"
            >
              {ctaText}
              <svg
                className={`w-4 h-4 transition-transform ${
                  isRtl ? "group-hover:translate-x-1" : "group-hover:-translate-x-1"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={isRtl ? "M14 18l-6-6 6-6" : "M10 6l6 6-6 6"}
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
