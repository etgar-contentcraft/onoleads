"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Language, PageSection, Program } from "@/lib/types/database";
import { useUrlParams } from "@/hooks/use-url-params";
import { replaceDynamicContent } from "@/lib/dynamic-text";
import { CtaModalProvider, CtaModal, FloatingCtaButton, useCtaModal } from "./cta-modal";
import { CookieConsent } from "../compliance/cookie-consent";
import { AccessibilityWidget } from "../compliance/accessibility-widget";
import { usePageTracking } from "@/hooks/use-page-tracking";

// Above-fold sections — loaded eagerly for fast first paint
import { HeroSection } from "./sections/hero-section";
import { ProgramInfoBar } from "./sections/program-info-bar";

// Below-fold sections — dynamically imported to reduce initial JS bundle
const AboutSection = dynamic(() => import("./sections/about-section").then(mod => ({ default: mod.AboutSection })));
const BenefitsSection = dynamic(() => import("./sections/benefits-section").then(mod => ({ default: mod.BenefitsSection })));
const CurriculumSection = dynamic(() => import("./sections/curriculum-section").then(mod => ({ default: mod.CurriculumSection })));
const CareerSection = dynamic(() => import("./sections/career-section").then(mod => ({ default: mod.CareerSection })));
const FacultySectionComponent = dynamic(() => import("./sections/faculty-section").then(mod => ({ default: mod.FacultySection })));
const StatsSection = dynamic(() => import("./sections/stats-section").then(mod => ({ default: mod.StatsSection })));
const TestimonialsSection = dynamic(() => import("./sections/testimonials-section").then(mod => ({ default: mod.TestimonialsSection })));
const VideoSection = dynamic(() => import("./sections/video-section").then(mod => ({ default: mod.VideoSection })));
const FaqSection = dynamic(() => import("./sections/faq-section").then(mod => ({ default: mod.FaqSection })));
const CtaSection = dynamic(() => import("./sections/cta-section").then(mod => ({ default: mod.CtaSection })));
const WhatsappSection = dynamic(() => import("./sections/whatsapp-section").then(mod => ({ default: mod.WhatsappSection })));
const AdmissionSection = dynamic(() => import("./sections/admission-section").then(mod => ({ default: mod.AdmissionSection })));
const GallerySection = dynamic(() => import("./sections/gallery-section").then(mod => ({ default: mod.GallerySection })));
const MapSection = dynamic(() => import("./sections/map-section").then(mod => ({ default: mod.MapSection })));
const CountdownSection = dynamic(() => import("./sections/countdown-section").then(mod => ({ default: mod.CountdownSection })));
const FormSection = dynamic(() => import("./sections/form-section").then(mod => ({ default: mod.FormSection })));

import { SocialProofToast } from "./social-proof-toast";
import { PopupManager } from "./popup-manager";
import type { PopupCampaign } from "@/lib/types/popup-campaigns";

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
  /** When true, shows the social proof toast */
  social_proof_enabled?: boolean;
  /** Days window for social proof count (default: 7) */
  social_proof_days?: number;
  /** Optional short title for the sticky header bar */
  sticky_header_title?: string;
  /** Brand colors — override defaults across all landing page sections */
  brand_color_primary?: string;
  brand_color_dark?: string;
  brand_color_gray?: string;
}

/** Minimal interest area shape needed on the client */
export interface PageInterestArea {
  id: string;
  name_he: string;
  name_en: string | null;
  slug: string;
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
  /** Popup campaigns assigned to this page (fetched server-side) */
  campaigns?: PopupCampaign[];
  /** Interest areas assigned to this page */
  pageInterestAreas?: PageInterestArea[];
  /** Optional "I don't know" option shown first in the interest dropdown */
  unknownOption?: { text: string; mapsToName: string };
}

// ============================================================================
// Sticky Header
// ============================================================================

function StickyHeader({
  programName,
  stickyTitle,
  language,
  phone,
}: {
  programName?: string;
  stickyTitle?: string;
  language: Language;
  phone?: string;
}) {
  const displayName = stickyTitle || programName;
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
              alt={isRtl ? "אונו" : "Ono"}
              className="h-8 object-contain"
              loading="lazy"
            />
            {displayName && (
              <span
                className={`hidden md:block text-[#2a2628] font-heading font-bold leading-tight max-w-[200px] md:max-w-[350px] lg:max-w-[450px] ${
                  displayName.length > 50 ? "text-[11px] truncate" : displayName.length > 35 ? "text-xs" : "text-sm"
                }`}
                title={displayName}
              >
                {displayName}
              </span>
            )}
            <a
              href={`tel:${displayPhone}`}
              className="hidden md:flex items-center gap-2 text-[#716C70] font-medium text-sm hover:text-[#B8D900] transition-colors px-3 py-2 rounded-lg hover:bg-[#B8D900]/5"
              aria-label={`התקשרו: ${displayPhone}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {displayPhone}
            </a>
          </div>
          <button
            onClick={() => open("section_cta")}
            className="inline-flex items-center px-6 py-3 rounded-xl bg-[#B8D900] text-[#2a2628] font-heading font-bold text-sm hover:bg-[#c8e920] hover:shadow-[0_0_20px_rgba(184,217,0,0.3)] transition-all duration-300 active:scale-[0.97]"
          >
            {isRtl ? "השאירו פרטים" : "Get Info"}
          </button>
        </div>
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
  urlParams?: URLSearchParams,
  pageSlug?: string,
) {
  const rawContent = (section.content || {}) as Record<string, unknown>;
  const content = urlParams ? replaceDynamicContent(rawContent, urlParams) : rawContent;

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
    case "form":
      return <FormSection content={content} language={language} pageId={pageId} programId={programId} pageSlug={pageSlug} />;
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
  campaigns,
  pageInterestAreas,
  unknownOption,
}: LandingPageLayoutProps) {
  const isRtl = language === "he" || language === "ar";
  const urlParams = useUrlParams();

  /* Track anonymous page view */
  usePageTracking(pageId || null);

  /* Only pass CTA text override when it matches the page language.
     Global settings may store Hebrew text — don't show it on English pages. */
  const rawCtaText = settings?.default_cta_text;
  const hasHebrew = rawCtaText ? /[\u0590-\u05FF]/.test(rawCtaText) : false;
  const localizedCtaText = rawCtaText && (isRtl === hasHebrew) ? rawCtaText : undefined;

  const visibleSections = sections.filter((s) => s.is_visible);
  /* WhatsApp section is now purely settings-driven — no builder section needed.
   * Filter it out from the main sections list to avoid duplicates. */
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

  /* Brand color values — fallback to ONO defaults */
  const brandPrimary = settings?.brand_color_primary || "#B8D900";
  const brandDark = settings?.brand_color_dark || "#2a2628";
  const brandGray = settings?.brand_color_gray || "#716C70";
  const hasCustomColors = brandPrimary !== "#B8D900" || brandDark !== "#2a2628" || brandGray !== "#716C70";

  /* Sanitize: only allow valid hex colors to prevent CSS injection */
  const safeHex = (v: string) => /^#[0-9A-Fa-f]{3,8}$/.test(v) ? v : "#B8D900";
  const p = safeHex(brandPrimary);
  const d = safeHex(brandDark);

  return (
    <div id="lp-root" dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-white font-heebo overflow-x-hidden">
      {/* Scoped color overrides — applied only when brand colors differ from ONO defaults */}
      {hasCustomColors && (
        <style dangerouslySetInnerHTML={{ __html: `
          #lp-root .bg-\\[\\#B8D900\\] { background-color: ${p} !important; }
          #lp-root .text-\\[\\#B8D900\\] { color: ${p} !important; }
          #lp-root .border-\\[\\#B8D900\\] { border-color: ${p} !important; }
          #lp-root .ring-\\[\\#B8D900\\] { --tw-ring-color: ${p} !important; }
          #lp-root .from-\\[\\#B8D900\\] { --tw-gradient-from: ${p} !important; }
          #lp-root .via-\\[\\#B8D900\\] { --tw-gradient-via: ${p} !important; }
          #lp-root .to-\\[\\#B8D900\\] { --tw-gradient-to: ${p} !important; }
          #lp-root .bg-\\[\\#2a2628\\] { background-color: ${d} !important; }
          #lp-root .text-\\[\\#2a2628\\] { color: ${d} !important; }
          #lp-root .border-\\[\\#2a2628\\] { border-color: ${d} !important; }
          #lp-root .from-\\[\\#1a1618\\] { --tw-gradient-from: color-mix(in srgb, ${d} 75%, #000) !important; }
          #lp-root .via-\\[\\#2a2628\\] { --tw-gradient-via: ${d} !important; }
          #lp-root .to-\\[\\#1a1618\\] { --tw-gradient-to: color-mix(in srgb, ${d} 75%, #000) !important; }
          #lp-root .hover\\:bg-\\[\\#c8e920\\]:hover { background-color: color-mix(in srgb, ${p} 85%, #fff) !important; }
          #lp-root .hover\\:bg-\\[\\#3a3638\\]:hover { background-color: color-mix(in srgb, ${d} 85%, #fff) !important; }
        ` }} />
      )}
      {/* Sticky Header */}
      <StickyHeader
        programName={pageTitle || (language === "en" ? (program?.name_en || program?.name_he) : program?.name_he)}
        stickyTitle={settings?.sticky_header_title}
        language={language}
        phone={settings?.phone_number}
      />

      {/* Main Content */}
      <main>
        {/* Render explicit sections with auto-sections injected after hero */}
        {mainSections.map((section, index) => (
          <div key={section.id}>
            {renderSection(section, language, pageId, programId, urlParams, pageSlug)}
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
                {isRtl ? "המכללה המומלצת בישראל" : "Israel's Most Recommended College"}
              </span>
              <div className="w-8 h-0.5 bg-[#B8D900] rounded-full" />
            </div>
            <h3 className="font-heading text-xl text-white/90 font-bold">
              {isRtl ? "הקריה האקדמית אונו" : "Ono Academic College"}
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
                  {isRtl ? "הקריה האקדמית אונו" : "Ono Academic College"}
                </p>
                <p className="text-xs text-white/50 font-heebo">{isRtl ? "המכללה המומלצת בישראל" : "Israel's Most Recommended College"}</p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-white/50 text-sm font-heebo">
              <a href={`tel:${settings?.phone_number || "*2899"}`} className="hover:text-[#B8D900] transition-colors">{settings?.phone_number || "*2899"}</a>
              <a href="https://www.ono.ac.il" target="_blank" rel="noopener noreferrer" className="hover:text-[#B8D900] transition-colors">
                ono.ac.il
              </a>
            </div>

            <div className="flex items-center gap-4 text-white/50 text-xs font-heebo">
              <a href="/privacy" className="hover:text-[#B8D900] transition-colors">{isRtl ? "מדיניות פרטיות" : "Privacy Policy"}</a>
              <span className="w-px h-3 bg-white/20" />
              <a href="/terms" className="hover:text-[#B8D900] transition-colors">{isRtl ? "תנאי שימוש" : "Terms of Use"}</a>
              <span className="w-px h-3 bg-white/20" />
              <p className="text-white/40">
                &copy; {new Date().getFullYear()} {isRtl ? "הקריה האקדמית אונו" : "Ono Academic College"}
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp button — appears only when whatsapp_number is configured in settings */}
      {settings?.whatsapp_number && (
        <WhatsappSection
          content={{
            phone: settings.whatsapp_number,
            /* Pre-filled message per language, mentioning the program/page */
            message_he: `שלום! ראיתי את העמוד${program?.name_he ? ` על ${program.name_he}` : pageTitle ? ` - ${pageTitle}` : ""} ואשמח לשמוע פרטים נוספים.`,
            message_en: `Hi! I saw the page${program?.name_en || program?.name_he ? ` about ${program.name_en || program.name_he}` : pageTitle ? ` - ${pageTitle}` : ""} and would love to hear more details.`,
            message_ar: `مرحباً! رأيت الصفحة${program?.name_he ? ` عن ${program.name_he}` : pageTitle ? ` - ${pageTitle}` : ""} وأود معرفة المزيد من التفاصيل.`,
          }}
          language={language}
        />
      )}
      <FloatingCtaButton ctaText={localizedCtaText} />
      <CtaModal
        pageId={pageId}
        programId={programId}
        pageSlug={pageSlug}
        programName={pageTitle || (language === "en" ? (program?.name_en || program?.name_he) : program?.name_he)}
        ctaText={localizedCtaText}
        pageInterestAreas={pageInterestAreas}
        unknownOption={unknownOption}
        language={language}
      />

      {/* Popup campaigns — managed via /dashboard/campaigns */}
      {campaigns && campaigns.length > 0 && (
        <PopupManager
          campaigns={campaigns}
          language={language}
          whatsappNumber={settings?.whatsapp_number}
          pageId={pageId}
          programId={programId}
          pageSlug={pageSlug}
        />
      )}

      {/* Social Proof Toast — only when explicitly enabled per-page */}
      {settings?.social_proof_enabled && pageId && (
        <SocialProofToast
          pageId={pageId}
          days={settings.social_proof_days}
          language={language as "he" | "en" | "ar"}
        />
      )}

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
    <CtaModalProvider language={props.language}>
      <InnerLayout {...props} />
    </CtaModalProvider>
  );
}

