/**
 * Event → template overlay helper.
 *
 * The `open_day` thank-you template stores its default event details
 * (title, description, location, start/end datetime, organizer) inside the
 * template's `content` JSON blob — useful so the template is self-contained
 * when previewed standalone. But the real system of record for events is
 * the `events` table: a single event row can back many pages, and editing
 * the date once should update every page that references it.
 *
 * This module bridges the two: given a template and an EventRow, it
 * returns a shallow clone of the template with the per-language event
 * fields replaced by the row's values. Fields the row leaves null/empty
 * are left alone so the template default still shows.
 *
 * Why a clone? ThankYouTemplate objects are passed around by reference to
 * many React components. Mutating the original would leak state between
 * requests in a server component.
 */

import type { ThankYouTemplate, TyContent, TyContentFields, TyLang } from "@/lib/types/thank-you-templates";
import type { EventRow } from "@/lib/types/events";
import { eventTitle, eventDescription } from "@/lib/types/events";

/** Languages we publish localized content for. */
const LANGS: TyLang[] = ["he", "en", "ar"];

/**
 * Returns a shallow clone of `template` with event_* fields inside every
 * language populated from `event`. Non-`open_day` templates are returned
 * untouched (event overlay only makes sense for that layout today).
 *
 * @param template  Template row from thank_you_templates
 * @param event     Event row from events (or null to skip overlay)
 * @returns         Template with overlaid event fields, or the original
 */
export function overlayEventOnTemplate(
  template: ThankYouTemplate,
  event: EventRow | null,
): ThankYouTemplate {
  if (!event || template.layout_id !== "open_day") return template;

  const meta = event.meta || {};
  const isOnline = !!meta.is_online;

  // Clone the content JSON so we don't mutate the cached template.
  const newContent: TyContent = { ...template.content };
  for (const lang of LANGS) {
    const original: TyContentFields = template.content?.[lang] || {};

    // When an event is linked, we drop the template's placeholder text for
    // event-specific fields so literal defaults like "כאן יופיע התיאור" never
    // leak into the page or invite. Template defaults are still used for
    // non-event copy (heading, subheading, whatsapp CTA, etc.).
    const resolvedTitle = eventTitle(event, lang);
    const resolvedDescription = eventDescription(event, lang);

    // For online events: show the platform label as the location on the page,
    // and keep the JOIN URL available via event_online_url so the invite
    // builder can use it as LOCATION. Physical events always surface the
    // human-readable address — never the long maps URL.
    const overlaidLocation = isOnline
      ? meta.online_platform || "Online"
      : event.location || "";
    const overlaidLocationUrl = isOnline
      ? meta.online_url || ""
      : meta.location_url || "";

    newContent[lang] = {
      ...original,
      event_title: resolvedTitle,
      event_description: resolvedDescription, // blank when event has none — no placeholder fallback
      event_location: overlaidLocation,
      event_location_url: overlaidLocationUrl,
      event_start_datetime: event.event_date || "",
      event_end_datetime: event.event_end_date || "",
      event_organizer_name: meta.organizer_name || "",
      event_organizer_email: meta.organizer_email || "",

      // Online-vs-physical signals
      event_is_online: isOnline ? "1" : "",
      event_online_url: meta.online_url || "",
      event_online_platform: meta.online_platform || "",

      // Rich extras — propagated through so the layout and invite body
      // can surface every field the editor filled in. Template defaults are
      // intentionally NOT used as a fallback here: when an event is linked,
      // the event row is the single source of truth and an empty value
      // means "show nothing" (no leaking placeholder text).
      event_organizer_phone: meta.organizer_phone || "",
      event_organizer_website: meta.organizer_website || "",
      event_timezone: meta.timezone || "",
      event_agenda: meta.agenda || "",
      event_what_to_bring: meta.what_to_bring || "",
      event_parking_info: meta.parking_info || "",
      event_dress_code: meta.dress_code || "",
      event_audience: meta.audience || "",
      event_language_of_event: meta.event_language || "",
      event_price_info: meta.price_info || "",

      // New rich-extras string fields
      event_refreshments: meta.refreshments || "",
      event_hashtag: meta.hashtag || "",
      event_certificate_info: meta.certificate_info || "",
      event_cta_label: meta.cta_label || "",
      event_cta_url: meta.cta_url || "",
      event_intro_video_url: meta.intro_video_url || "",
      event_livestream_url: meta.livestream_url || "",
      event_recording_url: meta.recording_url || "",
      event_registration_url: meta.registration_url || "",
      event_registration_deadline: meta.registration_deadline || "",
      event_capacity: meta.capacity ? String(meta.capacity) : "",
      event_registered_count: meta.registered_count ? String(meta.registered_count) : "",
    };
  }

  return {
    ...template,
    content: newContent,
  };
}
