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

  // ── Online vs physical event + rich invite extras ────────────────────
  const eventIsOnline = field(c, lang, "event_is_online", ctx.displayName) === "1";
  const eventOnlineUrl = field(c, lang, "event_online_url", ctx.displayName);
  const eventOnlinePlatform = field(c, lang, "event_online_platform", ctx.displayName);
  const organizerPhone = field(c, lang, "event_organizer_phone", ctx.displayName);
  const organizerWebsite = field(c, lang, "event_organizer_website", ctx.displayName);
  const eventTimezone = field(c, lang, "event_timezone", ctx.displayName);
  const eventAgenda = field(c, lang, "event_agenda", ctx.displayName);
  const eventWhatToBring = field(c, lang, "event_what_to_bring", ctx.displayName);
  const eventParkingInfo = field(c, lang, "event_parking_info", ctx.displayName);
  const eventDressCode = field(c, lang, "event_dress_code", ctx.displayName);
  const eventAudience = field(c, lang, "event_audience", ctx.displayName);
  const eventLanguageOfEvent = field(c, lang, "event_language_of_event", ctx.displayName);
  const eventPriceInfo = field(c, lang, "event_price_info", ctx.displayName);
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

  // ── Localized labels for the invite DESCRIPTION extras section ──────
  const extraLabels = useMemo(
    () =>
      lang === "en"
        ? {
            agenda: "Agenda",
            whatToBring: "What to bring",
            parkingInfo: "Parking / Accessibility",
            dressCode: "Dress code",
            audience: "Who should attend",
            eventLanguage: "Event language",
            priceInfo: "Price",
            organizerPhone: "Organizer phone",
            organizerWebsite: "Organizer website",
            onlineJoin: "Join online",
            directions: "Directions",
            timezone: "Timezone",
            when: "When",
          }
        : lang === "ar"
        ? {
            agenda: "جدول الأعمال",
            whatToBring: "ما يجب إحضاره",
            parkingInfo: "موقف سيارات / إمكانية الوصول",
            dressCode: "قواعد اللباس",
            audience: "الجمهور المستهدف",
            eventLanguage: "لغة الفعالية",
            priceInfo: "السعر",
            organizerPhone: "هاتف المنظم",
            organizerWebsite: "موقع المنظم",
            onlineJoin: "انضم عبر الإنترنت",
            directions: "الاتجاهات",
            timezone: "المنطقة الزمنية",
            when: "الموعد",
          }
        : {
            agenda: "סדר היום",
            whatToBring: "מה להביא",
            parkingInfo: "חניה ונגישות",
            dressCode: "קוד לבוש",
            audience: "קהל יעד",
            eventLanguage: "שפת האירוע",
            priceInfo: "מחיר",
            organizerPhone: "טלפון המארגן",
            organizerWebsite: "אתר המארגן",
            onlineJoin: "הצטרפו אונליין",
            directions: "הוראות הגעה",
            timezone: "אזור זמן",
            when: "מתי",
          },
    [lang],
  );

  // ── Build the CalendarEvent object that powers all add-to-calendar actions ──
  const calendarEvent = useMemo<CalendarEvent>(() => {
    // Pull the landing page URL so attendees can get back to the source.
    const pageUrl =
      typeof window !== "undefined" && ctx.pageSlug
        ? `${window.location.origin}/lp/${ctx.pageSlug}`
        : undefined;
    return {
      title: eventTitle || ctx.programName || "Open Day",
      description: eventDescription,
      location: eventIsOnline ? eventOnlinePlatform || "Online" : eventLocation,
      startIso: eventStart,
      endIso: eventEnd || undefined,
      organizerName: organizerName || "Ono Academic College",
      organizerEmail: organizerEmail || "info@ono.ac.il",
      url: pageUrl,
      extras: {
        timezone: eventTimezone,
        agenda: eventAgenda,
        whatToBring: eventWhatToBring,
        parkingInfo: eventParkingInfo,
        dressCode: eventDressCode,
        audience: eventAudience,
        eventLanguage: eventLanguageOfEvent,
        priceInfo: eventPriceInfo,
        organizerPhone: organizerPhone,
        organizerWebsite: organizerWebsite,
        onlineUrl: eventIsOnline ? eventOnlineUrl : undefined,
        onlinePlatform: eventIsOnline ? eventOnlinePlatform : undefined,
        directionsUrl: !eventIsOnline ? eventLocationUrl : undefined,
        labels: extraLabels,
      },
    };
  }, [
    eventTitle,
    eventDescription,
    eventLocation,
    eventLocationUrl,
    eventStart,
    eventEnd,
    organizerName,
    organizerEmail,
    ctx.programName,
    ctx.pageSlug,
    eventIsOnline,
    eventOnlineUrl,
    eventOnlinePlatform,
    eventTimezone,
    eventAgenda,
    eventWhatToBring,
    eventParkingInfo,
    eventDressCode,
    eventAudience,
    eventLanguageOfEvent,
    eventPriceInfo,
    organizerPhone,
    organizerWebsite,
    extraLabels,
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
        {(eventTitle || eventStartHuman || eventLocation || eventIsOnline) && (
          <div
            className="rounded-2xl p-6 mb-8 text-start"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${accent}33`,
            }}
          >
            {eventTitle && (
              <div className="flex items-start justify-between gap-3 mb-3">
                <h2
                  className="text-xl md:text-2xl font-extrabold"
                  style={{ color: accent }}
                >
                  {eventTitle}
                </h2>
                {eventIsOnline && (
                  <span
                    className="shrink-0 text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-md"
                    style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}55` }}
                  >
                    {lang === "en" ? "ONLINE" : lang === "ar" ? "عبر الإنترنت" : "אונליין"}
                  </span>
                )}
              </div>
            )}
            {eventStartHuman && (
              <div className="flex items-center gap-3 text-white/90 mb-2">
                <ClockIcon className="w-5 h-5 shrink-0" style={{ color: accent }} />
                <span className="text-sm md:text-base">{eventStartHuman}</span>
              </div>
            )}

            {/* Location line — online shows platform + join link, physical shows address */}
            {eventIsOnline ? (
              eventOnlineUrl && (
                <div className="flex items-center gap-3 text-white/90 mb-2">
                  <CalendarIcon className="w-5 h-5 shrink-0" style={{ color: accent }} />
                  <a
                    href={eventOnlineUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm md:text-base underline hover:text-white"
                  >
                    {eventOnlinePlatform
                      ? `${lang === "en" ? "Join via" : lang === "ar" ? "انضم عبر" : "הצטרפו דרך"} ${eventOnlinePlatform}`
                      : lang === "en"
                      ? "Join online"
                      : lang === "ar"
                      ? "انضم عبر الإنترنت"
                      : "הצטרפו אונליין"}
                  </a>
                </div>
              )
            ) : (
              eventLocation && (
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
              )
            )}

            {eventDescription && (
              <p className="text-white/70 text-sm mt-3 leading-relaxed whitespace-pre-line">
                {eventDescription}
              </p>
            )}

            {/* Rich extras — only rendered when the linked event filled them in. */}
            {(eventAgenda ||
              eventWhatToBring ||
              eventParkingInfo ||
              eventDressCode ||
              eventAudience ||
              eventLanguageOfEvent ||
              eventPriceInfo ||
              organizerPhone ||
              organizerWebsite) && (
              <div className="mt-4 pt-4 border-t border-white/10 space-y-2 text-white/75 text-sm">
                {eventAgenda && (
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-white/50">
                      {extraLabels.agenda}
                    </div>
                    <p className="whitespace-pre-line mt-1">{eventAgenda}</p>
                  </div>
                )}
                {eventWhatToBring && (
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-white/50">
                      {extraLabels.whatToBring}
                    </div>
                    <p className="whitespace-pre-line mt-1">{eventWhatToBring}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-white/70">
                  {eventAudience && (
                    <div>
                      <span className="text-white/50">{extraLabels.audience}: </span>
                      {eventAudience}
                    </div>
                  )}
                  {eventLanguageOfEvent && (
                    <div>
                      <span className="text-white/50">{extraLabels.eventLanguage}: </span>
                      {eventLanguageOfEvent}
                    </div>
                  )}
                  {eventDressCode && (
                    <div>
                      <span className="text-white/50">{extraLabels.dressCode}: </span>
                      {eventDressCode}
                    </div>
                  )}
                  {eventPriceInfo && (
                    <div>
                      <span className="text-white/50">{extraLabels.priceInfo}: </span>
                      {eventPriceInfo}
                    </div>
                  )}
                  {eventParkingInfo && !eventIsOnline && (
                    <div className="sm:col-span-2">
                      <span className="text-white/50">{extraLabels.parkingInfo}: </span>
                      {eventParkingInfo}
                    </div>
                  )}
                  {organizerPhone && (
                    <div>
                      <span className="text-white/50">{extraLabels.organizerPhone}: </span>
                      <a href={`tel:${organizerPhone}`} className="underline hover:text-white">
                        {organizerPhone}
                      </a>
                    </div>
                  )}
                  {organizerWebsite && (
                    <div>
                      <span className="text-white/50">{extraLabels.organizerWebsite}: </span>
                      <a
                        href={organizerWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-white break-all"
                      >
                        {organizerWebsite}
                      </a>
                    </div>
                  )}
                </div>
              </div>
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
