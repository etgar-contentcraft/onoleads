"use client";

import { useEffect, useState } from "react";
import type { Language, PageSection, Program } from "@/lib/types/database";
import { CtaModalProvider, CtaModal, FloatingCtaButton, useCtaModal } from "./cta-modal";
import { CookieConsent } from "../compliance/cookie-consent";
import { AccessibilityWidget } from "../compliance/accessibility-widget";
import { HeroSection } from "./sections/hero-section";
import { ProgramInfoBar } from "./sections/program-info-bar";
import { AboutSection } from "./sections/about-section";
import { BenefitsSection } from "./sections/benefits-section";
import { CurriculumSection } from "./sections/curriculum-section";
import { CareerSection } from "./sections/career-section";
import { FacultySection as FacultySectionComponent } from "./sections/faculty-section";
import { StatsSection } from "./sections/stats-section";
import { TestimonialsSection } from "./sections/testimonials-section";
import { VideoSection } from "./sections/video-section";
import { FaqSection } from "./sections/faq-section";
import { CtaSection } from "./sections/cta-section";
import { WhatsappSection } from "./sections/whatsapp-section";
import { AdmissionSection } from "./sections/admission-section";
import { GallerySection } from "./sections/gallery-section";
import { MapSection } from "./sections/map-section";
import { CountdownSection } from "./sections/countdown-section";

// ============================================================================
// Constants
// ============================================================================

const ONO_LOGO = "https://www.ono.ac.il/wp-content/uploads/2025/12/לוגו-אונו.png";

// ============================================================================
// Types
// ============================================================================

/** Merged per-page + global settings passed from the server */
export interface PageSettings {
  webhook_url?: string;
  whatsapp_number?: string;
  phone_number?: string;
  logo_url?: string;
  default_cta_text?: string;
  google_analytics_id?: string;
  facebook_pixel_id?: string;
}

interface LandingPageLayoutProps {
  sections: PageSection[];
  language: Language;
  pageId?: string;
  programId?: string;
  pageSlug?: string;
  pageTitle?: string;
  program?: Program | null;
  settings?: PageSettings;
}

// ============================================================================
// Sticky Header
// ============================================================================

function StickyHeader({
  programName,
  language,
  phone,
}: {
  programName?: string;
  language: Language;
  phone?: string;
}) {
  const { open } = useCtaModal();
  const isRtl = language === "he" || language === "ar";
  const displayPhone = phone || "*2899";
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
          : "-translate-y-full opacity-0 pointer-events-none"
      }`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="bg-white/95 backdrop-blur-xl border-b border-gray-200/50 shadow-[0_2px_20px_rgba(0,0,0,0.06)]">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ONO_LOGO}
              alt="אונו"
              className="h-8 object-contain"
              loading="lazy"
            />
            {programName && (
              <span className="hidden md:block text-[#2a2628] font-heading font-bold text-sm truncate max-w-[240px]">
                {programName}
              </span>
            )}
            <a
              href={`tel:${displayPhone}`}
              className="hidden md:flex items-center gap-2 text-[#716C70] font-medium text-sm hover:text-[#B8D900] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {displayPhone}
            </a>
          </div>
          <button
            onClick={open}
            className="inline-flex items-center px-6 py-2.5 rounded-xl bg-[#B8D900] text-[#2a2628] font-heading font-bold text-sm hover:bg-[#c8e920] hover:shadow-[0_0_20px_rgba(184,217,0,0.3)] transition-all duration-300 active:scale-[0.97]"
          >
            {isRtl ? "השאירו פרטים" : "Get Info"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Exit Intent Popup
// Fires once per session when the visitor's cursor leaves the viewport (top).
// On mobile, fires after the visitor scrolls down 50%+ and then scrolls up fast.
// ============================================================================

function ExitIntentPopup({
  programName,
  language,
}: {
  programName?: string;
  language: Language;
}) {
  const { open, isOpen } = useCtaModal();
  const [shown, setShown] = useState(false);
  const [visible, setVisible] = useState(false);
  const isRtl = language === "he" || language === "ar";

  // Don't show if modal is already open or was already shown this session
  useEffect(() => {
    if (typeof sessionStorage === "undefined") return;
    if (sessionStorage.getItem("exit_intent_shown")) setShown(true);
  }, []);

  // Desktop: mouseleave toward top of viewport
  useEffect(() => {
    if (shown || isOpen) return;
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !shown && !isOpen) {
        setShown(true);
        setVisible(true);
        sessionStorage.setItem("exit_intent_shown", "1");
      }
    };
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [shown, isOpen]);

  // Mobile: fast scroll-up after 50%+ scroll depth
  useEffect(() => {
    if (shown || isOpen) return;
    let lastY = 0;
    let triggered = false;
    const handleScroll = () => {
      const current = window.scrollY;
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      const depth = maxScroll > 0 ? current / maxScroll : 0;
      if (!triggered && depth > 0.5 && current < lastY - 80) {
        triggered = true;
        setShown(true);
        setVisible(true);
        sessionStorage.setItem("exit_intent_shown", "1");
      }
      lastY = current;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [shown, isOpen]);

  const handleCta = () => {
    setVisible(false);
    open();
  };

  if (!visible) return null;

  const programLabel = programName
    ? isRtl ? `ל${programName}` : `for ${programName}`
    : "";

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      dir={isRtl ? "rtl" : "ltr"}
      role="dialog"
      aria-modal="true"
      aria-label={isRtl ? "רגע לפני שתלכו..." : "Before you go..."}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setVisible(false)}
      />
      {/* Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-7 text-center animate-[fade-in-up_0.3s_ease-out]">
        {/* Close button */}
        <button
          onClick={() => setVisible(false)}
          className="absolute top-3 left-3 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="סגור"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Accent line */}
        <div className="w-12 h-1 bg-[#B8D900] rounded-full mx-auto mb-4" />

        <h2 className="font-heading text-xl font-extrabold text-[#2a2628] mb-2" dir={isRtl ? "rtl" : "ltr"}>
          {isRtl ? "רגע לפני שתלכו..." : "Wait — before you go!"}
        </h2>
        <p className="font-heebo text-[#716C70] text-sm mb-5 leading-relaxed" dir={isRtl ? "rtl" : "ltr"}>
          {isRtl
            ? `השאירו פרטים ${programLabel} ויועץ לימודים יחזור אליכם בהקדם — ללא התחייבות.`
            : `Leave your details ${programLabel} and an advisor will contact you soon — no commitment.`}
        </p>

        <button
          onClick={handleCta}
          className="w-full py-3 rounded-xl bg-[#B8D900] text-[#2a2628] font-heading font-bold text-base hover:bg-[#c8e920] hover:shadow-[0_0_25px_rgba(184,217,0,0.35)] transition-all duration-300 active:scale-[0.98] mb-3"
        >
          {isRtl ? "השאירו פרטים עכשיו →" : "Get Info Now →"}
        </button>
        <button
          onClick={() => setVisible(false)}
          className="w-full py-2 text-xs text-[#9A969A] hover:text-[#716C70] transition-colors"
        >
          {isRtl ? "לא, תודה" : "No thanks"}
        </button>
      </div>
    </div>
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
    case "program_info_bar":
      return <ProgramInfoBar content={content} language={language} />;
    case "about":
      return <AboutSection content={content} language={language} />;
    case "benefits":
      return <BenefitsSection content={content} language={language} />;
    case "curriculum":
      return <CurriculumSection content={content} language={language} />;
    case "career":
      return <CareerSection content={content} language={language} />;
    case "faculty":
      return <FacultySectionComponent content={content} language={language} />;
    case "stats":
      return <StatsSection content={content} language={language} />;
    case "testimonials":
      return <TestimonialsSection content={content} language={language} />;
    case "video":
      return <VideoSection content={content} language={language} />;
    case "faq":
      return <FaqSection content={content} language={language} />;
    case "cta":
      return <CtaSection content={content} language={language} />;
    case "admission":
      return <AdmissionSection content={content} language={language} />;
    case "gallery":
      return <GallerySection content={content} language={language} />;
    case "map":
      return <MapSection content={content} language={language} />;
    case "countdown":
      return <CountdownSection content={content} language={language} />;
    default:
      return null;
  }
}

// ============================================================================
// Build auto-sections from program data
// ============================================================================

function buildProgramSections(program: Program, language: Language): JSX.Element[] {
  const isRtl = language === "he" || language === "ar";
  const elements: JSX.Element[] = [];
  const meta = (program.meta || {}) as Record<string, unknown>;

  // Program info bar (always if we have data)
  const infoParts: Record<string, string> = {};
  if (program.duration_semesters) {
    const years = Math.ceil(program.duration_semesters / 2);
    infoParts.duration = isRtl ? `${years} שנים` : `${years} years`;
  }
  if (program.campuses && program.campuses.length > 0) {
    infoParts.campus = program.campuses.join(", ");
  }
  if (program.schedule_options && program.schedule_options.length > 0) {
    infoParts.format = program.schedule_options.join(" / ");
  }
  if (program.degree_type) {
    infoParts.degree = program.degree_type;
  }

  if (Object.keys(infoParts).length > 0) {
    elements.push(
      <ProgramInfoBar
        key="auto-info-bar"
        content={infoParts}
        language={language}
      />
    );
  }

  // About section (if description exists)
  if (program.description_he || program.description_en) {
    const aboutContent: Record<string, unknown> = {
      heading_he: `אודות לימודי ${program.name_he}`,
      heading_en: `About ${program.name_en || program.name_he}`,
      description_he: program.description_he || "",
      description_en: program.description_en || "",
      image_url: program.hero_image_url || "",
      bullets: (meta.usp_bullets as string[]) || [],
    };
    elements.push(
      <AboutSection key="auto-about" content={aboutContent} language={language} />
    );
  }

  // Benefits section (always show with defaults)
  const benefitsContent: Record<string, unknown> = {
    heading_he: "למה ללמוד באונו?",
    heading_en: "Why Ono?",
    items: (meta.benefits as unknown[]) || undefined,
  };
  elements.push(
    <BenefitsSection key="auto-benefits" content={benefitsContent} language={language} />
  );

  // Career outcomes (if available)
  if (program.career_outcomes && program.career_outcomes.length > 0) {
    const careerContent: Record<string, unknown> = {
      heading_he: "לאן תגיעו אחרי התואר?",
      heading_en: "Career Outcomes",
      items: program.career_outcomes,
    };
    elements.push(
      <CareerSection key="auto-career" content={careerContent} language={language} />
    );
  }

  // Faculty members (from meta)
  if (meta.faculty_members && Array.isArray(meta.faculty_members) && (meta.faculty_members as unknown[]).length > 0) {
    const facultyContent: Record<string, unknown> = {
      heading_he: "הסגל האקדמי",
      heading_en: "Faculty",
      members: meta.faculty_members,
    };
    elements.push(
      <FacultySectionComponent key="auto-faculty" content={facultyContent} language={language} />
    );
  }

  return elements;
}

// ============================================================================
// Inner Layout (needs CTA context)
// ============================================================================

function InnerLayout({
  sections,
  language,
  pageId,
  programId,
  pageSlug,
  pageTitle,
  program,
  settings,
}: LandingPageLayoutProps) {
  const isRtl = language === "he" || language === "ar";

  const visibleSections = sections.filter((s) => s.is_visible);
  const whatsappSection = visibleSections.find((s) => s.section_type === "whatsapp");
  const mainSections = visibleSections.filter(
    (s) => s.section_type !== "sticky_header" && s.section_type !== "whatsapp"
  );

  // Determine which section types are already in the page sections
  const existingSectionTypes = new Set(mainSections.map((s) => s.section_type));

  // Build auto sections from program data (only for types not already in sections)
  const autoSections = program ? buildProgramSections(program, language) : [];

  // Figure out where to insert auto sections (after hero, before explicit sections)
  const heroIndex = mainSections.findIndex((s) => s.section_type === "hero");
  const hasHero = heroIndex >= 0;

  // Section types that should come from auto-generation if not explicit
  const autoSectionMapping: Record<string, string> = {
    "auto-info-bar": "program_info_bar",
    "auto-about": "about",
    "auto-benefits": "benefits",
    "auto-career": "career",
    "auto-faculty": "faculty",
  };

  const filteredAutoSections = autoSections.filter((el) => {
    const key = el.key as string;
    const sectionType = autoSectionMapping[key];
    return sectionType ? !existingSectionTypes.has(sectionType) : true;
  });

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-white font-heebo">
      {/* Sticky Header */}
      <StickyHeader
        programName={pageTitle || program?.name_he}
        language={language}
        phone={settings?.phone_number}
      />

      {/* Main Content */}
      <main>
        {/* Render explicit sections with auto-sections injected after hero */}
        {mainSections.map((section, index) => (
          <div key={section.id}>
            {renderSection(section, language, pageId, programId)}
            {/* After hero, inject auto-generated sections */}
            {index === heroIndex && filteredAutoSections.length > 0 && (
              <>{filteredAutoSections}</>
            )}
          </div>
        ))}

        {/* If no hero section, put auto sections at the top */}
        {!hasHero && filteredAutoSections.length > 0 && (
          <>{filteredAutoSections}</>
        )}

        {/* If no CTA section exists, add a default one */}
        {!existingSectionTypes.has("cta") && (
          <CtaSection
            content={{
              heading_he: "מוכנים להתחיל?",
              description_he: "השאירו פרטים ויועץ לימודים יחזור אליכם",
              button_text_he: "לפרטים נוספים",
              phone: "*2899",
            }}
            language={language}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="py-12 bg-[#2a2628]" dir={isRtl ? "rtl" : "ltr"}>
        <div className="max-w-6xl mx-auto px-5">
          {/* Branding line */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-3">
              <div className="w-8 h-0.5 bg-[#B8D900] rounded-full" />
              <span className="text-[#B8D900] font-heading font-bold text-sm tracking-wider">
                המכללה המומלצת בישראל
              </span>
              <div className="w-8 h-0.5 bg-[#B8D900] rounded-full" />
            </div>
            <h3 className="font-heading text-xl text-white/90 font-bold">
              הקריה האקדמית אונו
            </h3>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t border-white/10">
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
                <p className="text-xs text-white/50 font-heebo">המכללה המומלצת בישראל</p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-white/50 text-sm font-heebo">
              <a href={`tel:${settings?.phone_number || "*2899"}`} className="hover:text-[#B8D900] transition-colors">{settings?.phone_number || "*2899"}</a>
              <a href="https://www.ono.ac.il" target="_blank" rel="noopener noreferrer" className="hover:text-[#B8D900] transition-colors">
                ono.ac.il
              </a>
            </div>

            <div className="flex items-center gap-4 text-white/50 text-xs font-heebo">
              <a href="/privacy" className="hover:text-[#B8D900] transition-colors">מדיניות פרטיות</a>
              <span className="w-px h-3 bg-white/20" />
              <a href="/terms" className="hover:text-[#B8D900] transition-colors">תנאי שימוש</a>
              <span className="w-px h-3 bg-white/20" />
              <p className="text-white/40">
                &copy; {new Date().getFullYear()} הקריה האקדמית אונו
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating elements */}
      {whatsappSection && (
        <WhatsappSection
          content={{
            ...(whatsappSection.content || {}) as Record<string, unknown>,
            // Override phone number from page settings if set
            ...(settings?.whatsapp_number ? { phone: settings.whatsapp_number } : {}),
          }}
          language={language}
        />
      )}
      <FloatingCtaButton ctaText={settings?.default_cta_text} />
      <CtaModal
        pageId={pageId}
        programId={programId}
        pageSlug={pageSlug}
        programName={pageTitle || program?.name_he}
        ctaText={settings?.default_cta_text}
      />

      {/* Exit Intent Popup — fires once per session when visitor tries to leave */}
      <ExitIntentPopup programName={pageTitle || program?.name_he} language={language} />

      {/* Compliance widgets */}
      <CookieConsent />
      <AccessibilityWidget />
    </div>
  );
}

// ============================================================================
// Main Layout (wraps with CTA provider)
// ============================================================================

export function LandingPageLayout(props: LandingPageLayoutProps) {
  return (
    <CtaModalProvider>
      <InnerLayout {...props} />
    </CtaModalProvider>
  );
}
