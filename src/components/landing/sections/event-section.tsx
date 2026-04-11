/**
 * Event / Open Day landing section.
 *
 * Two data sources are supported — editors choose via the section editor:
 *
 *   1. **Linked event** — `content.event_id` points to a row in the `events`
 *      table. The landing page route fetches that row and passes it as `event`
 *      to this component. The row is the single source of truth and drives
 *      every rich block (speakers, schedule, FAQ, gallery, testimonials,
 *      capacity, intro video, registration deadline, etc.).
 *
 *   2. **Inline content** — editor fills in the legacy content fields
 *      directly on the section. Used for one-off pages that don't belong to
 *      a reusable event.
 *
 * The rich presentation components live in `lib/thank-you/event-rich-sections`
 * so both the thank-you page and the landing page share exactly the same
 * layout engine — just passing `variant="dark"` vs `variant="light"`.
 */

import type { Language } from "@/lib/types/database";
import type { EventRow, EventSpeaker, EventScheduleItem } from "@/lib/types/events";
import { eventTitle, eventDescription } from "@/lib/types/events";
import { Calendar, Clock, MapPin, Video } from "lucide-react";
import {
  EventIntroVideo,
  EventCapacityCounter,
  EventHighlights,
  EventSchedule,
  EventSpeakers,
  EventFaq,
  EventTestimonials,
  EventGallery,
  EventFeaturedPrograms,
  EventTags,
} from "@/lib/thank-you/event-rich-sections";

interface EventSectionProps {
  content: Record<string, unknown>;
  language: Language;
  /** Pre-fetched event row — passed when content.event_id is set. */
  event?: EventRow | null;
}

const LABELS = {
  he: {
    eventDetails: "פרטי האירוע",
    date: "תאריך",
    time: "שעה",
    location: "מיקום",
    online: "אירוע מקוון",
    parking: "חניה",
    schedule: "סדר היום",
    scheduleSubtitle: "הלו״ז המלא של האירוע",
    speakers: "מרצים",
    speakersSubtitle: "הכירו את המרצים שלנו",
    programs: "חוגים מוצגים",
    programsSubtitle: "תלמדו על התכניות הבאות",
    joinZoom: "הצטרפו לאירוע",
    navigate: "נווטו למקום",
    introVideo: "צפו בהצצה",
    highlightsPill: "מה מחכה לכם",
    highlightsTitle: "מה תקבלו באירוע",
    faqTitle: "שאלות ותשובות",
    faqSubtitle: "יש לכם שאלה?",
    testimonialsTitle: "ממליצים",
    testimonialsSubtitle: "מה משתתפים קודמים אומרים",
    galleryTitle: "גלריה",
    gallerySubtitle: "רגעים מאירועים קודמים",
    capacityTitle: "מקומות",
    capacitySeats: "מקומות נותרו",
    capacityAlmostFull: "כמעט מלא!",
    register: "הירשמו עכשיו",
    registerDeadline: "מועד אחרון להרשמה",
  },
  en: {
    eventDetails: "Event Details",
    date: "Date",
    time: "Time",
    location: "Location",
    online: "Online Event",
    parking: "Parking",
    schedule: "Schedule",
    scheduleSubtitle: "Full event timeline",
    speakers: "Speakers",
    speakersSubtitle: "Meet your presenters",
    programs: "Featured Programs",
    programsSubtitle: "You'll hear about these",
    joinZoom: "Join the event",
    navigate: "Get Directions",
    introVideo: "Watch a preview",
    highlightsPill: "Highlights",
    highlightsTitle: "What you'll get",
    faqTitle: "FAQ",
    faqSubtitle: "Got a question?",
    testimonialsTitle: "Testimonials",
    testimonialsSubtitle: "Past attendees speak",
    galleryTitle: "Gallery",
    gallerySubtitle: "Moments from past events",
    capacityTitle: "Seats",
    capacitySeats: "spots left",
    capacityAlmostFull: "Almost full!",
    register: "Register now",
    registerDeadline: "Registration deadline",
  },
  ar: {
    eventDetails: "تفاصيل الحدث",
    date: "التاريخ",
    time: "الوقت",
    location: "الموقع",
    online: "حدث عبر الإنترنت",
    parking: "مواقف السيارات",
    schedule: "الجدول الزمني",
    scheduleSubtitle: "الجدول الكامل للفعالية",
    speakers: "المتحدثون",
    speakersSubtitle: "تعرف على المقدمين",
    programs: "البرامج المعروضة",
    programsSubtitle: "ستسمع عن هذه البرامج",
    joinZoom: "انضم للحدث",
    navigate: "احصل على الاتجاهات",
    introVideo: "شاهد نظرة عامة",
    highlightsPill: "أبرز الأحداث",
    highlightsTitle: "ما ستحصل عليه",
    faqTitle: "الأسئلة الشائعة",
    faqSubtitle: "هل لديك سؤال؟",
    testimonialsTitle: "التوصيات",
    testimonialsSubtitle: "آراء المشاركين السابقين",
    galleryTitle: "المعرض",
    gallerySubtitle: "لحظات من الفعاليات السابقة",
    capacityTitle: "المقاعد",
    capacitySeats: "مقاعد متبقية",
    capacityAlmostFull: "ممتلئ تقريبا!",
    register: "سجل الآن",
    registerDeadline: "الموعد النهائي للتسجيل",
  },
} as const;

/**
 * Formats an ISO datetime string into a locale-appropriate "full" date.
 * Returns the raw string if parsing fails so editors can debug.
 */
function formatEventDate(isoDate: string, language: Language): string {
  try {
    const date = new Date(isoDate);
    const locale = language === "he" ? "he-IL" : language === "ar" ? "ar-SA" : "en-US";
    return date.toLocaleDateString(locale, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return isoDate;
  }
}

/** Extract a locale-appropriate time string ("18:00") from an ISO date. */
function formatEventTime(isoDate: string, language: Language): string {
  try {
    const date = new Date(isoDate);
    const locale = language === "he" ? "he-IL" : language === "ar" ? "ar-SA" : "en-US";
    return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

/**
 * Merge legacy inline content + linked EventRow into a single normalized
 * shape the section renders from. When both are provided, the linked event
 * wins for every field it defines; empty event fields fall back to content.
 */
function resolveEventData(
  content: Record<string, unknown>,
  language: Language,
  event?: EventRow | null,
) {
  // Inline content fields (legacy)
  const heading = (content[`heading_${language}`] || content.heading_he || "") as string;
  const descInline = (content[`description_${language}`] || content.description_he || "") as string;
  const eventDateInline = (content.event_date || "") as string;
  const eventTimeInline = (content.event_time || "") as string;
  const eventTypeInline = (content.event_type || "event_physical") as string;
  const venueInline = (content.venue || "") as string;
  const googleMapsUrlInline = (content.google_maps_url || "") as string;
  const zoomLinkInline = (content.zoom_link || "") as string;
  const parkingInfoInline = (content.parking_info || "") as string;
  const programsFeaturedInline = (content.programs_featured || []) as string[];
  const scheduleInline = (content.schedule || []) as EventScheduleItem[];
  const speakersInline = (content.speakers || []) as EventSpeaker[];

  // When a linked event is provided, overlay its fields over inline data.
  if (event) {
    const meta = event.meta || {};
    return {
      title: eventTitle(event, language) || heading,
      description: eventDescription(event, language) || descInline,
      dateIso: event.event_date || eventDateInline,
      timeString: event.event_date ? formatEventTime(event.event_date, language) : eventTimeInline,
      isOnline: !!meta.is_online,
      venue: event.location || venueInline,
      venueUrl: meta.location_url || googleMapsUrlInline,
      onlinePlatform: meta.online_platform || "Zoom",
      onlineUrl: meta.online_url || zoomLinkInline,
      parkingInfo: meta.parking_info || parkingInfoInline,
      // Rich content fields — inline legacy arrays are casted into the
      // right shape so the rich components can render either source.
      speakers: meta.speakers || speakersInline,
      schedule: meta.schedule || scheduleInline,
      highlights: meta.highlights,
      faq: meta.faq,
      testimonials: meta.testimonials,
      gallery: meta.gallery,
      featuredPrograms:
        meta.featured_programs ||
        programsFeaturedInline.map((label) => ({ label })),
      tags: meta.tags,
      capacity: meta.capacity,
      registeredCount: meta.registered_count,
      introVideoUrl: meta.intro_video_url,
      heroImageUrl: meta.image_url,
      registrationUrl: meta.registration_url,
      registrationDeadline: meta.registration_deadline,
      ctaLabel: meta.cta_label,
      ctaUrl: meta.cta_url,
      hashtag: meta.hashtag,
      audience: meta.audience,
      priceInfo: meta.price_info,
      organizerName: meta.organizer_name,
      organizerPhone: meta.organizer_phone,
    };
  }

  // Inline-only path (legacy pages without event_id).
  return {
    title: heading,
    description: descInline,
    dateIso: eventDateInline,
    timeString: eventTimeInline,
    isOnline: eventTypeInline === "event_zoom",
    venue: venueInline,
    venueUrl: googleMapsUrlInline,
    onlinePlatform: "Zoom",
    onlineUrl: zoomLinkInline,
    parkingInfo: parkingInfoInline,
    speakers: speakersInline,
    schedule: scheduleInline,
    highlights: undefined,
    faq: undefined,
    testimonials: undefined,
    gallery: undefined,
    featuredPrograms: programsFeaturedInline.map((label) => ({ label })),
    tags: undefined,
    capacity: undefined,
    registeredCount: undefined,
    introVideoUrl: undefined,
    heroImageUrl: undefined,
    registrationUrl: undefined,
    registrationDeadline: undefined,
    ctaLabel: undefined,
    ctaUrl: undefined,
    hashtag: undefined,
    audience: undefined,
    priceInfo: undefined,
    organizerName: undefined,
    organizerPhone: undefined,
  };
}

/** Accent color used across the light event section. Matches brand green. */
const ACCENT = "#B8D900";

export default function EventSection({ content, language, event }: EventSectionProps) {
  const isRtl = language === "he" || language === "ar";
  const l = LABELS[language] || LABELS.en;

  const data = resolveEventData(content, language, event);
  const formattedDate = data.dateIso ? formatEventDate(data.dateIso, language) : "";

  return (
    <section
      className="py-16 bg-gradient-to-b from-gray-50 via-white to-gray-50"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* ── Hero image (optional) ── */}
        {data.heroImageUrl && (
          <div className="rounded-3xl overflow-hidden mb-10 shadow-xl aspect-[16/9] max-h-96">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.heroImageUrl}
              alt={data.title}
              className="w-full h-full object-cover"
              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
            />
          </div>
        )}

        {/* ── Header ── */}
        {(data.title || data.description) && (
          <div className="text-center mb-10">
            {data.title && (
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-[#2A2628] mb-3">
                {data.title}
              </h2>
            )}
            {data.description && (
              <p className="text-[#5A5658] text-lg max-w-2xl mx-auto whitespace-pre-line">
                {data.description}
              </p>
            )}
            {data.hashtag && (
              <p className="text-sm font-bold mt-3" style={{ color: ACCENT }}>
                #{data.hashtag}
              </p>
            )}
          </div>
        )}

        {/* ── Event Info Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {formattedDate && (
            <div
              className="flex items-center gap-3 p-4 rounded-xl bg-white border shadow-sm"
              style={{ borderColor: `${ACCENT}33` }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${ACCENT}1a` }}
              >
                <Calendar className="w-5 h-5" style={{ color: ACCENT }} />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#9A969A] uppercase">{l.date}</p>
                <p className="text-sm font-bold text-[#2A2628]">{formattedDate}</p>
              </div>
            </div>
          )}

          {data.timeString && (
            <div
              className="flex items-center gap-3 p-4 rounded-xl bg-white border shadow-sm"
              style={{ borderColor: `${ACCENT}33` }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${ACCENT}1a` }}
              >
                <Clock className="w-5 h-5" style={{ color: ACCENT }} />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#9A969A] uppercase">{l.time}</p>
                <p className="text-sm font-bold text-[#2A2628]">{data.timeString}</p>
              </div>
            </div>
          )}

          <div
            className="flex items-center gap-3 p-4 rounded-xl bg-white border shadow-sm"
            style={{ borderColor: `${ACCENT}33` }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}1a` }}
            >
              {data.isOnline ? (
                <Video className="w-5 h-5" style={{ color: ACCENT }} />
              ) : (
                <MapPin className="w-5 h-5" style={{ color: ACCENT }} />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#9A969A] uppercase">
                {data.isOnline ? l.online : l.location}
              </p>
              <p className="text-sm font-bold text-[#2A2628] truncate">
                {data.isOnline ? data.onlinePlatform : data.venue || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Primary action buttons ── */}
        <div className="flex flex-wrap gap-3 justify-center mb-10">
          {data.isOnline && data.onlineUrl && (
            <a
              href={data.onlineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-transform hover:scale-[1.03]"
              style={{ background: ACCENT, color: "#2A2628" }}
            >
              <Video className="w-4 h-4" />
              {l.joinZoom}
            </a>
          )}
          {!data.isOnline && data.venueUrl && (
            <a
              href={data.venueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-transform hover:scale-[1.03]"
              style={{ background: ACCENT, color: "#2A2628" }}
            >
              <MapPin className="w-4 h-4" />
              {l.navigate}
            </a>
          )}
          {data.registrationUrl && (
            <a
              href={data.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-[#2A2628] text-white transition-transform hover:scale-[1.03]"
            >
              {l.register}
            </a>
          )}
          {data.ctaUrl && data.ctaLabel && (
            <a
              href={data.ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 font-bold text-sm transition-transform hover:scale-[1.03]"
              style={{ borderColor: ACCENT, color: "#2A2628" }}
            >
              {data.ctaLabel} →
            </a>
          )}
        </div>

        {/* ── Tags + registration deadline + parking ── */}
        <EventTags items={data.tags} variant="light" accent={ACCENT} />

        {(data.registrationDeadline || (data.parkingInfo && !data.isOnline)) && (
          <div className="flex flex-wrap justify-center gap-6 text-sm text-[#5A5658] mb-10">
            {data.registrationDeadline && (
              <div>
                <span className="font-semibold">{l.registerDeadline}:</span> {data.registrationDeadline}
              </div>
            )}
            {data.parkingInfo && !data.isOnline && (
              <div>
                <span className="font-semibold">{l.parking}:</span> {data.parkingInfo}
              </div>
            )}
          </div>
        )}

        {/* ── Capacity counter ── */}
        <EventCapacityCounter
          capacity={data.capacity}
          registered={data.registeredCount}
          variant="light"
          accent={ACCENT}
          labels={{
            title: l.capacityTitle,
            seats: l.capacitySeats,
            almostFull: l.capacityAlmostFull,
          }}
        />

        {/* ── Intro video (YouTube / Vimeo / mp4) ── */}
        <EventIntroVideo
          url={data.introVideoUrl}
          variant="light"
          accent={ACCENT}
          title={l.introVideo}
        />

        {/* ── Highlights ── */}
        <EventHighlights
          items={data.highlights}
          variant="light"
          accent={ACCENT}
          title={l.highlightsPill}
          subtitle={l.highlightsTitle}
        />

        {/* ── Schedule timeline ── */}
        <EventSchedule
          items={data.schedule}
          variant="light"
          accent={ACCENT}
          title={l.schedule}
          subtitle={l.scheduleSubtitle}
        />

        {/* ── Speakers ── */}
        <EventSpeakers
          items={data.speakers}
          variant="light"
          accent={ACCENT}
          title={l.speakers}
          subtitle={l.speakersSubtitle}
        />

        {/* ── FAQ accordion ── */}
        <EventFaq
          items={data.faq}
          variant="light"
          accent={ACCENT}
          title={l.faqTitle}
          subtitle={l.faqSubtitle}
        />

        {/* ── Testimonials ── */}
        <EventTestimonials
          items={data.testimonials}
          variant="light"
          accent={ACCENT}
          title={l.testimonialsTitle}
          subtitle={l.testimonialsSubtitle}
        />

        {/* ── Gallery ── */}
        <EventGallery
          items={data.gallery}
          variant="light"
          accent={ACCENT}
          title={l.galleryTitle}
          subtitle={l.gallerySubtitle}
        />

        {/* ── Featured programs / partner badges ── */}
        <EventFeaturedPrograms
          items={data.featuredPrograms}
          variant="light"
          accent={ACCENT}
          title={l.programs}
          subtitle={l.programsSubtitle}
        />
      </div>
    </section>
  );
}
