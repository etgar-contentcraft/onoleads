-- Migration: Open Day Thank-You Template
--
-- Adds a new built-in thank-you template targeted at "open day" / event
-- landing pages. It ships with:
--   - a live countdown to the event start
--   - an "add to calendar" menu supporting Google / Outlook / Apple (ICS)
--   - event details (title, description, location, organizer) that also
--     appear inside the generated calendar invite
--
-- Also adds new TyContentFields columns that other templates can use too:
--   video_url, calendar_url — ship per-template default URLs (previously
--     these URLs could only be set per-page, which defeated the purpose of
--     reusable templates)
--   phone_number, email_address — replace the hardcoded info@ono.ac.il
--     email in the multi_channel layout
--
-- These are JSONB fields nested under content->lang->key, so no DDL is
-- needed — we only add a new template row. Existing templates keep
-- working because all fields are optional.

INSERT INTO thank_you_templates (
  template_key,
  layout_id,
  name_he,
  name_en,
  name_ar,
  description_he,
  description_en,
  description_ar,
  preview_image_url,
  content,
  config,
  is_system,
  is_active,
  is_default
) VALUES (
  'open_day',
  'open_day',
  'יום פתוח',
  'Open Day',
  'يوم مفتوح',
  'תבנית ייעודית לעמוד תודה ליום פתוח — ספירה לאחור מדויקת, פרטי האירוע וכפתור ''הוסיפו ליומן'' עם Google Calendar, Outlook וקובץ ICS לאפל.',
  'Dedicated thank-you template for open day events — precise countdown, event details, and an ''Add to calendar'' button supporting Google Calendar, Outlook, and ICS download for Apple.',
  'قالب مخصص لصفحة الشكر لليوم المفتوح — عد تنازلي دقيق وتفاصيل الحدث وزر ''أضف إلى التقويم'' يدعم Google و Outlook و ICS لأبل.',
  '',
  '{
    "he": {
      "heading": "תודה! המקום שלכם נשמר",
      "subheading": "אנחנו מחכים לראות אתכם ביום הפתוח — הוסיפו אותו ליומן עכשיו כדי שלא תשכחו",
      "thank_you_word": "תודה",
      "event_title": "יום פתוח — הקריה האקדמית אונו",
      "event_description": "יום פתוח להכרת התוכניות שלנו.\nמפגש עם ראשי התוכניות, סיור בקמפוס ומענה לכל השאלות.",
      "event_location": "קמפוס קריית אונו, צה\"ל 104, קריית אונו",
      "event_location_url": "https://maps.google.com/?q=Ono+Academic+College",
      "event_start_datetime": "",
      "event_end_datetime": "",
      "event_organizer_name": "הקריה האקדמית אונו",
      "event_organizer_email": "info@ono.ac.il",
      "add_to_calendar_label": "הוסיפו ליומן",
      "event_reserved_note": "המקום שלכם נשמר — נתראה!",
      "countdown_label": "היום הפתוח מתחיל בעוד",
      "whatsapp_cta": "יש שאלה לפני היום הפתוח? כתבו לנו",
      "whatsapp_msg": "היי, נרשמתי ליום הפתוח ויש לי שאלה",
      "back_link": "← חזרה",
      "copyright": "© הקריה האקדמית אונו"
    },
    "en": {
      "heading": "Thank you! Your spot is reserved",
      "subheading": "We can''t wait to see you at the open day — add it to your calendar so you won''t forget",
      "thank_you_word": "Thank you",
      "event_title": "Open Day — Ono Academic College",
      "event_description": "An open day to discover our programs.\nMeet program heads, tour the campus, and get all your questions answered.",
      "event_location": "Ono Campus, Tzahal 104, Kiryat Ono",
      "event_location_url": "https://maps.google.com/?q=Ono+Academic+College",
      "event_start_datetime": "",
      "event_end_datetime": "",
      "event_organizer_name": "Ono Academic College",
      "event_organizer_email": "info@ono.ac.il",
      "add_to_calendar_label": "Add to calendar",
      "event_reserved_note": "Your spot is reserved — see you there!",
      "countdown_label": "The open day starts in",
      "whatsapp_cta": "Questions before the open day? Message us",
      "whatsapp_msg": "Hi, I signed up for the open day and I have a question",
      "back_link": "← Back",
      "copyright": "© Ono Academic College"
    },
    "ar": {
      "heading": "شكراً! تم حجز مكانك",
      "subheading": "نحن بانتظاركم في اليوم المفتوح — أضيفوه إلى التقويم الآن حتى لا تنسوا",
      "thank_you_word": "شكراً",
      "event_title": "يوم مفتوح — كلية أونو الأكاديمية",
      "event_description": "يوم مفتوح للتعرف على برامجنا.\nلقاء مع رؤساء البرامج، جولة في الحرم الجامعي والإجابة على جميع الأسئلة.",
      "event_location": "حرم أونو، تسهال 104، كريات أونو",
      "event_location_url": "https://maps.google.com/?q=Ono+Academic+College",
      "event_start_datetime": "",
      "event_end_datetime": "",
      "event_organizer_name": "كلية أونو الأكاديمية",
      "event_organizer_email": "info@ono.ac.il",
      "add_to_calendar_label": "أضف إلى التقويم",
      "event_reserved_note": "مكانك محجوز — نراكم هناك!",
      "countdown_label": "اليوم المفتوح يبدأ خلال",
      "whatsapp_cta": "لديك أسئلة قبل اليوم المفتوح؟ راسلنا",
      "whatsapp_msg": "مرحباً، لقد سجلت في اليوم المفتوح ولدي سؤال",
      "back_link": "← رجوع",
      "copyright": "© كلية أونو الأكاديمية"
    }
  }'::jsonb,
  '{"accent_color": "#FF6B35", "bg_style": "dark"}'::jsonb,
  true,
  true,
  false
)
ON CONFLICT (template_key) DO UPDATE SET
  layout_id = EXCLUDED.layout_id,
  name_he = EXCLUDED.name_he,
  name_en = EXCLUDED.name_en,
  name_ar = EXCLUDED.name_ar,
  description_he = EXCLUDED.description_he,
  description_en = EXCLUDED.description_en,
  description_ar = EXCLUDED.description_ar,
  content = EXCLUDED.content,
  config = EXCLUDED.config,
  updated_at = NOW();
