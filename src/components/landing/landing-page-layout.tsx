"use client";

import { useEffect, useState } from "react";
import type { Language, PageSection } from "@/lib/types/database";
import { HeroSection } from "./sections/hero-section";
import { FormSection } from "./sections/form-section";
import { FaqSection } from "./sections/faq-section";
import { StatsSection } from "./sections/stats-section";
import { VideoSection } from "./sections/video-section";
import { TestimonialsSection } from "./sections/testimonials-section";
import { CtaSection } from "./sections/cta-section";
import { WhatsappSection } from "./sections/whatsapp-section";

// ============================================================================
// Constants
// ============================================================================

const ONO_LOGO = "https://www.ono.ac.il/wp-content/uploads/2025/12/לוגו-אונו.png";

// ============================================================================
// Types
// ============================================================================

interface LandingPageLayoutProps {
  sections: PageSection[];
  language: Language;
  pageId?: string;
  programId?: string;
  pageTitle?: string;
}

// ============================================================================
// Sticky Header
// ============================================================================

function StickyHeader({
  content,
  language,
}: {
  content: Record<string, unknown>;
  language: Language;
}) {
  const isRtl = language === "he" || language === "ar";
  const phone = (content.phone as string) || "*2899";
  const buttonText = (content[`button_text_${language}`] as string) || (content.button_text_he as string) || "השאירו פרטים";
  const buttonUrl = (content.button_url as string) || "#form";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 500);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        visible
          ? "translate-y-0 opacity-100"
          : "-translate-y-full opacity-0"
      }`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="bg-white/95 backdrop-blur-xl border-b border-gray-200/50 shadow-[0_2px_20px_rgba(0,0,0,0.08)]">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ONO_LOGO}
              alt="אונו"
              className="h-8 object-contain"
              loading="lazy"
            />
            <a
              href={`tel:${phone}`}
              className="hidden md:flex items-center gap-2 text-[#2a2628] font-bold text-sm hover:text-[#B8D900] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {phone}
            </a>
          </div>
          <a
            href={buttonUrl}
            className="inline-flex items-center px-6 py-2.5 rounded-xl bg-[#B8D900] text-[#2a2628] font-heading font-bold text-sm hover:bg-[#c8e920] hover:shadow-[0_0_20px_rgba(184,217,0,0.3)] transition-all duration-300 active:scale-[0.97]"
          >
            {buttonText}
          </a>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Accordion Section (built-in)
// ============================================================================

function AccordionSection({
  content,
  language,
}: {
  content: Record<string, unknown>;
  language: Language;
}) {
  const isRtl = language === "he" || language === "ar";
  const heading = (content[`heading_${language}`] as string) || (content.heading_he as string) || "";
  const items = (content.items as Array<{ title_he: string; title_en?: string; body_he: string; body_en?: string }>) || [];
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <section className="py-20 md:py-24 bg-white" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-3xl mx-auto px-5">
        {heading && (
          <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-[#2a2628] text-center mb-12">{heading}</h2>
        )}
        <div className="space-y-3">
          {items.map((item, index) => {
            const title = (item[`title_${language}` as keyof typeof item] as string) || item.title_he;
            const body = (item[`body_${language}` as keyof typeof item] as string) || item.body_he;
            const isOpen = openIndex === index;

            return (
              <div key={index} className="rounded-2xl border border-gray-200 overflow-hidden hover:border-[#B8D900]/40 transition-colors">
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between p-5 md:p-6 text-start hover:bg-gray-50/50 transition-colors"
                >
                  <span className="font-heading font-bold text-[#2a2628]">{title}</span>
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isOpen ? "bg-[#B8D900] rotate-180" : "bg-gray-100"
                  }`}>
                    <svg className={`w-4 h-4 ${isOpen ? "text-[#2a2628]" : "text-[#716C70]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-[1000px]" : "max-h-0"}`}>
                  <div className="px-5 md:px-6 pb-5 md:pb-6 text-[#716C70] leading-relaxed">{body}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Gallery Section (built-in)
// ============================================================================

function GallerySection({
  content,
  language,
}: {
  content: Record<string, unknown>;
  language: Language;
}) {
  const isRtl = language === "he" || language === "ar";
  const heading = (content[`heading_${language}`] as string) || (content.heading_he as string) || "";
  const images = (content.images as Array<{ url: string; alt_he?: string; alt_en?: string }>) || [];

  if (images.length === 0) return null;

  return (
    <section className="py-20 md:py-24 bg-white" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-6xl mx-auto px-5">
        {heading && (
          <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-[#2a2628] text-center mb-12">{heading}</h2>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((img, index) => (
            <div key={index} className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-gray-100 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={(img[`alt_${language}` as keyof typeof img] as string) || img.alt_he || ""}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Curriculum Section (built-in)
// ============================================================================

function CurriculumSection({
  content,
  language,
}: {
  content: Record<string, unknown>;
  language: Language;
}) {
  const isRtl = language === "he" || language === "ar";
  const heading = (content[`heading_${language}`] as string) || (content.heading_he as string) || "";
  const semesters = (content.semesters as Array<{
    title_he: string;
    title_en?: string;
    courses: Array<{ name_he: string; name_en?: string }>;
  }>) || [];

  if (semesters.length === 0) return null;

  return (
    <section className="py-20 md:py-24 bg-gray-50" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto px-5">
        {heading && (
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2a2628] text-sm font-semibold mb-4">
              תוכנית הלימודים
            </span>
            <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-[#2a2628]">{heading}</h2>
          </div>
        )}
        <div className="space-y-6">
          {semesters.map((sem, index) => {
            const title = (sem[`title_${language}` as keyof typeof sem] as string) || sem.title_he;
            return (
              <div key={index} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
                <div className="px-6 py-4 bg-[#2a2628] text-white font-heading font-bold flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-[#B8D900] text-[#2a2628] flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </span>
                  {title}
                </div>
                <div className="p-6">
                  <div className="grid md:grid-cols-2 gap-3">
                    {sem.courses.map((course, cIndex) => {
                      const courseName = (course[`name_${language}` as keyof typeof course] as string) || course.name_he;
                      return (
                        <div
                          key={cIndex}
                          className="flex items-center gap-3 text-[#2a2628] text-sm py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="w-2 h-2 rounded-full bg-[#B8D900] shrink-0" />
                          {courseName}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Custom HTML Section
// ============================================================================

function CustomHtmlSection({ content }: { content: Record<string, unknown> }) {
  const html = (content.html as string) || "";
  const css = (content.css as string) || "";

  if (!html) return null;

  return (
    <section className="py-8">
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      <div
        className="max-w-6xl mx-auto px-5"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}

// ============================================================================
// Section Renderer
// ============================================================================

function renderSection(
  section: PageSection,
  language: Language,
  pageId?: string,
  programId?: string,
) {
  const content = (section.content || {}) as Record<string, unknown>;

  switch (section.section_type) {
    case "hero":
      return <HeroSection content={content} language={language} />;
    case "form":
      return <FormSection content={content} language={language} pageId={pageId} programId={programId} />;
    case "faq":
      return <FaqSection content={content} language={language} />;
    case "stats":
      return <StatsSection content={content} language={language} />;
    case "video":
      return <VideoSection content={content} language={language} />;
    case "testimonials":
      return <TestimonialsSection content={content} language={language} />;
    case "cta":
      return <CtaSection content={content} language={language} />;
    case "accordion":
      return <AccordionSection content={content} language={language} />;
    case "gallery":
      return <GallerySection content={content} language={language} />;
    case "curriculum":
      return <CurriculumSection content={content} language={language} />;
    case "custom_html":
      return <CustomHtmlSection content={content} />;
    default:
      return null;
  }
}

// ============================================================================
// Main Layout
// ============================================================================

export function LandingPageLayout({
  sections,
  language,
  pageId,
  programId,
  pageTitle,
}: LandingPageLayoutProps) {
  const isRtl = language === "he" || language === "ar";

  const visibleSections = sections.filter((s) => s.is_visible);
  const stickyHeader = visibleSections.find((s) => s.section_type === "sticky_header");
  const whatsappSection = visibleSections.find((s) => s.section_type === "whatsapp");
  const mainSections = visibleSections.filter(
    (s) => s.section_type !== "sticky_header" && s.section_type !== "whatsapp"
  );

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-white">
      {/* Sticky Header */}
      {stickyHeader ? (
        <StickyHeader
          content={(stickyHeader.content || {}) as Record<string, unknown>}
          language={language}
        />
      ) : (
        /* Default sticky header if none configured */
        <StickyHeader
          content={{
            phone: "*2899",
            button_text_he: "השאירו פרטים",
            button_url: "#form",
          }}
          language={language}
        />
      )}

      {/* Main Sections */}
      <main>
        {mainSections.map((section) => (
          <div key={section.id}>
            {renderSection(section, language, pageId, programId)}
          </div>
        ))}
      </main>

      {/* Footer */}
      <footer className="py-10 bg-[#2a2628]" dir={isRtl ? "rtl" : "ltr"}>
        <div className="max-w-6xl mx-auto px-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ONO_LOGO}
                alt="הקריה האקדמית אונו"
                className="h-10 object-contain brightness-0 invert opacity-70"
                loading="lazy"
              />
              <div>
                <p className="text-white/90 font-heading font-bold text-sm">
                  הקריה האקדמית אונו
                </p>
                <p className="text-xs text-white/50">המכללה המומלצת בישראל</p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-white/50 text-sm">
              <a href="tel:*2899" className="hover:text-[#B8D900] transition-colors">*2899</a>
              <a href="https://www.ono.ac.il" target="_blank" rel="noopener noreferrer" className="hover:text-[#B8D900] transition-colors">
                ono.ac.il
              </a>
            </div>

            <p className="text-xs text-white/40">
              &copy; {new Date().getFullYear()} הקריה האקדמית אונו. כל הזכויות שמורות.
            </p>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp */}
      {whatsappSection && (
        <WhatsappSection
          content={(whatsappSection.content || {}) as Record<string, unknown>}
          language={language}
        />
      )}
    </div>
  );
}
