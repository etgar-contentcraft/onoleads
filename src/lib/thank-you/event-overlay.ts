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

    // For online events: put the join URL in the "location" slot so the
    // page and invite both surface it. Physical events keep a real address.
    const overlaidLocation = isOnline
      ? meta.online_platform || original.event_location || "Online"
      : event.location || original.event_location || "";
    const overlaidLocationUrl = isOnline
      ? meta.online_url || original.event_location_url || ""
      : meta.location_url || original.event_location_url || "";

    newContent[lang] = {
      ...original,
      event_title: eventTitle(event, lang),
      event_description: eventDescription(event, lang) || original.event_description || "",
      event_location: overlaidLocation,
      event_location_url: overlaidLocationUrl,
      event_start_datetime: event.event_date || original.event_start_datetime || "",
      event_end_datetime: event.event_end_date || original.event_end_datetime || "",
      event_organizer_name: meta.organizer_name || original.event_organizer_name || "",
      event_organizer_email: meta.organizer_email || original.event_organizer_email || "",

      // Online-vs-physical signals
      event_is_online: isOnline ? "1" : "",
      event_online_url: meta.online_url || "",
      event_online_platform: meta.online_platform || "",

      // Rich extras — propagated through so the layout and invite body
      // can surface every field the editor filled in.
      event_organizer_phone: meta.organizer_phone || original.event_organizer_phone || "",
      event_organizer_website: meta.organizer_website || original.event_organizer_website || "",
      event_timezone: meta.timezone || original.event_timezone || "",
      event_agenda: meta.agenda || original.event_agenda || "",
      event_what_to_bring: meta.what_to_bring || original.event_what_to_bring || "",
      event_parking_info: meta.parking_info || original.event_parking_info || "",
      event_dress_code: meta.dress_code || original.event_dress_code || "",
      event_audience: meta.audience || original.event_audience || "",
      event_language_of_event: meta.event_language || original.event_language_of_event || "",
      event_price_info: meta.price_info || original.event_price_info || "",
    };
  }

  return {
    ...template,
    content: newContent,
  };
}
