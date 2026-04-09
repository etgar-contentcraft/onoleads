"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import type { Language, PageSection, Program } from "@/lib/types/database";
import type { EventRow } from "@/lib/types/events";
import { useUrlParams } from "@/hooks/use-url-params";
import { replaceDynamicContent } from "@/lib/dynamic-text";
import { CtaModalProvider, CtaModal, FloatingCtaButton, useCtaModal } from "./cta-modal";
import { CookieConsent } from "../compliance/cookie-consent";
import { AccessibilityWidget } from "../compliance/accessibility-widget";
import { usePageTracking, getOrCreateCookieId } from "@/hooks/use-page-tracking";
import { ScrollTracker } from "./scroll-tracker";
import { ClickTracker } from "./click-tracker";
import { ViewportTracker } from "./viewport-tracker";

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
const SingleImageSection = dynamic(() => import("./sections/single-image-section").then(mod => ({ default: mod.SingleImageSection })));
const MapSection = dynamic(() => import("./sections/map-section").then(mod => ({ default: mod.MapSection })));
const CountdownSection = dynamic(() => import("./sections/countdown-section").then(mod => ({ default: mod.CountdownSection })));
const EventSection = dynamic(() => import("./sections/event-section"));
const FormSection = dynamic(() => import("./sections/form-section").then(mod => ({ default: mod.FormSection })));
const ProgramOutcomesSection = dynamic(() => import("./sections/program-outcomes-section").then(mod => ({ default: mod.ProgramOutcomesSection })));
const AccordionSection = dynamic(() => import("./sections/accordion-section").then(mod => ({ default: mod.AccordionSection })));
const ContactInfoSection = dynamic(() => import("./sections/contact-info-section").then(mod => ({ default: mod.ContactInfoSection })));
const CustomHtmlSection = dynamic(() => import("./sections/custom-html-section").then(mod => ({ default: mod.CustomHtmlSection })));
const TextBlockSection = dynamic(() => import("./sections/text-block-section").then(mod => ({ default: mod.TextBlockSection })));
const PartnersSection = dynamic(() => import("./sections/partners-section").then(mod => ({ default: mod.PartnersSection })));
const ProgramsListSection = dynamic(() => import("./sections/programs-list-section").then(mod => ({ default: mod.ProgramsListSection })));

import { SectionErrorBoundary } from "./section-error-boundary";
import { SocialProofToast } from "./social-proof-toast";
import { PopupManager } from "./popup-manager";
import type { PopupCampaign } from "@/lib/types/popup-campaigns";
import { PixelTracker } from "./pixel-tracker";
import type { PixelConfig } from "@/lib/analytics/pixel-manager";

// ============================================================================
// Constants
// ============================================================================

/** Hardcoded fallback used when no logo URL is configured in settings or page overrides. */
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
  /** Body font key — one of: rubik | heebo | assistant | noto-sans-hebrew | frank-ruhl */
  font_body?: string;
  /** When true, shows the subtle sticky bottom CTA bar (user can dismiss per session) */
  sticky_bar_enabled?: boolean;
  /** Pixel IDs for client-side tracking (loaded from pixel_configurations table) */
  ga4_id?: string;
  meta_pixel_id?: string;
  google_ads_id?: string;
  google_ads_conversion_label?: string;
  tiktok_pixel_id?: string;
  linkedin_partner_id?: string;
  outbrain_account_id?: string;
  taboola_account_id?: string;
  twitter_pixel_id?: string;
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
  /** Map of event rows keyed by event_id — used by event sections that
   *  reference a row in the events table via content.event_id. Fetched in
   *  the server route so every event section on the page gets its rich data
   *  without running client-side queries. */
  eventsMap?: Record<string, EventRow>;
  /** Map of program rows keyed by program_id — used by programs_list sections
   *  that reference rows in the programs table via item.program_id. */
  programsMap?: Record<string, ProgramMapEntry>;
}

// ============================================================================
// Page-level Sticky Bottom Bar (opt-in via settings.sticky_bar_enabled)
// ============================================================================

/**
 * Compact fixed bottom bar with phone, CTA and dismiss button.
 * Appears after 600px scroll, dismissable per-session via sessionStorage.
 * Enabled only when settings.sticky_bar_enabled is true.
 */
function PageStickyBar({
  settings,
  language,
  pageId,
}: {
  settings: PageSettings;
  language: Language;
  pageId?: string;
}) {
  const { open } = useCtaModal();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const isRtl = language === "he" || language === "ar";
  const dismissKey = `ono_sticky_${pageId || "bar"}`;

  useEffect(() => {
    /* Don't show if dismissed this session */
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(dismissKey)) {
      setDismissed(true);
      return;
    }
    const handleScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [dismissKey]);

  const handleDismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(dismissKey, "1"); } catch { /* ignore */ }
  };

  if (dismissed || !visible) return null;

  const phone = settings.phone_number || "*2899";
  const ctaText = settings.default_cta_text || (isRtl ? "לפרטים נוספים" : "Get Info");
  const barText = isRtl
    ? "יועץ לימודים ממתין לכם — השאירו פרטים עכשיו"
    : "An academic advisor is waiting — get in touch now";

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="fixed bottom-0 left-0 right-0 z-[45] bg-[#2a2628]/95 backdrop-blur-sm
        flex items-center gap-3 px-4 py-2.5 shadow-[0_-2px_16px_rgba(0,0,0,0.18)]
        animate-slide-in-bottom"
    >
      {/* Promotional text — desktop only */}
      <span className="hidden md:block text-white/65 text-xs font-medium truncate flex-1">
        {barText}
      </span>

      <div className="flex items-center gap-2.5 ms-auto">
        {/* Phone link */}
        <a
          href={`tel:${phone.replace(/[\s\-]/g, "")}`}
          className="hidden sm:flex items-center gap-1 text-white/60 text-xs hover:text-white/90 transition-colors"
          aria-label={phone}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24"
            fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" clipRule="evenodd"
              d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" />
          </svg>
          {phone}
        </a>

        {/* CTA button */}
        <button
          type="button"
          onClick={() => open("sticky_bar")}
          className="font-heading rounded-full px-4 py-1.5 text-xs font-bold text-[#2a2628] bg-[#B8D900] hover:bg-[#c8e920] transition-colors shadow-sm"
        >
          {ctaText}
        </button>

        {/* Dismiss button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="text-white/30 hover:text-white/60 transition-colors p-0.5 rounded shrink-0"
          aria-label={isRtl ? "סגור" : "Close"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Sticky Header
// ============================================================================

function StickyHeader({
  programName,
  stickyTitle,
  language,
  phone,
  logoUrl,
}: {
  programName?: string;
  stickyTitle?: string;
  language: Language;
  phone?: string;
  /** Resolved logo URL — falls back to ONO_LOGO if undefined */
  logoUrl?: string;
}) {
  const displayName = stickyTitle || programName;
  const { open } = useCtaModal();
  const isRtl = language === "he" || language === "ar";
  const displayPhone = phone || "*2899";
  const resolvedLogo = logoUrl || ONO_LOGO;
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
              src={resolvedLogo}
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

/** Lightweight program shape for programs_list section resolution. */
export interface ProgramMapEntry {
  id: string;
  name_he: string;
  name_en: string | null;
  name_ar: string | null;
  description_he: string | null;
  description_en: string | null;
  image_url: string | null;
  slug: string | null;
}

function renderSection(
  section: PageSection,
  language: Language,
  pageId?: string,
  programId?: string,
  urlParams?: URLSearchParams,
  pageSlug?: string,
  eventsMap?: Record<string, EventRow>,
  programsMap?: Record<string, ProgramMapEntry>,
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
    case "footer_cta":
      // footer_cta is an alias used by some legacy DB templates — both render via CtaSection
      return <CtaSection content={content} language={language} />;
    case "program_info":
      // program_info is a legacy template type (title+description+highlights) — renders via AboutSection
      return <AboutSection content={content} language={language} />;
    case "admission":
      return <AdmissionSection content={content} language={language} />;
    case "gallery":
      return <GallerySection content={content} language={language} />;
    case "single_image":
      return <SingleImageSection content={content} language={language} />;
    case "map":
      return <MapSection content={content} language={language} />;
    case "countdown":
      return <CountdownSection content={content} language={language} />;
    case "event": {
      // When the section references an existing event (content.event_id), the
      // server-side loader pre-fetched the row and put it in eventsMap. Pass
      // it down so the section can render rich structured content (speakers,
      // schedule, FAQ, gallery, etc.) from a single source of truth.
      const eventId = typeof content.event_id === "string" ? content.event_id : undefined;
      const event = eventId && eventsMap ? eventsMap[eventId] || null : null;
      return <EventSection content={content} language={language} event={event} />;
    }
    case "form":
      return <FormSection content={content} language={language} pageId={pageId} programId={programId} pageSlug={pageSlug} />;
    case "program_outcomes":
      return <ProgramOutcomesSection content={content} language={language} />;
    case "accordion":
      return <AccordionSection content={content} language={language} />;
    case "contact_info":
      return <ContactInfoSection content={content} language={language} />;
    case "custom_html":
      return <CustomHtmlSection content={content} language={language} />;
    case "text_block":
      return <TextBlockSection content={content} language={language} />;
    case "partners":
      return <PartnersSection content={content} language={language} />;
    case "programs_list":
      return <ProgramsListSection content={content} language={language} programsMap={programsMap} />;
    default:
      return null;
  }
}

// ============================================================================
// Build auto-sections from program data
// ============================================================================

/**
 * Builds auto-injected sections from program metadata.
 *
 * Rules (kept conservative on purpose — auto-injection used to surprise editors
 * with sections that weren't in the page's section list):
 *   • info bar — only when 2+ fields are filled. A single-field bar looks like
 *     a stray card and confuses editors who can't find it in the section list.
 *   • about — only when a description exists.
 *   • benefits — only when meta.benefits has explicit items. We never fall back
 *     to default Hebrew copy because it leaks Hebrew content onto English pages.
 *   • career — only when career_outcomes are defined.
 *   • faculty — only when meta.faculty_members has entries.
 *
 * Anything that fails these checks is omitted entirely. Editors who want the
 * section can add it explicitly via the section palette.
 */
function buildProgramSections(program: Program, language: Language): JSX.Element[] {
  const isRtl = language === "he" || language === "ar";
  const elements: JSX.Element[] = [];
  const meta = (program.meta || {}) as Record<string, unknown>;

  // Program info bar — only auto-inject when at least 2 fields are filled.
  // A single-field bar looks like an orphan card and is the #1 source of
  // "where is this coming from?" support tickets.
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

  if (Object.keys(infoParts).length >= 2) {
    elements.push(
      <ProgramInfoBar
        key="auto-info-bar"
        content={infoParts}
        language={language}
      />
    );
  }

  // About section — only when there's an actual description in the program data
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

  // Benefits — ONLY when meta.benefits has explicit items. Previously we
  // unconditionally rendered this with Hebrew defaults, which appeared on
  // English pages as untranslated content the editor couldn't find or remove.
  if (Array.isArray(meta.benefits) && (meta.benefits as unknown[]).length > 0) {
    const benefitsContent: Record<string, unknown> = {
      heading_he: "למה ללמוד באונו?",
      heading_en: "Why Ono?",
      items: meta.benefits as unknown[],
    };
    elements.push(
      <BenefitsSection key="auto-benefits" content={benefitsContent} language={language} />
    );
  }

  // Career outcomes (only when explicit data exists)
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

  // Faculty members (only when explicit data exists in meta)
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
  eventsMap,
  programsMap,
}: LandingPageLayoutProps) {
  const isRtl = language === "he" || language === "ar";
  const urlParams = useUrlParams();

  /* Detect heatmap preview mode — skip all tracking to avoid polluting data */
  const [isHeatmapPreview] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).has("_heatmap");
  });

  /* Track anonymous page view (skip in heatmap mode) */
  usePageTracking(isHeatmapPreview ? null : (pageId || null));

  /* Compute cookie ID once per mount — getOrCreateCookieId() reads+writes document.cookie
   * and must not be called on every render (it was previously called 3x per render) */
  const cookieId = useMemo(() => {
    if (typeof window === "undefined" || isHeatmapPreview) return "";
    return getOrCreateCookieId();
  }, [isHeatmapPreview]);

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

  /* Font override — maps setting key to the CSS custom property holding that font */
  const FONT_CSS_VAR: Record<string, string> = {
    rubik: "--font-heading",
    heebo: "--font-heebo",
    assistant: "--font-assistant",
    "noto-sans-hebrew": "--font-noto-sans-hebrew",
    "frank-ruhl": "--font-frank-ruhl",
  };
  const fontKey = settings?.font_body || "rubik";
  const fontCssVar = FONT_CSS_VAR[fontKey] || "--font-heading";
  /* Only inject override style when font differs from system default (Rubik/--font-heading) */
  const hasFontOverride = fontKey !== "rubik" && !!FONT_CSS_VAR[fontKey];

  /* Sanitize: only allow valid hex colors to prevent CSS injection */
  const safeHex = (v: string) => /^#[0-9A-Fa-f]{3,8}$/.test(v) ? v : "#B8D900";
  const p = safeHex(brandPrimary);
  const d = safeHex(brandDark);

  return (
    <div id="lp-root" dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-white font-heebo overflow-x-hidden">
      {/* Heatmap mode: vh-freeze CSS is injected by the heatmap component
          via contentDocument after the iframe loads at normal viewport height.
          No overrides needed here — the heatmap handles everything. */}
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
      {/* Font override — remaps --font-heebo and --font-heading to the selected body font */}
      {hasFontOverride && (
        <style dangerouslySetInnerHTML={{ __html: `
          #lp-root { --font-heebo: var(${fontCssVar}); --font-heading: var(${fontCssVar}); }
        ` }} />
      )}
      {/* Sticky Header */}
      <StickyHeader
        programName={pageTitle || (language === "en" ? (program?.name_en || program?.name_he) : program?.name_he)}
        stickyTitle={settings?.sticky_header_title}
        language={language}
        phone={settings?.phone_number}
        logoUrl={settings?.logo_url}
      />

      {/* Main Content */}
      <main>
        {/* Render explicit sections with auto-sections injected after hero */}
        {mainSections.map((section, index) => (
          <div key={section.id}>
            <SectionErrorBoundary sectionType={section.section_type}>
              {renderSection(section, language, pageId, programId, urlParams, pageSlug, eventsMap, programsMap)}
            </SectionErrorBoundary>
            {/* After hero, inject auto-generated sections */}
            {index === heroIndex && filteredAutoSections.length > 0 && (
              <>
                {filteredAutoSections.map((el) => (
                  <SectionErrorBoundary key={el.key as string} sectionType={el.key as string}>
                    {el}
                  </SectionErrorBoundary>
                ))}
              </>
            )}
          </div>
        ))}

        {/* If no hero section, put auto sections at the top */}
        {!hasHero && filteredAutoSections.length > 0 && (
          <>
            {filteredAutoSections.map((el) => (
              <SectionErrorBoundary key={el.key as string} sectionType={el.key as string}>
                {el}
              </SectionErrorBoundary>
            ))}
          </>
        )}

        {/* No auto-injected CTA section.
         *
         * Previously: when no `cta` section existed in the visible sections list,
         * the layout would inject a hardcoded fallback CTA in Hebrew. This had
         * two bugs:
         *   1. Editors who deliberately removed (or hid) the CTA section would
         *      still see it on the live page — the layout silently put it back.
         *   2. The fallback was hardcoded with `_he` fields only, leaking
         *      Hebrew copy onto English / Arabic landing pages.
         *
         * Editors who want a CTA section must add one explicitly via the
         * builder. The principle: visible sections list = exactly what renders. */}
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
                src={settings?.logo_url || ONO_LOGO}
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
      {/* Sticky bottom CTA bar — opt-in via settings.sticky_bar_enabled, user-dismissable */}
      {settings?.sticky_bar_enabled && (
        <PageStickyBar settings={settings} language={language} pageId={pageId} />
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
          pageInterestAreas={pageInterestAreas}
          unknownOption={unknownOption}
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

      {/* Skip all tracking & overlays in heatmap preview mode */}
      {!isHeatmapPreview && (
        <>
          {/* Client-side pixel tracking — Consent Mode v2 + engagement events */}
          <PixelTracker config={{
            ga4Id: settings?.ga4_id,
            metaPixelId: settings?.meta_pixel_id,
            googleAdsId: settings?.google_ads_id,
            googleAdsConversionLabel: settings?.google_ads_conversion_label,
            tikTokPixelId: settings?.tiktok_pixel_id,
            linkedInPartnerId: settings?.linkedin_partner_id,
            outbrainAccountId: settings?.outbrain_account_id,
            taboolaAccountId: settings?.taboola_account_id,
            twitterPixelId: settings?.twitter_pixel_id,
            pageId: pageId,
            pageSlug: pageSlug,
          } satisfies PixelConfig} />

          {/* Compliance widgets */}
          <CookieConsent language={language} />
          <AccessibilityWidget language={language} />
        </>
      )}

      {/* Scroll depth + time-on-page tracking (invisible, renders nothing) */}
      {pageId && !isHeatmapPreview && (
        <>
          <ScrollTracker
            pageId={pageId}
            cookieId={cookieId}
          />
          <ClickTracker
            pageId={pageId}
            cookieId={cookieId}
          />
          <ViewportTracker
            pageId={pageId}
            cookieId={cookieId}
          />
        </>
      )}
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

