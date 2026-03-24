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

interface LandingPageLayoutProps {
  sections: PageSection[];
  language: Language;
  pageId?: string;
  programId?: string;
  pageTitle?: string;
}

function StickyHeader({
  content,
  language,
}: {
  content: Record<string, unknown>;
  language: Language;
}) {
  const isRtl = language === "he" || language === "ar";
  const text = (content[`text_${language}`] as string) || (content.text_he as string) || "";
  const buttonText = (content[`button_text_${language}`] as string) || (content.button_text_he as string) || "";
  const buttonUrl = (content.button_url as string) || "#form";
  const bgColor = (content.bg_color as string) || "#B8D900";
  const phone = (content.phone as string) || "";
  const showPhone = content.show_phone as boolean;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      }`}
      dir={isRtl ? "rtl" : "ltr"}
      style={{ backgroundColor: bgColor }}
    >
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {text && <span className="text-[#2a2628] font-semibold text-sm md:text-base">{text}</span>}
          {showPhone && phone && (
            <a href={`tel:${phone}`} className="text-[#2a2628] font-bold text-sm hover:underline">
              {phone}
            </a>
          )}
        </div>
        {buttonText && (
          <a
            href={buttonUrl}
            className="inline-flex items-center px-5 py-2 rounded-lg bg-[#4A4648] text-white font-bold text-sm hover:bg-[#3a3638] transition-colors"
          >
            {buttonText}
          </a>
        )}
      </div>
    </div>
  );
}

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
    <section className="py-16 md:py-20 bg-white" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-3xl mx-auto px-5">
        {heading && (
          <h2 className="text-2xl md:text-3xl font-bold text-[#4A4648] text-center mb-10">{heading}</h2>
        )}
        <div className="space-y-3">
          {items.map((item, index) => {
            const title = (item[`title_${language}` as keyof typeof item] as string) || item.title_he;
            const body = (item[`body_${language}` as keyof typeof item] as string) || item.body_he;
            const isOpen = openIndex === index;

            return (
              <div key={index} className="rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between p-5 text-start hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-[#4A4648]">{title}</span>
                  <svg
                    className={`w-5 h-5 text-[#716C70] transition-transform duration-300 shrink-0 ${isOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-[1000px]" : "max-h-0"}`}>
                  <div className="px-5 pb-5 text-[#716C70] leading-relaxed">{body}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

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
    <section className="py-16 md:py-20 bg-white" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-6xl mx-auto px-5">
        {heading && (
          <h2 className="text-2xl md:text-3xl font-bold text-[#4A4648] text-center mb-10">{heading}</h2>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((img, index) => (
            <div key={index} className="relative rounded-xl overflow-hidden aspect-[4/3] bg-gray-100 group">
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
    <section className="py-16 md:py-20 bg-gray-50" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto px-5">
        {heading && (
          <h2 className="text-2xl md:text-3xl font-bold text-[#4A4648] text-center mb-10">{heading}</h2>
        )}
        <div className="space-y-6">
          {semesters.map((sem, index) => {
            const title = (sem[`title_${language}` as keyof typeof sem] as string) || sem.title_he;
            return (
              <div key={index} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-[#4A4648] text-white font-semibold flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-[#B8D900] text-[#2a2628] flex items-center justify-center font-bold text-sm">
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
                          className="flex items-center gap-2 text-[#4A4648] text-sm"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-[#B8D900] shrink-0" />
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
    // sticky_header and whatsapp are rendered outside the main flow
    default:
      return null;
  }
}

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
      {/* Sticky Header (appears on scroll) */}
      {stickyHeader && (
        <StickyHeader
          content={(stickyHeader.content || {}) as Record<string, unknown>}
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
      <footer className="py-8 bg-[#4A4648] text-white/70 text-center text-sm">
        <div className="max-w-6xl mx-auto px-5">
          <p className="font-medium text-white/90 mb-1">
            {isRtl ? "הקריה האקדמית אונו - המכללה המומלצת בישראל" : "Ono Academic College"}
          </p>
          <p>{isRtl ? "כל הזכויות שמורות" : "All rights reserved"} &copy; {new Date().getFullYear()}</p>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      {whatsappSection && (
        <WhatsappSection
          content={(whatsappSection.content || {}) as Record<string, unknown>}
          language={language}
        />
      )}
    </div>
  );
}
