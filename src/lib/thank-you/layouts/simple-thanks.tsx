"use client";

/**
 * Layout 11: Simple Thanks
 *
 * The most basic post-submission page possible — a short "thank you,
 * we got your details" message and a link back to the landing page.
 *
 * Use this when you want minimal distraction and no secondary CTAs,
 * advisor bios, testimonials, countdowns, social icons, etc.
 */

import { CheckIcon, LAYOUT_ANIMATIONS, field, type LayoutComponent } from "./shared";

export const SimpleThanksLayout: LayoutComponent = ({ ctx }) => {
  const lang = ctx.language;
  const content = ctx.template.content;
  const config = ctx.template.config;
  const accent = config.accent_color || "#B8D900";
  const isRtl = lang === "he" || lang === "ar";

  const heading = field(content, lang, "heading", ctx.displayName);
  const subheading = field(content, lang, "subheading", ctx.displayName);
  const backLink = field(content, lang, "back_link", ctx.displayName);
  const copyright = field(content, lang, "copyright", ctx.displayName);

  const backHref = ctx.pageSlug ? `/lp/${ctx.pageSlug}` : "/";

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-16"
      style={{ fontFamily: "'Rubik','Heebo',sans-serif" }}
    >
      <style>{LAYOUT_ANIMATIONS}</style>

      {ctx.logoUrl && (
        <div className="mb-10" style={{ animation: "ty-fade-in-down 0.5s ease-out both" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ctx.logoUrl} alt="logo" className="h-10 object-contain" />
        </div>
      )}

      <div
        className="w-full max-w-md text-center"
        style={{ animation: "ty-fade-in-up 0.6s ease-out 0.1s both" }}
      >
        {config.show_checkmark !== false && (
          <div
            className="mx-auto mb-8 w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: `${accent}1a`, color: accent }}
          >
            <CheckIcon className="w-10 h-10" />
          </div>
        )}

        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
          {heading || "תודה רבה!"}
        </h1>

        <p className="text-lg text-gray-600 mb-10">
          {subheading || "קיבלנו את פרטיך"}
        </p>

        <a
          href={backHref}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-full border-2 text-base font-semibold transition-all hover:scale-105"
          style={{ borderColor: accent, color: accent }}
        >
          {backLink || "חזרה לעמוד הראשי"}
        </a>
      </div>

      {copyright && (
        <p className="mt-20 text-xs text-gray-400">{copyright}</p>
      )}
    </div>
  );
};
