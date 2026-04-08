"use client";

/**
 * Layouts 2-10 for the thank-you template system.
 *
 * Each layout reads `ctx.template.content` and renders a visually distinct
 * post-conversion experience. They all share the same content shape (defined
 * in `TyContentFields`) but pick the fields they care about and lay them out
 * differently.
 *
 * Layouts:
 *  - MinimalLightLayout      — clean white card, traditional academic feel
 *  - CelebrationLayout       — confetti shower + bright gradient
 *  - PersonalAdvisorLayout   — advisor photo + quote, builds trust
 *  - CalendarFocusLayout     — book-a-call hero, embedded calendar CTA
 *  - VideoWelcomeLayout      — full-bleed welcome video from dean
 *  - ResourceLibraryLayout   — downloadable brochure / faq / video links
 *  - SocialProofLayout       — three student testimonials front and center
 *  - UrgencyCohortLayout     — countdown to next intake start
 *  - MultiChannelLayout      — WhatsApp, phone, email, calendar in one grid
 */

import { useEffect, useState } from "react";
import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  DocumentIcon,
  LAYOUT_ANIMATIONS,
  MailIcon,
  PhoneIcon,
  PlayIcon,
  StarIcon,
  WhatsAppIcon,
  field,
  normalizeEmbedUrl,
  socialLinks,
  whatsappHref,
  type LayoutComponent,
} from "./shared";

// ─────────────────────────────────────────────────────────────────────────────
// 2. Minimal Light
// ─────────────────────────────────────────────────────────────────────────────

export const MinimalLightLayout: LayoutComponent = ({ ctx }) => {
  const lang = ctx.language;
  const c = ctx.template.content;
  const cfg = ctx.template.config;
  const accent = cfg.accent_color || "#2A2628";
  const isRtl = lang === "he" || lang === "ar";

  const heading = field(c, lang, "heading", ctx.displayName);
  const subheading = field(c, lang, "subheading", ctx.displayName);
  const stepsLabel = field(c, lang, "steps_label", ctx.displayName);
  const whatsappCta = field(c, lang, "whatsapp_cta", ctx.displayName);
  const whatsappMsg = field(c, lang, "whatsapp_msg", ctx.displayName);
  const backLink = field(c, lang, "back_link", ctx.displayName);
  const copyright = field(c, lang, "copyright", ctx.displayName);

  const steps = [
    field(c, lang, "step_1", ctx.displayName),
    field(c, lang, "step_2", ctx.displayName),
    field(c, lang, "step_3", ctx.displayName),
  ].filter(Boolean);

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col items-center px-4 py-12 md:py-20"
      style={{ fontFamily: "'Rubik','Heebo',sans-serif" }}
    >
      <style>{LAYOUT_ANIMATIONS}</style>
      {ctx.logoUrl && (
        <div className="mb-12" style={{ animation: "ty-fade-in-down 0.6s ease-out both" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ctx.logoUrl} alt="logo" className="h-12 object-contain" />
        </div>
      )}

      <div className="w-full max-w-2xl" style={{ animation: "ty-fade-in-up 0.7s ease-out 0.2s both" }}>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-8 md:p-12 text-center">
          {cfg.show_checkmark !== false && (
            <div
              className="mx-auto mb-6 w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: `${accent}1a`, color: accent }}
            >
              <CheckIcon className="w-8 h-8" />
            </div>
          )}

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">{heading}</h1>
          {subheading && <p className="text-lg text-gray-600 max-w-md mx-auto">{subheading}</p>}
          {ctx.programName && (
            <p className="text-sm font-semibold mt-3" style={{ color: accent }}>
              {ctx.programName}
            </p>
          )}

          {steps.length > 0 && (
            <div className={`mt-10 pt-8 border-t border-gray-100 ${isRtl ? "text-right" : "text-left"}`}>
              {stepsLabel && (
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-5 text-center">{stepsLabel}</p>
              )}
              <div className="grid md:grid-cols-3 gap-6">
                {steps.map((s, i) => (
                  <div key={i} className="text-center">
                    <div
                      className="mx-auto w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-3"
                      style={{ background: `${accent}1a`, color: accent }}
                    >
                      {i + 1}
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ctx.showWhatsapp !== false && ctx.whatsappNumber && whatsappCta && (
            <div className="mt-10">
              <a
                href={whatsappHref(ctx.whatsappNumber, whatsappMsg)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[#25D366] text-white font-bold text-base hover:bg-[#20bc5a] transition-all hover:scale-[1.02]"
              >
                <WhatsAppIcon /> {whatsappCta}
              </a>
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <a
            href={ctx.pageSlug ? `/lp/${ctx.pageSlug}` : "/"}
            className="text-gray-400 text-xs hover:text-gray-600 transition-colors"
          >
            {backLink}
          </a>
          {copyright && <p className="text-gray-400 text-xs mt-2">{copyright}</p>}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. Celebration — confetti + bright gradient
// ─────────────────────────────────────────────────────────────────────────────

export const CelebrationLayout: LayoutComponent = ({ ctx }) => {
  const lang = ctx.language;
  const c = ctx.template.content;
  const cfg = ctx.template.config;
  const accent = cfg.accent_color || "#B8D900";
  const isRtl = lang === "he" || lang === "ar";

  const heading = field(c, lang, "heading", ctx.displayName);
  const subheading = field(c, lang, "subheading", ctx.displayName);
  const whatsappCta = field(c, lang, "whatsapp_cta", ctx.displayName);
  const whatsappMsg = field(c, lang, "whatsapp_msg", ctx.displayName);
  const backLink = field(c, lang, "back_link", ctx.displayName);

  const [pieces, setPieces] = useState<Array<{ left: string; delay: string; color: string }>>([]);

  useEffect(() => {
    if (cfg.show_confetti === false) return;
    const colors = [accent, "#FF6B35", "#4FC3F7", "#FFC107", "#E91E63"];
    const items = Array.from({ length: 60 }, () => ({
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setPieces(items);
  }, [accent, cfg.show_confetti]);

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${accent}26 0%, #fff 50%, #FF6B3526 100%)`,
        fontFamily: "'Rubik','Heebo',sans-serif",
      }}
    >
      <style>{LAYOUT_ANIMATIONS}</style>

      {/* Confetti shower */}
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        {pieces.map((p, i) => (
          <div
            key={i}
            className="absolute w-2 h-3 rounded-sm"
            style={{
              left: p.left,
              top: 0,
              background: p.color,
              animation: `ty-confetti-fall 4s ${p.delay} ease-in infinite`,
            }}
          />
        ))}
      </div>

      {ctx.logoUrl && (
        <div className="mb-8 relative z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ctx.logoUrl} alt="logo" className="h-12 object-contain" />
        </div>
      )}

      <div className="relative z-10 max-w-xl text-center" style={{ animation: "ty-scale-in 0.8s ease-out both" }}>
        <div className="text-7xl mb-6">🎉</div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 leading-tight">{heading}</h1>
        {subheading && <p className="text-xl text-gray-700 mb-8">{subheading}</p>}
        {ctx.programName && (
          <p className="text-base font-semibold mb-8" style={{ color: accent }}>
            {ctx.programName}
          </p>
        )}

        {ctx.showWhatsapp !== false && ctx.whatsappNumber && whatsappCta && (
          <a
            href={whatsappHref(ctx.whatsappNumber, whatsappMsg)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-10 py-5 rounded-full bg-[#25D366] text-white font-bold text-lg shadow-2xl hover:scale-105 transition-transform"
          >
            <WhatsAppIcon className="w-6 h-6" /> {whatsappCta}
          </a>
        )}

        {backLink && (
          <div className="mt-10">
            <a
              href={ctx.pageSlug ? `/lp/${ctx.pageSlug}` : "/"}
              className="text-gray-500 text-sm hover:text-gray-700"
            >
              {backLink}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. Personal Advisor
// ─────────────────────────────────────────────────────────────────────────────

export const PersonalAdvisorLayout: LayoutComponent = ({ ctx }) => {
  const lang = ctx.language;
  const c = ctx.template.content;
  const cfg = ctx.template.config;
  const accent = cfg.accent_color || "#B8D900";
  const isRtl = lang === "he" || lang === "ar";

  const heading = field(c, lang, "heading", ctx.displayName);
  const subheading = field(c, lang, "subheading", ctx.displayName);
  const advisorName = field(c, lang, "advisor_name", ctx.displayName);
  const advisorTitle = field(c, lang, "advisor_title", ctx.displayName);
  const advisorQuote = field(c, lang, "advisor_quote", ctx.displayName);
  const advisorPhoto = field(c, lang, "advisor_photo_url", ctx.displayName);
  const whatsappCta = field(c, lang, "whatsapp_cta", ctx.displayName);
  const whatsappMsg = field(c, lang, "whatsapp_msg", ctx.displayName);
  const calendarCta = field(c, lang, "calendar_cta", ctx.displayName);
  const backLink = field(c, lang, "back_link", ctx.displayName);

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col items-center px-4 py-12 md:py-20"
      style={{ fontFamily: "'Rubik','Heebo',sans-serif" }}
    >
      <style>{LAYOUT_ANIMATIONS}</style>
      {ctx.logoUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={ctx.logoUrl} alt="logo" className="h-12 object-contain mb-10" />
      )}

      <div className="w-full max-w-2xl" style={{ animation: "ty-fade-in-up 0.7s ease-out both" }}>
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
          <div
            className="px-8 py-6 text-center text-white"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}dd)` }}
          >
            <CheckIcon className="w-10 h-10 mx-auto mb-3" />
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{heading}</h1>
            {subheading && <p className="text-white/90 text-sm">{subheading}</p>}
          </div>

          <div className="p-8 md:p-10">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {advisorPhoto && (
                <div className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={advisorPhoto}
                    alt={advisorName || "advisor"}
                    className="w-32 h-32 rounded-full object-cover border-4"
                    style={{ borderColor: accent }}
                  />
                </div>
              )}
              <div className={`flex-1 ${isRtl ? "text-right" : "text-left"}`}>
                {advisorName && <h2 className="text-2xl font-bold text-gray-900">{advisorName}</h2>}
                {advisorTitle && <p className="text-sm text-gray-600 mt-1">{advisorTitle}</p>}
                {advisorQuote && (
                  <blockquote
                    className={`mt-4 text-gray-700 italic leading-relaxed pl-4 ${isRtl ? "border-r-4 pr-4 pl-0" : "border-l-4"}`}
                    style={{ borderColor: accent }}
                  >
                    &ldquo;{advisorQuote}&rdquo;
                  </blockquote>
                )}
              </div>
            </div>

            <div className="mt-8 grid sm:grid-cols-2 gap-3">
              {ctx.showWhatsapp !== false && ctx.whatsappNumber && whatsappCta && (
                <a
                  href={whatsappHref(ctx.whatsappNumber, whatsappMsg)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#25D366] text-white font-semibold hover:bg-[#20bc5a] transition-colors"
                >
                  <WhatsAppIcon /> {whatsappCta}
                </a>
              )}
              {ctx.showCalendar && ctx.calendarUrl && calendarCta && (
                <a
                  href={ctx.calendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 font-semibold transition-colors"
                  style={{ borderColor: accent, color: accent }}
                >
                  <CalendarIcon /> {calendarCta}
                </a>
              )}
            </div>
          </div>
        </div>

        {backLink && (
          <div className="mt-6 text-center">
            <a href={ctx.pageSlug ? `/lp/${ctx.pageSlug}` : "/"} className="text-gray-400 text-xs hover:text-gray-600">
              {backLink}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. Calendar Focus
// ─────────────────────────────────────────────────────────────────────────────

export const CalendarFocusLayout: LayoutComponent = ({ ctx }) => {
  const lang = ctx.language;
  const c = ctx.template.content;
  const cfg = ctx.template.config;
  const accent = cfg.accent_color || "#B8D900";
  const isRtl = lang === "he" || lang === "ar";

  const heading = field(c, lang, "heading", ctx.displayName);
  const subheading = field(c, lang, "subheading", ctx.displayName);
  const calendarLabel = field(c, lang, "calendar_label", ctx.displayName);
  const calendarCta = field(c, lang, "calendar_cta", ctx.displayName);
  const whatsappCta = field(c, lang, "whatsapp_cta", ctx.displayName);
  const whatsappMsg = field(c, lang, "whatsapp_msg", ctx.displayName);
  const backLink = field(c, lang, "back_link", ctx.displayName);

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-screen bg-gradient-to-br from-[#1a1618] via-[#2a2628] to-[#1a1618] flex flex-col items-center justify-center px-4 py-16"
      style={{ fontFamily: "'Rubik','Heebo',sans-serif" }}
    >
      <style>{LAYOUT_ANIMATIONS}</style>
      {ctx.logoUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={ctx.logoUrl} alt="logo" className="h-10 object-contain brightness-200 mb-10" />
      )}

      <div className="w-full max-w-xl text-center" style={{ animation: "ty-fade-in-up 0.7s ease-out both" }}>
        <div
          className="mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: `${accent}33`, color: accent, border: `2px solid ${accent}66` }}
        >
          <CalendarIcon className="w-10 h-10" />
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4 leading-tight">{heading}</h1>
        {subheading && <p className="text-white/70 text-lg mb-3 max-w-md mx-auto">{subheading}</p>}
        {calendarLabel && (
          <p className="text-sm uppercase tracking-wider mb-8" style={{ color: accent }}>
            {calendarLabel}
          </p>
        )}

        {ctx.showCalendar !== false && ctx.calendarUrl && calendarCta && (
          <a
            href={ctx.calendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-3 px-10 py-5 rounded-2xl text-black font-extrabold text-lg shadow-[0_0_40px_rgba(184,217,0,0.4)] hover:scale-[1.03] transition-all"
            style={{ background: accent }}
          >
            <CalendarIcon className="w-5 h-5" /> {calendarCta}
          </a>
        )}

        {ctx.showWhatsapp !== false && ctx.whatsappNumber && whatsappCta && (
          <div className="mt-6">
            <a
              href={whatsappHref(ctx.whatsappNumber, whatsappMsg)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-white/60 text-sm hover:text-white transition-colors"
            >
              <WhatsAppIcon className="w-4 h-4" /> {whatsappCta}
            </a>
          </div>
        )}

        {backLink && (
          <div className="mt-12">
            <a
              href={ctx.pageSlug ? `/lp/${ctx.pageSlug}` : "/"}
              className="text-white/30 text-xs hover:text-white/60"
            >
              {backLink}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. Video Welcome
// ─────────────────────────────────────────────────────────────────────────────

export const VideoWelcomeLayout: LayoutComponent = ({ ctx }) => {
  const lang = ctx.language;
  const c = ctx.template.content;
  const cfg = ctx.template.config;
  const accent = cfg.accent_color || "#B8D900";
  const isRtl = lang === "he" || lang === "ar";

  const heading = field(c, lang, "heading", ctx.displayName);
  const subheading = field(c, lang, "subheading", ctx.displayName);
  const videoLabel = field(c, lang, "video_label", ctx.displayName);
  const whatsappCta = field(c, lang, "whatsapp_cta", ctx.displayName);
  const whatsappMsg = field(c, lang, "whatsapp_msg", ctx.displayName);
  const backLink = field(c, lang, "back_link", ctx.displayName);

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-screen bg-gradient-to-b from-black via-[#0a0a0a] to-black flex flex-col items-center px-4 py-12"
      style={{ fontFamily: "'Rubik','Heebo',sans-serif" }}
    >
      <style>{LAYOUT_ANIMATIONS}</style>
      {ctx.logoUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={ctx.logoUrl} alt="logo" className="h-10 object-contain brightness-200 mb-10" />
      )}

      <div className="w-full max-w-3xl" style={{ animation: "ty-fade-in-up 0.7s ease-out both" }}>
        <div className="text-center mb-8">
          <CheckIcon className="w-10 h-10 mx-auto mb-4" style={{ color: accent }} />
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3">{heading}</h1>
          {subheading && <p className="text-white/60 text-base">{subheading}</p>}
        </div>

        {videoLabel && (
          <p className="text-xs uppercase tracking-widest text-center mb-3" style={{ color: accent }}>
            {videoLabel}
          </p>
        )}

        {ctx.videoUrl ? (
          <div className="rounded-3xl overflow-hidden border-2 shadow-2xl" style={{ borderColor: `${accent}66` }}>
            <iframe
              src={normalizeEmbedUrl(ctx.videoUrl)}
              className="w-full aspect-video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="welcome"
            />
          </div>
        ) : (
          <div
            className="rounded-3xl aspect-video flex items-center justify-center border-2"
            style={{ borderColor: `${accent}66`, background: "rgba(255,255,255,0.03)" }}
          >
            <PlayIcon className="w-20 h-20" style={{ color: accent }} />
          </div>
        )}

        {ctx.showWhatsapp !== false && ctx.whatsappNumber && whatsappCta && (
          <div className="mt-8 text-center">
            <a
              href={whatsappHref(ctx.whatsappNumber, whatsappMsg)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-[#25D366] text-white font-bold hover:bg-[#20bc5a] transition-colors"
            >
              <WhatsAppIcon /> {whatsappCta}
            </a>
          </div>
        )}

        {backLink && (
          <div className="mt-10 text-center">
            <a href={ctx.pageSlug ? `/lp/${ctx.pageSlug}` : "/"} className="text-white/30 text-xs hover:text-white/60">
              {backLink}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. Resource Library
// ─────────────────────────────────────────────────────────────────────────────

export const ResourceLibraryLayout: LayoutComponent = ({ ctx }) => {
  const lang = ctx.language;
  const c = ctx.template.content;
  const cfg = ctx.template.config;
  const accent = cfg.accent_color || "#B8D900";
  const isRtl = lang === "he" || lang === "ar";

  const heading = field(c, lang, "heading", ctx.displayName);
  const subheading = field(c, lang, "subheading", ctx.displayName);
  const brochureLabel = field(c, lang, "brochure_label", ctx.displayName);
  const brochureUrl = field(c, lang, "brochure_url", ctx.displayName);
  const faqLabel = field(c, lang, "faq_label", ctx.displayName);
  const faqUrl = field(c, lang, "faq_url", ctx.displayName);
  const videoLabel = field(c, lang, "video_label", ctx.displayName);
  const whatsappCta = field(c, lang, "whatsapp_cta", ctx.displayName);
  const whatsappMsg = field(c, lang, "whatsapp_msg", ctx.displayName);
  const backLink = field(c, lang, "back_link", ctx.displayName);

  const resources = [
    brochureLabel && { label: brochureLabel, href: brochureUrl || "#", icon: <DocumentIcon className="w-6 h-6" /> },
    faqLabel && { label: faqLabel, href: faqUrl || "#", icon: <DocumentIcon className="w-6 h-6" /> },
    videoLabel && ctx.videoUrl && { label: videoLabel, href: ctx.videoUrl, icon: <PlayIcon className="w-6 h-6" /> },
  ].filter(Boolean) as Array<{ label: string; href: string; icon: React.ReactNode }>;

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-screen bg-white flex flex-col items-center px-4 py-12"
      style={{ fontFamily: "'Rubik','Heebo',sans-serif" }}
    >
      <style>{LAYOUT_ANIMATIONS}</style>
      {ctx.logoUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={ctx.logoUrl} alt="logo" className="h-12 object-contain mb-10" />
      )}

      <div className="w-full max-w-3xl" style={{ animation: "ty-fade-in-up 0.7s ease-out both" }}>
        <div className="text-center mb-10">
          <CheckIcon className="w-10 h-10 mx-auto mb-4" style={{ color: accent }} />
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">{heading}</h1>
          {subheading && <p className="text-gray-600 text-lg max-w-md mx-auto">{subheading}</p>}
        </div>

        {resources.length > 0 && (
          <div className="grid md:grid-cols-3 gap-4">
            {resources.map((r, i) => (
              <a
                key={i}
                href={r.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-gray-200 bg-white hover:border-2 hover:shadow-lg transition-all text-center"
                style={{ borderColor: i === 0 ? accent : undefined }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: `${accent}1a`, color: accent }}
                >
                  {r.icon}
                </div>
                <span className="font-semibold text-gray-900">{r.label}</span>
              </a>
            ))}
          </div>
        )}

        {ctx.showWhatsapp !== false && ctx.whatsappNumber && whatsappCta && (
          <div className="mt-10 text-center">
            <a
              href={whatsappHref(ctx.whatsappNumber, whatsappMsg)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[#25D366] text-white font-bold hover:bg-[#20bc5a] transition-colors"
            >
              <WhatsAppIcon /> {whatsappCta}
            </a>
          </div>
        )}

        {backLink && (
          <div className="mt-10 text-center">
            <a href={ctx.pageSlug ? `/lp/${ctx.pageSlug}` : "/"} className="text-gray-400 text-xs hover:text-gray-600">
              {backLink}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. Social Proof
// ─────────────────────────────────────────────────────────────────────────────

export const SocialProofLayout: LayoutComponent = ({ ctx }) => {
  const lang = ctx.language;
  const c = ctx.template.content;
  const cfg = ctx.template.config;
  const accent = cfg.accent_color || "#B8D900";
  const isRtl = lang === "he" || lang === "ar";

  const heading = field(c, lang, "heading", ctx.displayName);
  const subheading = field(c, lang, "subheading", ctx.displayName);
  const testimonialsLabel = field(c, lang, "testimonials_label", ctx.displayName);
  const whatsappCta = field(c, lang, "whatsapp_cta", ctx.displayName);
  const whatsappMsg = field(c, lang, "whatsapp_msg", ctx.displayName);
  const backLink = field(c, lang, "back_link", ctx.displayName);

  const testimonials = [
    {
      name: field(c, lang, "testimonial_1_name", ctx.displayName),
      quote: field(c, lang, "testimonial_1_quote", ctx.displayName),
      photo: field(c, lang, "testimonial_1_photo_url", ctx.displayName),
    },
    {
      name: field(c, lang, "testimonial_2_name", ctx.displayName),
      quote: field(c, lang, "testimonial_2_quote", ctx.displayName),
      photo: field(c, lang, "testimonial_2_photo_url", ctx.displayName),
    },
    {
      name: field(c, lang, "testimonial_3_name", ctx.displayName),
      quote: field(c, lang, "testimonial_3_quote", ctx.displayName),
      photo: field(c, lang, "testimonial_3_photo_url", ctx.displayName),
    },
  ].filter((t) => t.quote);

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col items-center px-4 py-12"
      style={{ fontFamily: "'Rubik','Heebo',sans-serif" }}
    >
      <style>{LAYOUT_ANIMATIONS}</style>
      {ctx.logoUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={ctx.logoUrl} alt="logo" className="h-12 object-contain mb-10" />
      )}

      <div className="w-full max-w-5xl" style={{ animation: "ty-fade-in-up 0.7s ease-out both" }}>
        <div className="text-center mb-10">
          <CheckIcon className="w-10 h-10 mx-auto mb-4" style={{ color: accent }} />
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">{heading}</h1>
          {subheading && <p className="text-gray-600 text-lg">{subheading}</p>}
        </div>

        {testimonialsLabel && (
          <p className="text-center text-xs uppercase tracking-widest text-gray-500 mb-6">{testimonialsLabel}</p>
        )}

        {testimonials.length > 0 && (
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-1 mb-3" style={{ color: accent }}>
                  {[...Array(5)].map((_, k) => (
                    <StarIcon key={k} className="w-4 h-4" />
                  ))}
                </div>
                <blockquote className="text-gray-700 text-sm leading-relaxed mb-5 italic">&ldquo;{t.quote}&rdquo;</blockquote>
                <div className="flex items-center gap-3">
                  {t.photo ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={t.photo} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                      style={{ background: accent }}
                    >
                      {t.name?.charAt(0) || "?"}
                    </div>
                  )}
                  {t.name && <span className="text-sm font-semibold text-gray-900">{t.name}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {ctx.showWhatsapp !== false && ctx.whatsappNumber && whatsappCta && (
          <div className="mt-10 text-center">
            <a
              href={whatsappHref(ctx.whatsappNumber, whatsappMsg)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[#25D366] text-white font-bold hover:bg-[#20bc5a] transition-colors"
            >
              <WhatsAppIcon /> {whatsappCta}
            </a>
          </div>
        )}

        {backLink && (
          <div className="mt-10 text-center">
            <a href={ctx.pageSlug ? `/lp/${ctx.pageSlug}` : "/"} className="text-gray-400 text-xs hover:text-gray-600">
              {backLink}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 9. Urgency Cohort — countdown
// ─────────────────────────────────────────────────────────────────────────────

export const UrgencyCohortLayout: LayoutComponent = ({ ctx }) => {
  const lang = ctx.language;
  const c = ctx.template.content;
  const cfg = ctx.template.config;
  const accent = cfg.accent_color || "#FF6B35";
  const isRtl = lang === "he" || lang === "ar";

  const heading = field(c, lang, "heading", ctx.displayName);
  const subheading = field(c, lang, "subheading", ctx.displayName);
  const intakeLabel = field(c, lang, "intake_label", ctx.displayName);
  const intakeDateText = field(c, lang, "intake_date_text", ctx.displayName);
  const countdownLabel = field(c, lang, "countdown_label", ctx.displayName);
  const whatsappCta = field(c, lang, "whatsapp_cta", ctx.displayName);
  const whatsappMsg = field(c, lang, "whatsapp_msg", ctx.displayName);
  const calendarCta = field(c, lang, "calendar_cta", ctx.displayName);
  const backLink = field(c, lang, "back_link", ctx.displayName);

  // Try to parse intake_date_text into a Date for the countdown.
  // Falls back to "30 days from now" so the page never looks broken.
  const targetDate = (() => {
    if (intakeDateText) {
      const parsed = new Date(intakeDateText);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 30);
    return fallback;
  })();

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const diff = Math.max(0, targetDate.getTime() - now.getTime());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-screen bg-gradient-to-br from-[#1a0f0a] via-[#2a1810] to-[#1a0f0a] flex flex-col items-center justify-center px-4 py-12"
      style={{ fontFamily: "'Rubik','Heebo',sans-serif" }}
    >
      <style>{LAYOUT_ANIMATIONS}</style>
      {ctx.logoUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={ctx.logoUrl} alt="logo" className="h-10 object-contain brightness-200 mb-10" />
      )}

      <div className="w-full max-w-2xl text-center" style={{ animation: "ty-fade-in-up 0.7s ease-out both" }}>
        <div
          className="mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: `${accent}33`, color: accent, border: `2px solid ${accent}66` }}
        >
          <ClockIcon className="w-10 h-10" />
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3">{heading}</h1>
        {subheading && <p className="text-white/70 text-lg mb-6">{subheading}</p>}

        {intakeLabel && (
          <p className="text-xs uppercase tracking-widest text-white/50 mb-2">{intakeLabel}</p>
        )}
        {intakeDateText && (
          <p className="text-xl font-bold mb-8" style={{ color: accent }}>
            {intakeDateText}
          </p>
        )}

        {countdownLabel && <p className="text-xs uppercase tracking-widest text-white/50 mb-3">{countdownLabel}</p>}
        <div className="grid grid-cols-4 gap-3 max-w-md mx-auto mb-10">
          {[
            { v: days, label: lang === "en" ? "days" : lang === "ar" ? "أيام" : "ימים" },
            { v: hours, label: lang === "en" ? "hours" : lang === "ar" ? "ساعات" : "שעות" },
            { v: minutes, label: lang === "en" ? "min" : lang === "ar" ? "دقائق" : "דקות" },
            { v: seconds, label: lang === "en" ? "sec" : lang === "ar" ? "ثواني" : "שניות" },
          ].map((u, i) => (
            <div
              key={i}
              className="rounded-2xl p-3 backdrop-blur-md border"
              style={{ background: "rgba(255,255,255,0.05)", borderColor: `${accent}33` }}
            >
              <div className="text-3xl font-extrabold tabular-nums" style={{ color: accent }}>
                {String(u.v).padStart(2, "0")}
              </div>
              <div className="text-[10px] text-white/50 uppercase tracking-wider mt-1">{u.label}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {ctx.showWhatsapp !== false && ctx.whatsappNumber && whatsappCta && (
            <a
              href={whatsappHref(ctx.whatsappNumber, whatsappMsg)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-black font-bold transition-transform hover:scale-105"
              style={{ background: accent }}
            >
              <WhatsAppIcon /> {whatsappCta}
            </a>
          )}
          {ctx.showCalendar && ctx.calendarUrl && calendarCta && (
            <a
              href={ctx.calendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 text-white font-bold transition-colors"
              style={{ borderColor: `${accent}99` }}
            >
              <CalendarIcon /> {calendarCta}
            </a>
          )}
        </div>

        {backLink && (
          <div className="mt-10">
            <a href={ctx.pageSlug ? `/lp/${ctx.pageSlug}` : "/"} className="text-white/30 text-xs hover:text-white/60">
              {backLink}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 10. Multi Channel
// ─────────────────────────────────────────────────────────────────────────────

export const MultiChannelLayout: LayoutComponent = ({ ctx }) => {
  const lang = ctx.language;
  const c = ctx.template.content;
  const cfg = ctx.template.config;
  const accent = cfg.accent_color || "#B8D900";
  const isRtl = lang === "he" || lang === "ar";

  const heading = field(c, lang, "heading", ctx.displayName);
  const subheading = field(c, lang, "subheading", ctx.displayName);
  const channelsLabel = field(c, lang, "channels_label", ctx.displayName);
  const whatsappCta = field(c, lang, "whatsapp_cta", ctx.displayName);
  const whatsappMsg = field(c, lang, "whatsapp_msg", ctx.displayName);
  const phoneCta = field(c, lang, "phone_cta", ctx.displayName);
  const emailCta = field(c, lang, "email_cta", ctx.displayName);
  const calendarCta = field(c, lang, "calendar_cta", ctx.displayName);
  const backLink = field(c, lang, "back_link", ctx.displayName);

  const links = socialLinks(ctx);

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-screen flex flex-col items-center px-4 py-12"
      style={{
        background: `linear-gradient(135deg, ${accent}1a 0%, #fff 50%, ${accent}11 100%)`,
        fontFamily: "'Rubik','Heebo',sans-serif",
      }}
    >
      <style>{LAYOUT_ANIMATIONS}</style>
      {ctx.logoUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={ctx.logoUrl} alt="logo" className="h-12 object-contain mb-10" />
      )}

      <div className="w-full max-w-2xl" style={{ animation: "ty-fade-in-up 0.7s ease-out both" }}>
        <div className="text-center mb-10">
          <div
            className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: `${accent}1a`, color: accent }}
          >
            <CheckIcon className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">{heading}</h1>
          {subheading && <p className="text-gray-600 text-lg">{subheading}</p>}
        </div>

        {channelsLabel && (
          <p className="text-center text-xs uppercase tracking-widest text-gray-500 mb-5">{channelsLabel}</p>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          {ctx.showWhatsapp !== false && ctx.whatsappNumber && whatsappCta && (
            <a
              href={whatsappHref(ctx.whatsappNumber, whatsappMsg)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-5 rounded-2xl bg-white border-2 border-gray-100 hover:border-[#25D366] transition-all hover:shadow-lg"
            >
              <div className="w-12 h-12 rounded-xl bg-[#25D366]/10 flex items-center justify-center text-[#25D366] shrink-0">
                <WhatsAppIcon />
              </div>
              <div className={`flex-1 ${isRtl ? "text-right" : "text-left"}`}>
                <div className="font-bold text-gray-900">WhatsApp</div>
                <div className="text-xs text-gray-500">{whatsappCta}</div>
              </div>
            </a>
          )}

          {phoneCta && ctx.whatsappNumber && (
            <a
              href={`tel:${ctx.whatsappNumber}`}
              className="flex items-center gap-4 p-5 rounded-2xl bg-white border-2 border-gray-100 transition-all hover:shadow-lg"
              style={{ borderColor: undefined }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = accent)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${accent}1a`, color: accent }}
              >
                <PhoneIcon />
              </div>
              <div className={`flex-1 ${isRtl ? "text-right" : "text-left"}`}>
                <div className="font-bold text-gray-900">{phoneCta}</div>
                <div className="text-xs text-gray-500">{ctx.whatsappNumber}</div>
              </div>
            </a>
          )}

          {emailCta && (
            <a
              href="mailto:info@ono.ac.il"
              className="flex items-center gap-4 p-5 rounded-2xl bg-white border-2 border-gray-100 hover:border-blue-400 transition-all hover:shadow-lg"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                <MailIcon />
              </div>
              <div className={`flex-1 ${isRtl ? "text-right" : "text-left"}`}>
                <div className="font-bold text-gray-900">{emailCta}</div>
                <div className="text-xs text-gray-500">info@ono.ac.il</div>
              </div>
            </a>
          )}

          {ctx.showCalendar !== false && ctx.calendarUrl && calendarCta && (
            <a
              href={ctx.calendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-5 rounded-2xl bg-white border-2 border-gray-100 hover:border-purple-400 transition-all hover:shadow-lg"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500 shrink-0">
                <CalendarIcon />
              </div>
              <div className={`flex-1 ${isRtl ? "text-right" : "text-left"}`}>
                <div className="font-bold text-gray-900">{calendarCta}</div>
                <div className="text-xs text-gray-500">{lang === "en" ? "Pick a time" : lang === "ar" ? "اختر وقتاً" : "בחרו זמן"}</div>
              </div>
            </a>
          )}
        </div>

        {ctx.showSocial !== false && links.length > 0 && (
          <div className="mt-8 flex justify-center gap-3">
            {links.map((link) => (
              <a
                key={link.key}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:scale-110 transition-transform"
              >
                {link.icon}
              </a>
            ))}
          </div>
        )}

        {backLink && (
          <div className="mt-10 text-center">
            <a href={ctx.pageSlug ? `/lp/${ctx.pageSlug}` : "/"} className="text-gray-400 text-xs hover:text-gray-600">
              {backLink}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
