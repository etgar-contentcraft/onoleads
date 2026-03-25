"use client";

/**
 * Faculty Section — displays a grid of faculty member cards with photos, names, titles,
 * and optional social/contact icon links. Supports animated entry on scroll.
 */

import { useEffect, useRef, useState } from "react";
import { Phone, Mail, Globe } from "lucide-react";
import type { Language } from "@/lib/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FacultyMember {
  library_id?: string;
  name_he: string;
  name_en?: string;
  name?: string;
  title_he?: string;
  title_en?: string;
  role?: string;
  image_url?: string;
  image?: string;
  phone?: string;
  email?: string;
  linkedin_url?: string;
  facebook_url?: string;
  instagram_url?: string;
  website_url?: string;
}

interface FacultySectionProps {
  content: Record<string, unknown>;
  language: Language;
}

// ---------------------------------------------------------------------------
// Social icon sub-components (inline SVGs to avoid extra dependencies)
// ---------------------------------------------------------------------------

/** LinkedIn logo SVG icon */
function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

/** Facebook logo SVG icon */
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

/** Instagram logo SVG icon */
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function FacultySection({ content, language }: FacultySectionProps) {
  const isRtl = language === "he" || language === "ar";
  const heading =
    (content[`heading_${language}`] as string) ||
    (content.heading_he as string) ||
    (isRtl ? "הסגל האקדמי" : "Faculty");
  const members: FacultyMember[] = (content.members as FacultyMember[]) || [];

  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Trigger animation once the section scrolls into the viewport
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

  if (members.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      className="py-20 md:py-28 bg-white"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="max-w-6xl mx-auto px-5">
        {/* Section header */}
        <div className="text-center mb-14">
          <div
            className="inline-flex items-center gap-3 mb-5 opacity-0"
            style={{
              animation: inView ? "fade-in-up 0.5s ease-out forwards" : "none",
            }}
          >
            <div className="w-8 h-0.5 bg-[#B8D900] rounded-full" />
            <span className="px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold font-heebo">
              {isRtl ? "צוות מרצים" : "Our Faculty"}
            </span>
            <div className="w-8 h-0.5 bg-[#B8D900] rounded-full" />
          </div>
          <h2
            className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#2a2628] opacity-0"
            style={{
              animation: inView
                ? "fade-in-up 0.6s ease-out 0.1s forwards"
                : "none",
            }}
          >
            {heading}
          </h2>
        </div>

        {/* Faculty member grid */}
        <div
          className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 md:gap-8 ${
            members.length <= 3 ? "max-w-3xl mx-auto" : ""
          }`}
        >
          {members.map((member, index) => {
            // Resolve display values with fallback priority
            const name =
              (member[`name_${language}` as keyof FacultyMember] as string) ||
              member.name_he ||
              member.name ||
              "";
            const title =
              (member[`title_${language}` as keyof FacultyMember] as string) ||
              member.title_he ||
              member.role ||
              "";
            const imageUrl = member.image_url || member.image || "";

            return (
              <div
                key={member.library_id ?? index}
                className="group text-center opacity-0"
                style={{
                  animation: inView
                    ? `fade-in-up 0.5s ease-out ${0.15 + index * 0.07}s forwards`
                    : "none",
                }}
              >
                {/* Photo container with hover effect */}
                <div className="relative mx-auto w-28 h-28 md:w-32 md:h-32 mb-4">
                  {imageUrl ? (
                    <div className="w-full h-full rounded-full overflow-hidden border-3 border-transparent group-hover:border-[#B8D900]/40 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.06)] group-hover:shadow-[0_8px_30px_rgba(184,217,0,0.15)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt={name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-[#B8D900]/15 to-[#B8D900]/5 flex items-center justify-center border-2 border-[#B8D900]/10 group-hover:border-[#B8D900]/30 transition-all duration-300">
                      <span className="font-heading font-bold text-3xl text-[#9ab800]">
                        {name.charAt(0)}
                      </span>
                    </div>
                  )}

                  {/* Green indicator dot */}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#B8D900]" />
                  </div>
                </div>

                {/* Name */}
                <h3 className="font-heading font-bold text-[#2a2628] text-base mb-1">
                  {name}
                </h3>

                {/* Title / bio */}
                {title && (
                  <p className="font-heebo text-[#716C70] text-xs leading-relaxed max-w-[180px] mx-auto mb-2">
                    {title}
                  </p>
                )}

                {/* Social / contact icon row — only renders icons whose value is truthy */}
                {(member.phone ||
                  member.email ||
                  member.linkedin_url ||
                  member.facebook_url ||
                  member.instagram_url ||
                  member.website_url) && (
                  <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                    {member.phone && (
                      <a
                        href={`tel:${member.phone}`}
                        title={member.phone}
                        className="text-[#716C70] hover:text-[#B8D900] transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                    {member.email && (
                      <a
                        href={`mailto:${member.email}`}
                        title={member.email}
                        className="text-[#716C70] hover:text-[#B8D900] transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Mail className="w-4 h-4" />
                      </a>
                    )}
                    {member.linkedin_url && (
                      <a
                        href={member.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="LinkedIn"
                        className="text-[#716C70] hover:text-[#B8D900] transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <LinkedInIcon className="w-4 h-4" />
                      </a>
                    )}
                    {member.facebook_url && (
                      <a
                        href={member.facebook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Facebook"
                        className="text-[#716C70] hover:text-[#B8D900] transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FacebookIcon className="w-4 h-4" />
                      </a>
                    )}
                    {member.instagram_url && (
                      <a
                        href={member.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Instagram"
                        className="text-[#716C70] hover:text-[#B8D900] transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <InstagramIcon className="w-4 h-4" />
                      </a>
                    )}
                    {member.website_url && (
                      <a
                        href={member.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="אתר אישי"
                        className="text-[#716C70] hover:text-[#B8D900] transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Globe className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
