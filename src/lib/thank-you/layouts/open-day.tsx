"use client";

/**
 * OpenDayLayout — thank-you page tailored to "open day" / event leads.
 *
 * Key features:
 *   1. Real-time countdown to the exact date/time of the event
 *   2. "Add to calendar" menu that lets the lead pick
 *        Google Calendar | Outlook | Apple (ICS download)
 *   3. Location with optional Maps link
 *   4. Organizer / description fields used both on-page AND inside the
 *      generated invite itself
 *
 * All date math uses the ISO 8601 string from template content
 * (`event_start_datetime` / `event_end_datetime`) so the editor can
 * paste any valid datetime and the page/countdown/invite all stay in sync.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  field,
  socialLinks,
  whatsappHref,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  WhatsAppIcon,
  LAYOUT_ANIMATIONS,
  type LayoutContext,
  type LayoutComponent,
} from "./shared";
import {
  buildIcs,
  googleCalendarUrl,
  outlookCalendarUrl,
  icsFilename,
  parseIso,
  type CalendarEvent,
} from "@/lib/thank-you/calendar-invite";

interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

/** Compute the remaining parts for the countdown at "now". */
function diffParts(target: Date, now: Date): CountdownParts {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return { days, hours, minutes, seconds, expired: false };
}

/**
 * Live countdown block — reruns every 1s via setInterval. Uses local state
 * so SSR hydration matches (both SSR and first CSR render show zeros until
 * the first client tick, which runs in useEffect).
 */
function Countdown({
  target,
  labels,
  accent,
}: {
  target: Date;
  labels: { days: string; hours: string; minutes: string; seconds: string };
  accent: string;
}) {
  const [parts, setParts] = useState<CountdownParts>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: false,
  });

  useEffect(() => {
    // First tick immediately, then every second
    const tick = () => setParts(diffParts(target, new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  const boxes: Array<[number, string]> = [
    [parts.days, labels.days],
    [parts.hours, labels.hours],
    [parts.minutes, labels.minutes],
    [parts.seconds, labels.seconds],
  ];

  return (
    <div className="grid grid-cols-4 gap-3 md:gap-4 max-w-lg mx-auto">
      {boxes.map(([value, label], i) => (
        <div
          key={i}
          className="rounded-2xl border py-4 px-2 text-center"
          style={{
            borderColor: `${accent}55`,
            background: `${accent}10`,
          }}
        >
          <div
            className="text-3xl md:text-4xl font-black tabular-nums"
            style={{ color: accent }}
          >
            {value.toString().padStart(2, "0")}
          </div>
          <div className="text-[11px] uppercase tracking-widest text-white/60 mt-1">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Dropdown menu for the "Add to calendar" button. Closes on outside click. */
function AddToCalendarMenu({
  event,
  buttonLabel,
  accent,
  isRtl,
}: {
  event: CalendarEvent;
  buttonLabel: string;
  accent: string;
  isRtl: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const gUrl = googleCalendarUrl(event);
  const oUrl = outlookCalendarUrl(event);

  /**
   * Generate the .ics file as a Blob and force download. We prefer a Blob
   * over a raw data URL because some mobile browsers block data: downloads.
   */
  const handleIcsDownload = () => {
    const ics = buildIcs(event);
    if (!ics) return;
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = icsFilename(event);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Release the blob after the browser has had a chance to consume it
    setTimeout(() => URL.revokeObjectURL(url), 500);
    setOpen(false);
  };

  const menuAlign = isRtl ? "right-0" : "left-0";

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center justify-center gap-3 px-10 py-4 rounded-2xl font-extrabold text-lg transition-all hover:scale-[1.03]"
        style={{
          background: accent,
          color: "#111",
          boxShadow: `0 0 40px ${accent}66`,
        }}
      >
        <CalendarIcon className="w-5 h-5" />
        {buttonLabel}
      </button>

      {open && (
        <div
          className={`absolute ${menuAlign} mt-2 w-64 rounded-xl bg-white border border-gray-200 shadow-2xl overflow-hidden z-50`}
          dir={isRtl ? "rtl" : "ltr"}
        >
          <a
            href={gUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 text-gray-800"
            onClick={() => setOpen(false)}
          >
            <span
              className="inline-flex w-7 h-7 items-center justify-center rounded-lg bg-[#4285F4]/10 text-[#4285F4] font-bold"
              aria-hidden
            >
              G
            </span>
            <span className="flex-1">Google Calendar</span>
          </a>
          <a
            href={oUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 text-gray-800 border-t border-gray-100"
            onClick={() => setOpen(false)}
          >
            <span
              className="inline-flex w-7 h-7 items-center justify-center rounded-lg bg-[#0078D4]/10 text-[#0078D4] font-bold"
              aria-hidden
            >
              O
            </span>
            <span className="flex-1">Outlook</span>
          </a>
          <button
            type="button"
            onClick={handleIcsDownload}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 text-gray-800 border-t border-gray-100 text-start"
          >
            <span
              className="inline-flex w-7 h-7 items-center justify-center rounded-lg bg-gray-900/10 text-gray-900 font-bold"
              aria-hidden
            >
              A
            </span>
            <span className="flex-1">Apple / ICS (.ics)</span>
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Format a Date into a Hebrew/English human-friendly "15 במאי 2026, 18:00" style
 * using Intl.DateTimeFormat so we respect the browser locale automatically.
 */
function formatEventDateTime(date: Date, lang: string): string {
  try {
    const locale = lang === "he" ? "he-IL" : lang === "ar" ? "ar" : "en-US";
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "long",
      timeStyle: "short",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

export const OpenDayLayout: LayoutComponent = ({ ctx }) => {
  const lang = ctx.language;
  const c = ctx.template.content;
  const cfg = ctx.template.config;
  const accent = cfg.accent_color || "#FF6B35";
  const isRtl = lang === "he" || lang === "ar";

  // ── Resolve all content fields with language fallback + [שם] substitution ──
  const heading = field(c, lang, "heading", ctx.displayName);
  const subheading = field(c, lang, "subheading", ctx.displayName);
  const eventTitle = field(c, lang, "event_title", ctx.displayName);
  const eventDescription = field(c, lang, "event_description", ctx.displayName);
  const eventLocation = field(c, lang, "event_location", ctx.displayName);
  const eventLocationUrl = field(c, lang, "event_location_url", ctx.displayName);
  const eventStart = field(c, lang, "event_start_datetime", ctx.displayName);
  const eventEnd = field(c, lang, "event_end_datetime", ctx.displayName);
  const organizerName = field(c, lang, "event_organizer_name", ctx.displayName);
  const organizerEmail = field(c, lang, "event_organizer_email", ctx.displayName);
  const addToCalendarLabel =
    field(c, lang, "add_to_calendar_label", ctx.displayName) ||
    (lang === "en" ? "Add to calendar" : lang === "ar" ? "أضف إلى التقويم" : "הוסיפו ליומן");
  const reservedNote = field(c, lang, "event_reserved_note", ctx.displayName);
  const whatsappCta = field(c, lang, "whatsapp_cta", ctx.displayName);
  const whatsappMsg = field(c, lang, "whatsapp_msg", ctx.displayName);
  const backLink = field(c, lang, "back_link", ctx.displayName);
  const countdownLabel =
    field(c, lang, "countdown_label", ctx.displayName) ||
    (lang === "en"
      ? "Event starts in"
      : lang === "ar"
      ? "يبدأ الحدث خلال"
      : "הפעילות מתחילה בעוד");

  // ── Build the CalendarEvent object that powers all add-to-calendar actions ──
  const calendarEvent = useMemo<CalendarEvent>(() => {
    return {
      title: eventTitle || ctx.programName || "Open Day",
      description: eventDescription,
      location: eventLocation,
      startIso: eventStart,
      endIso: eventEnd || undefined,
      organizerName: organizerName || "Ono Academic College",
      organizerEmail: organizerEmail || "info@ono.ac.il",
    };
  }, [
    eventTitle,
    eventDescription,
    eventLocation,
    eventStart,
    eventEnd,
    organizerName,
    organizerEmail,
    ctx.programName,
  ]);

  const eventStartDate = parseIso(eventStart);
  const eventStartHuman = eventStartDate ? formatEventDateTime(eventStartDate, lang) : "";

  const countdownLabels = {
    days: lang === "en" ? "Days" : lang === "ar" ? "أيام" : "ימים",
    hours: lang === "en" ? "Hours" : lang === "ar" ? "ساعات" : "שעות",
    minutes: lang === "en" ? "Minutes" : lang === "ar" ? "دقائق" : "דקות",
    seconds: lang === "en" ? "Seconds" : lang === "ar" ? "ثواني" : "שניות",
  };

  const links = socialLinks(ctx);

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-screen flex flex-col items-center px-4 py-12"
      style={{
        background: `linear-gradient(180deg, #0d0b0c 0%, #1a1412 50%, #0d0b0c 100%)`,
        fontFamily: "'Rubik','Heebo',sans-serif",
      }}
    >
      <style>{LAYOUT_ANIMATIONS}</style>

      {ctx.logoUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={ctx.logoUrl} alt="logo" className="h-10 object-contain brightness-200 mb-10" />
      )}

      <div
        className="w-full max-w-2xl text-center"
        style={{ animation: "ty-fade-in-up 0.7s ease-out both" }}
      >
        {/* Success badge */}
        <div
          className="mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: `${accent}1f`,
            color: accent,
            border: `2px solid ${accent}66`,
          }}
        >
          <CheckIcon className="w-10 h-10" />
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4 leading-tight">
          {heading}
        </h1>
        {subheading && (
          <p className="text-white/70 text-lg mb-8 max-w-xl mx-auto">{subheading}</p>
        )}

        {/* Event details block */}
        {(eventTitle || eventStartHuman || eventLocation) && (
          <div
            className="rounded-2xl p-6 mb-8 text-start"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${accent}33`,
            }}
          >
            {eventTitle && (
              <h2
                className="text-xl md:text-2xl font-extrabold mb-3"
                style={{ color: accent }}
              >
                {eventTitle}
              </h2>
            )}
            {eventStartHuman && (
              <div className="flex items-center gap-3 text-white/90 mb-2">
                <ClockIcon className="w-5 h-5 shrink-0" style={{ color: accent }} />
                <span className="text-sm md:text-base">{eventStartHuman}</span>
              </div>
            )}
            {eventLocation && (
              <div className="flex items-center gap-3 text-white/90 mb-2">
                <CalendarIcon className="w-5 h-5 shrink-0" style={{ color: accent }} />
                {eventLocationUrl ? (
                  <a
                    href={eventLocationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm md:text-base underline hover:text-white"
                  >
                    {eventLocation}
                  </a>
                ) : (
                  <span className="text-sm md:text-base">{eventLocation}</span>
                )}
              </div>
            )}
            {eventDescription && (
              <p className="text-white/70 text-sm mt-3 leading-relaxed whitespace-pre-line">
                {eventDescription}
              </p>
            )}
          </div>
        )}

        {/* Countdown */}
        {eventStartDate && (
          <div className="mb-8">
            <p
              className="text-xs uppercase tracking-widest mb-4"
              style={{ color: accent }}
            >
              {countdownLabel}
            </p>
            <Countdown target={eventStartDate} labels={countdownLabels} accent={accent} />
            {reservedNote && (
              <p className="text-white/60 text-sm mt-4">{reservedNote}</p>
            )}
          </div>
        )}

        {/* Add to calendar — only if we have a valid start time */}
        {eventStartDate && (
          <div className="mb-6">
            <AddToCalendarMenu
              event={calendarEvent}
              buttonLabel={addToCalendarLabel}
              accent={accent}
              isRtl={isRtl}
            />
          </div>
        )}

        {/* WhatsApp secondary CTA */}
        {ctx.showWhatsapp !== false && ctx.whatsappNumber && whatsappCta && (
          <div className="mt-4">
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

        {/* Social links */}
        {ctx.showSocial !== false && links.length > 0 && (
          <div className="mt-8 flex justify-center gap-3">
            {links.map((link) => (
              <a
                key={link.key}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:scale-110 transition-transform"
              >
                {link.icon}
              </a>
            ))}
          </div>
        )}

        {backLink && (
          <div className="mt-10">
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
