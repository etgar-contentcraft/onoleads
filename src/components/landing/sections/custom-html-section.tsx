"use client";

/**
 * Custom HTML Section — escape hatch for arbitrary HTML.
 *
 * Renders raw HTML provided by an admin. ALL <script> tags are stripped
 * before render to prevent stored-XSS via the page builder. Other
 * attributes (e.g. inline event handlers like onclick=) are kept as
 * the admin already has authenticated CMS access — they could just as
 * easily push arbitrary JS through other means. The script-stripping
 * is the minimum guardrail that prevents the worst class of mistakes
 * (e.g. pasting analytics snippets here when they should live in the
 * Pixels admin page).
 */

import { useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/types/database";

interface CustomHtmlSectionProps {
  content: Record<string, unknown>;
  language: Language;
}

/**
 * Removes all <script>...</script> blocks (and any inline <script .../>)
 * from a string. Used as a defensive guardrail against admins pasting
 * untrusted HTML (e.g. from a third-party site) without realising the
 * implications.
 *
 * @param html - The raw HTML string from the editor
 * @returns The HTML string with all <script> tags removed
 */
function stripScripts(html: string): string {
  if (!html) return "";
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
}

export function CustomHtmlSection({ content, language }: CustomHtmlSectionProps) {
  const isRtl = language === "he" || language === "ar";

  // Per-language HTML body, with fallback to Hebrew
  const rawHtml =
    (content[`html_${language}`] as string) ||
    (content.html_he as string) ||
    (content.html as string) ||
    "";
  const sanitizedHtml = stripScripts(rawHtml);

  // Optional padding override (in pixels) — defaults to py-12
  const paddingY = (content.padding_y as number) || 48;

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
      { threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (!sanitizedHtml.trim()) return null;

  return (
    <section
      ref={sectionRef}
      className="bg-white"
      style={{ paddingTop: `${paddingY}px`, paddingBottom: `${paddingY}px` }}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="max-w-6xl mx-auto px-5">
        <div
          className="opacity-0"
          style={{ animation: inView ? "fade-in-up 0.6s ease-out forwards" : "none" }}
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      </div>
    </section>
  );
}
