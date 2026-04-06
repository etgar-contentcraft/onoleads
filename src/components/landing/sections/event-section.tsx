/**
 * Event / Open Day Section
 * Displays event details: date, time, location, schedule, speakers.
 * Works as a section within a standard landing page.
 */

import type { Language } from "@/lib/types/database";
import { Calendar, Clock, MapPin, Video, Users, ChevronDown } from "lucide-react";

interface EventSectionProps {
  content: Record<string, unknown>;
  language: Language;
}

const LABELS = {
  he: {
    eventDetails: "פרטי האירוע",
    date: "תאריך",
    time: "שעה",
    location: "מיקום",
    online: "אירוע מקוון (Zoom)",
    parking: "חניה",
    schedule: "לוח זמנים",
    speakers: "דוברים",
    programs: "תוכניות מוצגות",
    joinZoom: "הצטרפו לזום",
    navigate: "נווטו למקום",
  },
  en: {
    eventDetails: "Event Details",
    date: "Date",
    time: "Time",
    location: "Location",
    online: "Online Event (Zoom)",
    parking: "Parking",
    schedule: "Schedule",
    speakers: "Speakers",
    programs: "Featured Programs",
    joinZoom: "Join Zoom",
    navigate: "Get Directions",
  },
  ar: {
    eventDetails: "تفاصيل الحدث",
    date: "التاريخ",
    time: "الوقت",
    location: "الموقع",
    online: "حدث عبر الإنترنت (Zoom)",
    parking: "مواقف السيارات",
    schedule: "الجدول الزمني",
    speakers: "المتحدثون",
    programs: "البرامج المعروضة",
    joinZoom: "انضم عبر Zoom",
    navigate: "احصل على الاتجاهات",
  },
} as const;

/**
 * Formats an ISO date string for display.
 * Returns locale-appropriate date string.
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

export default function EventSection({ content, language }: EventSectionProps) {
  const isRtl = language === "he" || language === "ar";
  const l = LABELS[language] || LABELS.en;

  const heading = (content[`heading_${language}`] || content.heading_he || "") as string;
  const description = (content[`description_${language}`] || content.description_he || "") as string;
  const eventDate = (content.event_date || "") as string;
  const eventTime = (content.event_time || "") as string;
  const eventType = (content.event_type || "event_physical") as string;
  const venue = (content.venue || "") as string;
  const googleMapsUrl = (content.google_maps_url || "") as string;
  const zoomLink = (content.zoom_link || "") as string;
  const parkingInfo = (content.parking_info || "") as string;
  const programsFeatured = (content.programs_featured || []) as string[];
  const schedule = (content.schedule || []) as { time: string; title: string }[];
  const speakers = (content.speakers || []) as { name: string; role: string; image_url?: string }[];

  const isZoom = eventType === "event_zoom";
  const formattedDate = eventDate ? formatEventDate(eventDate, language) : "";

  return (
    <section className="py-16 bg-white" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        {heading && (
          <div className="text-center mb-10">
            <h2 className="text-3xl font-heading font-bold text-[#2A2628] mb-3">{heading}</h2>
            {description && (
              <p className="text-[#716C70] text-lg max-w-2xl mx-auto">{description}</p>
            )}
          </div>
        )}

        {/* Event Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {/* Date */}
          {formattedDate && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-[#B8D900]/5 border border-[#B8D900]/20">
              <div className="w-10 h-10 rounded-lg bg-[#B8D900]/10 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-[#B8D900]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#9A969A] uppercase">{l.date}</p>
                <p className="text-sm font-bold text-[#2A2628]">{formattedDate}</p>
              </div>
            </div>
          )}

          {/* Time */}
          {eventTime && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-[#B8D900]/5 border border-[#B8D900]/20">
              <div className="w-10 h-10 rounded-lg bg-[#B8D900]/10 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-[#B8D900]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#9A969A] uppercase">{l.time}</p>
                <p className="text-sm font-bold text-[#2A2628]">{eventTime}</p>
              </div>
            </div>
          )}

          {/* Location / Zoom */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-[#B8D900]/5 border border-[#B8D900]/20">
            <div className="w-10 h-10 rounded-lg bg-[#B8D900]/10 flex items-center justify-center shrink-0">
              {isZoom ? <Video className="w-5 h-5 text-[#B8D900]" /> : <MapPin className="w-5 h-5 text-[#B8D900]" />}
            </div>
            <div>
              <p className="text-xs font-semibold text-[#9A969A] uppercase">
                {isZoom ? l.online : l.location}
              </p>
              <p className="text-sm font-bold text-[#2A2628]">
                {isZoom ? "Zoom" : venue || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 justify-center mb-10">
          {isZoom && zoomLink && (
            <a
              href={zoomLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#B8D900] text-[#2A2628] font-bold text-sm hover:bg-[#c8e920] transition-colors"
            >
              <Video className="w-4 h-4" />
              {l.joinZoom}
            </a>
          )}
          {!isZoom && googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#B8D900] text-[#2A2628] font-bold text-sm hover:bg-[#c8e920] transition-colors"
            >
              <MapPin className="w-4 h-4" />
              {l.navigate}
            </a>
          )}
        </div>

        {/* Parking info */}
        {parkingInfo && !isZoom && (
          <div className="text-center text-sm text-[#716C70] mb-10">
            <span className="font-semibold">{l.parking}:</span> {parkingInfo}
          </div>
        )}

        {/* Featured Programs */}
        {programsFeatured.length > 0 && (
          <div className="mb-10">
            <h3 className="text-lg font-heading font-bold text-[#2A2628] mb-4 text-center">{l.programs}</h3>
            <div className="flex flex-wrap gap-2 justify-center">
              {programsFeatured.map((prog, i) => (
                <span key={i} className="px-4 py-1.5 rounded-full bg-[#B8D900]/10 text-[#2A2628] text-sm font-medium">
                  {prog}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Schedule */}
        {schedule.length > 0 && (
          <div className="mb-10">
            <h3 className="text-lg font-heading font-bold text-[#2A2628] mb-4 text-center">{l.schedule}</h3>
            <div className="space-y-2 max-w-lg mx-auto">
              {schedule.map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50">
                  <span className="text-sm font-mono font-bold text-[#B8D900] shrink-0 w-14 text-center">
                    {item.time}
                  </span>
                  <span className="text-sm text-[#2A2628] font-medium">{item.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Speakers */}
        {speakers.length > 0 && (
          <div>
            <h3 className="text-lg font-heading font-bold text-[#2A2628] mb-4 text-center">{l.speakers}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
              {speakers.map((speaker, i) => (
                <div key={i} className="text-center p-4 rounded-xl bg-gray-50">
                  {speaker.image_url ? (
                    <img
                      src={speaker.image_url}
                      alt={speaker.name}
                      className="w-16 h-16 rounded-full mx-auto mb-2 object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full mx-auto mb-2 bg-[#B8D900]/10 flex items-center justify-center">
                      <Users className="w-6 h-6 text-[#B8D900]" />
                    </div>
                  )}
                  <p className="text-sm font-bold text-[#2A2628]">{speaker.name}</p>
                  {speaker.role && (
                    <p className="text-xs text-[#9A969A]">{speaker.role}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
