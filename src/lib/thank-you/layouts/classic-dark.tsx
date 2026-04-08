"use client";

/**
 * Layout 1: Classic Dark
 * Ono's current design - dark background, glowing green accent, animated
 * checkmark, three-step timeline, WhatsApp + calendar + social buttons.
 */

import { useState } from "react";
import {
  CalendarIcon,
  CheckIcon,
  LAYOUT_ANIMATIONS,
  PhoneIcon,
  WhatsAppIcon,
  field,
  normalizeEmbedUrl,
  socialLinks,
  whatsappHref,
  type LayoutComponent,
} from "./shared";

export const ClassicDarkLayout: LayoutComponent = ({ ctx }) => {
  const [shared, setShared] = useState(false);
  const lang = ctx.language;
  const content = ctx.template.content;
  const config = ctx.template.config;
  const accent = config.accent_color || "#B8D900";
  const isRtl = lang === "he" || lang === "ar";

  const heading = field(content, lang, "heading", ctx.displayName);
  const subheading = field(content, lang, "subheading", ctx.displayName);
  const thankYouWord = field(content, lang, "thank_you_word", ctx.displayName);
  const stepsLabel = field(content, lang, "steps_label", ctx.displayName);
  const whatsappCta = field(content, lang, "whatsapp_cta", ctx.displayName);
  const whatsappMsg = field(content, lang, "whatsapp_msg", ctx.displayName);
  const calendarCta = field(content, lang, "calendar_cta", ctx.displayName);
  const socialLabel = field(content, lang, "social_label", ctx.displayName);
  const shareCta = field(content, lang, "share_cta", ctx.displayName);
  const shareText = field(content, lang, "share_text", ctx.displayName);
  const sharedLabel = field(content, lang, "shared_label", ctx.displayName);
  const backLink = field(content, lang, "back_link", ctx.displayName);
  const copyright = field(content, lang, "copyright", ctx.displayName);

  const steps = [
    field(content, lang, "step_1", ctx.displayName),
    field(content, lang, "step_2", ctx.displayName),
    field(content, lang, "step_3", ctx.displayName),
  ].filter(Boolean);

  const links = socialLinks(ctx);

  const handleShare = async () => {
    const text = ctx.programName ? `${shareText} - ${ctx.programName}` : shareText;
    const url = ctx.pageSlug ? `${window.location.origin}/lp/${ctx.pageSlug}` : "https://www.ono.ac.il";
    if (navigator.share) {
      try {
        await navigator.share({ title: text, url });
        setShared(true);
      } catch {
        /* user cancelled */
      }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`, "_blank", "noopener");
      setShared(true);
    }
    setTimeout(() => setShared(false), 3000);
  };

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-screen bg-gradient-to-br from-[#1a1618] via-[#2a2628] to-[#1a1618] flex flex-col items-center justify-start px-4 py-12 md:py-20"
      style={{ fontFamily: "'Rubik','Heebo',sans-serif" }}
    >
      <style>{LAYOUT_ANIMATIONS}</style>

      {/* Decorative gradient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[150px]"
          style={{ background: `${accent}0d` }}
        />
        <div
          className="absolute bottom-1/3 left-1/4 w-[300px] h-[300px] rounded-full blur-[120px]"
          style={{ background: `${accent}08` }}
        />
      </div>

      {/* Top accent bar */}
      <div
        className="fixed top-0 left-0 right-0 h-1 z-10"
        style={{ background: `linear-gradient(to left, ${accent}, ${accent}ee, ${accent})` }}
      />

      {/* Logo */}
      {ctx.logoUrl && (
        <div className="mb-10" style={{ animation: "ty-fade-in-down 0.6s ease-out 0.1s both" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ctx.logoUrl} alt="logo" className="h-10 object-contain brightness-200" />
        </div>
      )}

      <div className="relative z-10 w-full max-w-lg" style={{ animation: "ty-fade-in-up 0.7s ease-out 0.2s both" }}>
        <div className="bg-[#2a2628]/80 backdrop-blur-md rounded-3xl border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.5)] overflow-hidden">
          {/* Checkmark + heading */}
          <div className="px-8 pt-10 pb-6 text-center">
            {config.show_checkmark !== false && (
              <div className="relative mx-auto mb-6 w-20 h-20">
                <div
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{ background: `${accent}26`, animationDuration: "2s" }}
                />
                <div
                  className="relative w-20 h-20 rounded-full flex items-center justify-center border-2"
                  style={{ background: `${accent}33`, borderColor: `${accent}80` }}
                >
                  <CheckIcon className="w-10 h-10" />
                </div>
              </div>
            )}

            <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight mb-3">
              {ctx.displayName ? (
                <>
                  {thankYouWord || "תודה"} <span style={{ color: accent }}>{ctx.displayName}</span>!
                </>
              ) : (
                heading
              )}
            </h1>
            {ctx.displayName && subheading && <p className="text-white/60 text-base font-medium mb-1">{subheading}</p>}
            {ctx.programName && (
              <p className="text-sm mt-2" style={{ color: `${accent}b3` }}>
                {ctx.programName}
              </p>
            )}
          </div>

          {/* Steps */}
          {steps.length > 0 && (
            <div className="mx-6 mb-6 rounded-2xl bg-white/5 border border-white/8 p-5">
              {stepsLabel && (
                <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-4">{stepsLabel}</p>
              )}
              <div className="space-y-4">
                {steps.map((text, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: i === 0 ? `${accent}33` : "rgba(255,255,255,0.08)" }}
                    >
                      {i === 0 ? (
                        <CheckIcon className="w-5 h-5" />
                      ) : i === 1 ? (
                        <PhoneIcon className="w-5 h-5 text-white/50" />
                      ) : (
                        <CalendarIcon className="w-5 h-5 text-white/50" />
                      )}
                    </div>
                    <span className={`text-sm leading-relaxed pt-1.5 ${i === 0 ? "text-white/80 font-medium" : "text-white/40"}`}>
                      {text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WhatsApp */}
          {ctx.showWhatsapp !== false && ctx.whatsappNumber && whatsappCta && (
            <div className="px-6 mb-4">
              <a
                href={whatsappHref(ctx.whatsappNumber, ctx.programName ? `${whatsappMsg} - ${ctx.programName}` : whatsappMsg)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-[#25D366] text-white font-bold text-base transition-all duration-300 hover:bg-[#20bc5a] hover:scale-[1.01]"
              >
                <WhatsAppIcon /> {whatsappCta}
              </a>
            </div>
          )}

          {/* Calendar */}
          {ctx.showCalendar && ctx.calendarUrl && calendarCta && (
            <div className="px-6 mb-4">
              <a
                href={ctx.calendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl bg-white/10 border border-white/15 text-white font-medium text-sm transition-all hover:bg-white/15"
              >
                <CalendarIcon className="w-4 h-4" style={{ color: accent }} /> {calendarCta}
              </a>
            </div>
          )}

          {/* Video */}
          {ctx.showVideo && ctx.videoUrl && (
            <div className="px-6 mb-4">
              <div className="rounded-2xl overflow-hidden bg-black/40 border border-white/10">
                <iframe
                  src={normalizeEmbedUrl(ctx.videoUrl)}
                  className="w-full aspect-video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="welcome"
                />
              </div>
            </div>
          )}

          {(links.length > 0 || shareCta) && <div className="mx-6 mb-4 border-t border-white/8" />}

          {/* Social */}
          {ctx.showSocial !== false && links.length > 0 && (
            <div className="px-6 mb-5">
              {socialLabel && <p className="text-white/35 text-xs font-medium text-center mb-3">{socialLabel}</p>}
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {links.map((link) => (
                  <a
                    key={link.key}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center text-white/60 transition-all hover:scale-110 hover:bg-white/15 hover:text-white"
                  >
                    {link.icon}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Share */}
          {ctx.showReferral !== false && shareCta && (
            <div className="px-6 mb-6">
              <button
                onClick={handleShare}
                className={`flex items-center justify-center gap-2.5 w-full py-3 rounded-2xl border text-sm font-medium transition-all ${
                  shared ? "text-white" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                }`}
                style={shared ? { background: `${accent}33`, borderColor: `${accent}66`, color: accent } : undefined}
              >
                {shared ? sharedLabel || "✓" : shareCta}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <a
            href={ctx.pageSlug ? `/lp/${ctx.pageSlug}` : "https://www.ono.ac.il"}
            className="text-white/25 text-xs hover:text-white/50 transition-colors"
          >
            {backLink}
          </a>
          {copyright && <p className="text-white/15 text-xs mt-2">{copyright}</p>}
        </div>
      </div>
    </div>
  );
};
