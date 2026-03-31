# מערכת אופטימיזציה מבוססת AI לעמודי נחיתה — איפיון טכני מפורט

**גרסת מסמך:** 1.0
**תאריך:** 28.03.2026
**מוכן עבור:** מחלקת מערכות מידע, הקריה האקדמית אונו
**מערכת:** OnoLeads (Next.js 14 + Supabase)
**סטטוס:** ממתין לאישור מערכות מידע

---

## תוכן עניינים

1. [סקירת ארכיטקטורה](#1-סקירת-ארכיטקטורה)
2. [שינויים בסכמת בסיס הנתונים](#2-שינויים-בסכמת-בסיס-הנתונים)
3. [נקודות אינטגרציה עם AI](#3-נקודות-אינטגרציה-עם-ai)
4. [מעקב התנהגותי בצד הלקוח](#4-מעקב-התנהגותי-בצד-הלקוח)
5. [אלגוריתם עץ ההחלטות](#5-אלגוריתם-עץ-ההחלטות-decision-tree)
6. [היררכיית מעורבות והתקדמות מטרות](#6-היררכיית-מעורבות-והתקדמות-מטרות)
7. [תהליך חישוב מחדש — טריגרים ותזמון](#7-תהליך-חישוב-מחדש--טריגרים-ותזמון)
8. [ממשק ניהול בדשבורד](#8-ממשק-ניהול-בדשבורד)
9. [נקודות קצה API](#9-נקודות-קצה-api)
10. [הערכת עלויות](#10-הערכת-עלויות)
11. [שלבי יישום ותלויות](#11-שלבי-יישום-ותלויות)
12. [ניהול סיכונים](#12-ניהול-סיכונים)

---

## 1. סקירת ארכיטקטורה

### 1.1 מצב נוכחי

OnoLeads היא אפליקציית Next.js 14 המאוחסנת ב-Vercel עם בסיס נתונים Supabase (PostgreSQL). המערכת משרתת כ-62 תוכניות לימוד עם 10 עמודי נחיתה פעילים. כל עמוד נחיתה מורכב מעד 18 סוגי סקשנים (hero, benefits, testimonials, CTA, form, FAQ, curriculum, career, faculty, stats, video, about, admission, gallery, map, countdown, whatsapp, program_info_bar).

עמודים נבנים סטטית בזמן build (SSG) עם רענון ISR לפי דרישה. המערכת כבר עוקבת אחרי מבקרים באמצעות cookie בשם `onoleads_id` (365 ימים), אוספת פרמטרי UTM, סוג מכשיר ו-referrer בזמן שליחת ליד.

**אין כרגע:** A/B testing, אינטגרציית AI, או אופטימיזציה אוטומטית.

### 1.2 ארכיטקטורה מוצעת

המערכת מוסיפה ארבע שכבות מעל הארכיטקטורה הקיימת:

```
+------------------------------------------------------------------+
|  שכבה 4: מנוע פרסונליזציה                                        |
|  עץ החלטות מקצה שילוב חלופות אופטימלי לכל סגמנט                  |
+------------------------------------------------------------------+
|  שכבה 3: מערכת A/B Testing                                       |
|  הקצאה אקראית, מעקב אירועים, הערכה סטטיסטית                     |
+------------------------------------------------------------------+
|  שכבה 2: יצירת תוכן AI                                           |
|  יצירת טקסט באמצעות LLM + יצירת תמונות באמצעות מודלים חיצוניים  |
+------------------------------------------------------------------+
|  שכבה 1: מודל נתוני חלופות                                       |
|  טבלת section_variants, תהליך אישור, ממשק ניהול                  |
+------------------------------------------------------------------+
|  קיים: OnoLeads (Next.js 14 + Supabase + Vercel)                |
+------------------------------------------------------------------+
```

**החלטה ארכיטקטונית מרכזית:** עמודי נחיתה עוברים ממודל SSG טהור למודל היברידי. ה-HTML הסטטי משרת את הגרסה המקורית (control). סקריפט קליל בצד הלקוח קורא את שילוב החלופות שהוקצה למבקר מ-Edge Function (או מ-cookie cache) ומחליף אלמנטי תוכן לפני שהמשתמש מספיק לקרוא. זה שומר על יתרון הביצועים של SSG תוך אפשור פרסונליזציה.

### 1.3 המלצת תשתית

להישאר על **Vercel + Supabase**. התוספות:

| רכיב | פלטפורמה | נימוק |
|------|----------|-------|
| API הקצאת חלופות | Vercel Edge Functions | תגובה מתחת ל-50ms; קורא מ-Supabase Edge cache |
| API מעקב אירועים | Vercel Serverless | Fire-and-forget inserts; batched מהלקוח |
| יצירת תוכן AI | API חיצוני (OpenAI/Anthropic/Google) | עלות חד-פעמית, לא לכל ביקור |
| חישוב עץ החלטות | Supabase pg_cron + Edge Function + טריגר אירועי | batch יומי + חישוב מחדש כשיש מספיק טראפיק |
| אחסון מסמכי רקע | Supabase Storage | PDF/DOCX שהועלו על ידי אדמין |
| אחסון תמונות מיוצרות | Supabase Storage | תוצרי DALL-E/Imagen נשמרים לאחר יצירה |

אין צורך בתשתית נוספת.

---

## 2. שינויים בסכמת בסיס הנתונים

### 2.1 טבלאות חדשות

#### 2.1.1 `section_variants` — חלופות לכל סקשן

שומרת תוכן חלופי לכל סקשן בעמוד. עד 3 חלופות (A, B, C) לכל סקשן.

```sql
CREATE TABLE section_variants (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id      UUID        NOT NULL REFERENCES page_sections(id) ON DELETE CASCADE,
  variant_key     TEXT        NOT NULL CHECK (variant_key IN ('A', 'B', 'C')),
  content         JSONB       NOT NULL DEFAULT '{}',
  styles          JSONB       DEFAULT '{}',

  -- מטאדאטה של יצירה
  source          TEXT        NOT NULL DEFAULT 'manual'
                              CHECK (source IN ('manual', 'ai_text', 'ai_image', 'ai_full')),
  ai_model        TEXT,       -- למשל 'gpt-4o', 'claude-sonnet-4', 'dall-e-3'
  ai_prompt_hash  TEXT,       -- SHA-256 של הפרומפט ששימש (לשחזור)
  generation_cost DECIMAL(10,6), -- עלות USD של יצירה זו

  -- תהליך אישור
  status          TEXT        NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected')),
  approved_by     UUID        REFERENCES auth.users(id),
  approved_at     TIMESTAMPTZ,
  rejection_note  TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(section_id, variant_key)
);
```

#### 2.1.2 `ab_experiments` — ניסויי A/B

מגדירה איזה עמוד מריץ ניסוי ומה ההגדרות שלו.

```sql
CREATE TABLE ab_experiments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id         UUID        NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  description     TEXT,

  -- הגדרות
  status          TEXT        NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft', 'running', 'paused', 'completed')),
  traffic_split   JSONB       NOT NULL DEFAULT '{"explore_pct": 5, "exploit_pct": 95}',
  target_goal     INTEGER     NOT NULL DEFAULT 1,  -- רמת מעורבות (1-5)
  confidence_threshold DECIMAL(3,2) NOT NULL DEFAULT 0.85,
  min_daily_visitors   INTEGER NOT NULL DEFAULT 20,

  -- תוצאות
  winning_combination JSONB,   -- { section_id: variant_key, ... }
  total_visitors      INTEGER NOT NULL DEFAULT 0,

  -- תזמון
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 2.1.3 `visitor_assignments` — הקצאת חלופות למבקרים

מתעדת איזה שילוב חלופות כל מבקר רואה, לפי ה-cookie_id שלו.

```sql
CREATE TABLE visitor_assignments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id   UUID        NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
  cookie_id       TEXT        NOT NULL,

  -- שילוב החלופות (JSONB map: section_id -> variant_key)
  -- לדוגמה: {"uuid-hero": "B", "uuid-benefits": "A", "uuid-cta": "C"}
  variant_combo   JSONB       NOT NULL DEFAULT '{}',

  -- הקשר ההקצאה (פיצ'רים עבור עץ ההחלטות)
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  utm_content     TEXT,
  utm_term        TEXT,
  referrer        TEXT,
  device_category TEXT,       -- 'mobile', 'desktop', 'tablet'
  day_of_week     SMALLINT,   -- 0=ראשון, 6=שבת
  hour_of_day     SMALLINT,   -- 0-23
  visit_number    SMALLINT    NOT NULL DEFAULT 1,

  -- שיטת הקצאה
  assignment_type TEXT        NOT NULL DEFAULT 'random'
                              CHECK (assignment_type IN ('random', 'model')),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 2.1.4 `engagement_events` — מעקב התנהגותי

מעקב פרטני אחר התנהגות כל מבקר בכל ביקור.

```sql
CREATE TABLE engagement_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id   UUID        REFERENCES visitor_assignments(id) ON DELETE SET NULL,
  page_id         UUID        NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  cookie_id       TEXT        NOT NULL,

  -- סיווג אירוע
  event_type      TEXT        NOT NULL,
  -- ערכים: 'page_view', 'time_on_page', 'scroll_depth',
  --        'element_click', 'form_focus', 'form_field_fill', 'lead_submit'

  event_data      JSONB       DEFAULT '{}',
  -- עבור time_on_page: { seconds: 15 }
  -- עבור scroll_depth: { percent: 75 }
  -- עבור element_click: { section_id: "uuid", element: "cta_button" }
  -- עבור form_focus: { field: "full_name" }
  -- עבור lead_submit: { lead_id: "uuid" }

  -- רמת מעורבות שהושגה (מחושב, 0-5)
  engagement_level SMALLINT   NOT NULL DEFAULT 0,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 2.1.5 `decision_tree_models` — מודלי עץ החלטות

שומרת את עץ ההחלטות המסודר בפורמט JSON לכל ניסוי.

```sql
CREATE TABLE decision_tree_models (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id   UUID        NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,

  -- מודל מסודר (ייצוג JSON של העץ)
  tree_json       JSONB       NOT NULL,

  -- מדדי ביצועים
  goal_level      SMALLINT    NOT NULL,  -- רמת המטרה שהעץ מאפטם לה
  sample_size     INTEGER     NOT NULL,
  accuracy        DECIMAL(5,4),
  improvement_pct DECIMAL(5,2), -- % שיפור מעל אקראי

  -- טריגר בנייה מחדש
  rebuild_trigger TEXT        NOT NULL DEFAULT 'scheduled'
                              CHECK (rebuild_trigger IN ('scheduled', 'traffic_threshold', 'goal_change', 'manual')),

  -- מחזור חיים
  is_active       BOOLEAN     NOT NULL DEFAULT false,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '2 days'),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 2.1.6 `program_reference_docs` — מסמכי רקע לתוכניות

מסמכי רקע שהועלו לכל תוכנית לימוד כהקשר עבור ה-AI.

```sql
CREATE TABLE program_reference_docs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id      UUID        NOT NULL REFERENCES programs(id) ON DELETE CASCADE,

  doc_type        TEXT        NOT NULL CHECK (doc_type IN ('pdf', 'docx', 'url', 'text')),
  title           TEXT        NOT NULL,
  storage_path    TEXT,        -- נתיב ב-Supabase Storage לקבצים שהועלו
  url             TEXT,        -- עבור לינקים חיצוניים
  extracted_text  TEXT,        -- טקסט שחולץ מ-PDF/DOCX עבור הקשר AI

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 2.1.7 `brand_guidelines` — הנחיות מותג

אחסון מסמך הנחיות מותג גלובלי.

```sql
CREATE TABLE brand_guidelines (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT        NOT NULL,
  storage_path    TEXT,
  extracted_text  TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 2.1.8 `tree_rebuild_log` — לוג בניית עץ מחדש

מתעדת כל בנייה מחדש של עץ, כולל הטריגר שגרם לה.

```sql
CREATE TABLE tree_rebuild_log (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id   UUID        NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,

  trigger_type    TEXT        NOT NULL, -- 'scheduled', 'traffic_threshold', 'goal_change', 'manual'
  previous_goal_level SMALLINT,
  new_goal_level      SMALLINT,
  previous_tree_id    UUID REFERENCES decision_tree_models(id),
  new_tree_id         UUID REFERENCES decision_tree_models(id),

  visitors_since_last INTEGER,  -- כמות מבקרים מאז הבנייה האחרונה
  improvement_pct     DECIMAL(5,2),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.2 שינויים בטבלאות קיימות

```sql
-- page_sections — הוספת מעקב חלופה פעילה
ALTER TABLE page_sections
  ADD COLUMN active_variant TEXT DEFAULT NULL
  CHECK (active_variant IS NULL OR active_variant IN ('A', 'B', 'C'));
-- NULL = תוכן מקורי (control), 'A'/'B'/'C' = חלופה מנצחת
```

### 2.3 מדיניות RLS

```sql
-- section_variants: אדמין גישה מלאה, אנונימי קורא רק מאושרות
ALTER TABLE section_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage variants" ON section_variants
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anon read approved variants" ON section_variants
  FOR SELECT TO anon USING (status = 'approved');

-- visitor_assignments: אנונימי יכול להוסיף (להקצאה), אדמין יכול לקרוא
ALTER TABLE visitor_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon insert assignments" ON visitor_assignments
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Admin read assignments" ON visitor_assignments
  FOR SELECT TO authenticated USING (true);

-- engagement_events: אנונימי יכול להוסיף, אדמין יכול לקרוא
ALTER TABLE engagement_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon insert events" ON engagement_events
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Admin read events" ON engagement_events
  FOR SELECT TO authenticated USING (true);

-- ab_experiments: אדמין גישה מלאה, אנונימי קורא רק ניסויים פעילים
ALTER TABLE ab_experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage experiments" ON ab_experiments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anon read running experiments" ON ab_experiments
  FOR SELECT TO anon USING (status = 'running');

-- decision_tree_models: אדמין גישה מלאה, אנונימי קורא רק פעיל
ALTER TABLE decision_tree_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage models" ON decision_tree_models
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anon read active models" ON decision_tree_models
  FOR SELECT TO anon USING (is_active = true);

-- program_reference_docs + brand_guidelines: אדמין בלבד
ALTER TABLE program_reference_docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage docs" ON program_reference_docs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE brand_guidelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage guidelines" ON brand_guidelines
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

---

## 3. נקודות אינטגרציה עם AI

### 3.1 מתי AI נקרא

AI נקרא **רק במהלך יצירת תוכן** בדשבורד הניהול — לעולם לא בזמן הגשת העמוד למבקר. זו עלות חד-פעמית לכל חלופה, לא עלות לכל ביקור.

| טריגר | מה קורה | מודל בשימוש |
|-------|---------|-------------|
| אדמין לוחץ "צור חלופת טקסט" | LLM מייצר קופי עברי חלופי לסקשן | GPT-4o / Claude Sonnet 4 / Gemini 2.5 Pro |
| אדמין לוחץ "צור חלופת תמונה" | מודל תמונות יוצר חלופה ויזואלית | DALL-E 3 / Imagen 3 |
| אדמין מעלה מסמך רקע (PDF/DOCX) | חילוץ טקסט + סיכום להקשר | GPT-4o-mini (זול, מהיר) |
| אדמין לוחץ "צור עמוד שלם" | LLM מייצר חלופות לכל הסקשנים בעמוד | GPT-4o / Claude Sonnet 4 |

### 3.2 ארכיטקטורת יצירת טקסט

**הרכבת הקשר לכל בקשת יצירה:**

1. הנחיות מותג (טקסט שחולץ מטבלת brand_guidelines)
2. מסמכי רקע לתוכנית (טקסט שחולץ מ-program_reference_docs)
3. תוכן הסקשן הנוכחי (גרסת ה-control)
4. סכמת סוג הסקשן (אילו שדות הסקשן משתמש)
5. תוכן סקשנים סמוכים (לקוהרנטיות)
6. מטאדאטה של התוכנית (שם, סוג תואר, תיאור, תוצאות קריירה)

**דוגמת פרומפט עבור סקשן Hero:**

```
אתה קופירייטר שיווקי בעברית עבור הקריה האקדמית אונו.

קול המותג:
{טקסט הנחיות מותג שחולץ}

מידע על התוכנית:
תוכנית: {program.name_he}
תואר: {program.degree_type}
תיאור: {program.description_he}
USPs מרכזיים: {ממסמכי רקע}

תוכן HERO נוכחי (Control):
כותרת: {content.heading_he}
תת-כותרת: {content.subheading_he}
טקסט CTA: {content.cta_text_he}

משימה:
צור גרסה חלופית של סקשן ה-hero שכולל:
1. זווית רגשית שונה (למשל: שאיפת קריירה לעומת יוקרה אקדמית לעומת שייכות לקהילה)
2. שמירה על קול המותג והטרמינולוגיה מההנחיות
3. כתיבה בעברית טבעית ומשכנעת
4. אותו מבנה תוכן אבל עם מסר שונה

החזר JSON עם השדות הבאים בדיוק:
{
  "heading_he": "...",
  "subheading_he": "...",
  "cta_text_he": "...",
  "stat_label_he": "..." (אם רלוונטי)
}

אל תשנה URL-ים של תמונות, ערכי נתונים, או אלמנטים מבניים.
```

### 3.3 ארכיטקטורת יצירת תמונות

**דוגמת פרומפט עבור תמונת רקע Hero:**

```
Create a professional, high-quality background photo for an Israeli academic
college landing page.

Program: Computer Science Bachelor's degree
Style: Modern, aspirational, clean
Brand colors to subtly incorporate: Lime green (#B8D900), dark gray (#2a2628)
Mood: Professional yet welcoming, diverse student body
Setting: Modern campus environment or technology workspace
Aspect ratio: 16:9 (1920x1080)
Requirements:
- No text in the image
- Suitable as a background behind white/light text overlay
- Slightly muted tones (will have a dark gradient overlay applied)
```

תמונות מיוצרות:
1. נשלחות ל-API יצירת תמונות
2. מורדות ונשמרות ב-Supabase Storage (`/media/ai-generated/{experiment_id}/`)
3. מקושרות ב-JSONB של החלופה כ-`background_image_url`

### 3.4 צינור חילוץ טקסט ממסמכים

כשאדמין מעלה PDF או DOCX:
1. קובץ נשמר ב-Supabase Storage תחת `/reference-docs/{program_id}/`
2. Edge Function בצד השרת מחלץ טקסט:
   - PDF: שימוש בחבילת `pdf-parse`
   - DOCX: שימוש בחבילת `mammoth`
3. טקסט מחולץ נשמר ב-`program_reference_docs.extracted_text`
4. אופציונלי: סיכום באמצעות GPT-4o-mini אם הטקסט עולה על 8,000 טוקנים

### 3.5 שכבת הפשטה של ספק AI

ממשק שלא תלוי בספק כדי לאפשר החלפה קלה:

```typescript
// /src/lib/ai/provider.ts
interface AITextProvider {
  generateVariant(params: {
    sectionType: string;
    currentContent: Record<string, unknown>;
    context: AIContext;
    language: 'he' | 'en' | 'ar';
  }): Promise<{ content: Record<string, unknown>; cost: number; model: string }>;
}

interface AIImageProvider {
  generateImage(params: {
    prompt: string;
    size: '1024x1024' | '1792x1024' | '1024x1792';
    style: 'natural' | 'vivid';
  }): Promise<{ imageUrl: string; cost: number; model: string }>;
}

interface AIContext {
  brandGuidelines: string;
  programDocs: string[];
  programMeta: Program;
  adjacentSections: Record<string, unknown>[];
}
```

---

## 4. מעקב התנהגותי בצד הלקוח

### 4.1 ארכיטקטורת סקריפט מעקב

מודול חדש (`/src/lib/tracking/engagement-tracker.ts`) רץ בכל עמוד נחיתה. הוא אוסף סיגנלים התנהגותיים ושולח אותם ב-batch ל-API המעקב.

**סיגנלים נעקבים:**

| סיגנל | איך מזוהה | רמת מעורבות |
|-------|-----------|-------------|
| צפייה בעמוד | אוטומטי בטעינה | 1 (אם >3 שניות) |
| זמן בעמוד | `setInterval` כל 5 שניות | 1 |
| עומק גלילה | `IntersectionObserver` ב-25%, 50%, 75%, 100% | 2 (ב-50%) |
| לחיצה על אלמנט | `addEventListener('click')` על אלמנטים אינטראקטיביים | 3 |
| פוקוס על טופס | `addEventListener('focus')` על שדות טופס | 4 |
| מילוי שדה טופס | `addEventListener('input')` על שדות טופס | 4 |
| שליחת ליד | חיבור לזרימת שליחת טופס קיימת | 5 |

### 4.2 זרימת הקצאת חלופות (צד לקוח)

כשעמוד נחיתה נטען:

1. בדיקת cookie `onoleads_id` (כבר קיים במערכת)
2. קריאה ל-`GET /api/variant-assignment?page_id={id}&cookie_id={id}` מ-Edge Function
3. Edge Function בודקת:
   - האם יש ניסוי פעיל לעמוד זה?
   - האם ל-cookie זה כבר הוקצו חלופות? (בדיקת `visitor_assignments`)
   - אם כן: החזרת הקצאה ששמורה ב-cache
   - אם לא: התייעצות עם מודל עץ ההחלטות או הקצאה אקראית
4. הלקוח מקבל `{ variant_combo: { "section-uuid": "B", ... }, assignment_id: "..." }`
5. הלקוח מחליף תוכן סקשנים לפי נתוני החלופה

### 4.3 אסטרטגיית החלפת תוכן

ה-HTML הסטטי מרנדר את גרסת ה-control. סקריפט בצד הלקוח:

1. ב-`DOMContentLoaded`, מביא הקצאת חלופות (מהיר — Edge Function, ~30ms)
2. לכל סקשן עם חלופה מוקצית, מביא תוכן חלופה מנתונים טעונים מראש
3. מחליף תוכן טקסט דרך `textContent`/`innerHTML`
4. מחליף תכונות `src` של תמונות
5. מסמן סקשנים עם `data-variant="B"` לייחוס מעקב

זה קורה תוך 100-200ms מטעינת העמוד. לעמודים עם מנצח ברור (>90% מהטראפיק), המנצח נאפה ל-build הסטטי דרך ISR.

---

## 5. אלגוריתם עץ ההחלטות (Decision Tree)

### 5.1 סקירה

עץ ההחלטות הוא עץ סיווג בינארי/רב-כיווני שממפה וקטורי פיצ'רים של מבקרים לשילובי חלופות אופטימליים. הוא מחושב לגמרי בצד השרת באמצעות שאילתות aggregate של PostgreSQL — לא נדרש שירות ML חיצוני.

### 5.2 וקטור פיצ'רים

כל מבקר מאופיין על ידי:

| פיצ'ר | סוג | ערכים | מקור |
|-------|-----|-------|------|
| `utm_source` | קטגוריאלי | facebook, google, instagram, tiktok, direct, other | פרמטרי URL |
| `utm_medium` | קטגוריאלי | cpc, organic, social, email, referral, other | פרמטרי URL |
| `utm_campaign` | קטגוריאלי | (ערכים ספציפיים לקמפיין) | פרמטרי URL |
| `device_category` | קטגוריאלי | mobile, desktop, tablet | User agent |
| `day_of_week` | קטגוריאלי | sun, mon, tue, wed, thu, fri, sat | זמן שרת |
| `hour_bucket` | קטגוריאלי | morning (6-12), afternoon (12-18), evening (18-24), night (0-6) | זמן שרת |
| `visit_number` | קטגוריאלי | first, second, returning (3+) | היסטוריית cookie |
| `referrer_domain` | קטגוריאלי | facebook.com, google.com, direct, other | כותרת Referrer |

### 5.3 אלגוריתם בניית העץ

העץ משתמש בגישת **CHAID (Chi-Squared Automatic Interaction Detection)**, מותאמת למידע מועט:

```
FUNCTION buildTree(data, features, depth, minSamples):
  IF depth >= MAX_DEPTH OR |data| < minSamples:
    RETURN leafNode(bestVariantCombo(data))

  bestFeature = null
  bestScore = 0

  FOR EACH feature IN features:
    FOR EACH possible split of feature:
      score = chiSquaredScore(data, feature, split)
      IF score > bestScore AND pValue < (1 - confidenceThreshold):
        bestFeature = feature
        bestScore = score

  IF bestFeature is null:
    RETURN leafNode(bestVariantCombo(data))

  node = splitNode(bestFeature)
  FOR EACH branch IN split(data, bestFeature):
    node.children[branch] = buildTree(branch.data, features - bestFeature, depth+1, minSamples)

  RETURN node
```

**פרמטרים:**
- `MAX_DEPTH`: מתחיל ב-1, עולה ל-2 אחרי 1,000 דגימות, ל-3 אחרי 5,000 דגימות
- `minSamples` לכל עלה: מינימום 30 מבקרים
- `confidenceThreshold`: 0.85 (85%)

### 5.4 ניקוד חלופות

לכל עלה בעץ, ניקוד כל שילוב חלופות על ידי חישוב **שיעור מעורבות ממושקל**:

```
score(combo) = Σ[level 1..5] (weight[level] * conversion_rate[level][combo])
```

המשקלות משתנים ככל שהדאטה מצטבר:
- **< 100 מבקרים**: weights = { 1: 0.40, 2: 0.30, 3: 0.20, 4: 0.08, 5: 0.02 }
- **100-500 מבקרים**: weights = { 1: 0.15, 2: 0.25, 3: 0.25, 4: 0.20, 5: 0.15 }
- **500+ מבקרים**: weights = { 1: 0.05, 2: 0.10, 3: 0.15, 4: 0.25, 5: 0.45 }

### 5.5 סידור העץ (Serialization)

העץ נשמר כ-JSONB ב-`decision_tree_models.tree_json`:

```json
{
  "type": "split",
  "feature": "device_category",
  "children": {
    "mobile": {
      "type": "split",
      "feature": "utm_source",
      "children": {
        "facebook": {
          "type": "leaf",
          "combo": { "section-hero-uuid": "B", "section-cta-uuid": "C" },
          "score": 0.73,
          "sample_size": 142
        },
        "google": {
          "type": "leaf",
          "combo": { "section-hero-uuid": "A", "section-cta-uuid": "B" },
          "score": 0.68,
          "sample_size": 98
        },
        "_default": {
          "type": "leaf",
          "combo": { "section-hero-uuid": "B", "section-cta-uuid": "A" },
          "score": 0.61,
          "sample_size": 55
        }
      }
    },
    "desktop": {
      "type": "leaf",
      "combo": { "section-hero-uuid": "A", "section-cta-uuid": "B" },
      "score": 0.71,
      "sample_size": 310
    }
  }
}
```

### 5.6 גיזום (Pruning)

לאחר הבנייה, גיזום צמתים כש:
1. השיפור מעל השילוב הטוב ביותר של ההורה < 5%
2. כל עלה עם פחות מ-30 דגימות
3. p-value של Chi-squared חורג מ-0.15

---

## 6. היררכיית מעורבות והתקדמות מטרות

### 6.1 חמש הרמות

| רמה | סיגנל | שיטת זיהוי | סף דאטה לאופטימיזציה |
|-----|-------|------------|----------------------|
| 1 | זמן בעמוד > 3 שניות | טיימר נורה ב-3s | 50 מבקרים לכל חלופה |
| 2 | גלילה > 50% מהעמוד | IntersectionObserver ב-50% | 50 מבקרים לכל חלופה |
| 3 | לחיצה על אלמנט אינטראקטיבי | Event delegation על כפתורים, לינקים, אקורדיונים | 100 מבקרים לכל חלופה |
| 4 | פוקוס על שדה טופס | Focus event על input בטופס | 200 מבקרים לכל חלופה |
| 5 | שליחת ליד | חיבור לתגובת POST `/api/leads` | 500 מבקרים לכל חלופה |

### 6.2 לוגיקת התקדמות מטרות

המערכת בוחרת אוטומטית לאיזו רמת מטרה לאפטם:

```
FUNCTION selectGoalLevel(experiment):
  FOR level FROM 5 DOWN TO 1:
    minVisitorsPerVariant = threshold[level]
    variantCounts = getVisitorCountsPerVariant(experiment)
    IF ALL variants have >= minVisitorsPerVariant visitors:
      conversionRates = getConversionRates(experiment, level)
      IF anyStatisticallySignificantDifference(conversionRates, 0.85):
        RETURN level
  RETURN 1  -- fallback לרמה הנמוכה ביותר
```

משמעות:
- **ימים 1-7**: סביר שמאפטם לרמה 1 (זמן בעמוד) או רמה 2 (גלילה)
- **שבועות 2-4**: עשוי להתקדם לרמה 3 (לחיצות) או רמה 4 (אינטראקציה עם טופס)
- **חודש 2+**: פוטנציאל אופטימיזציה לרמה 5 (שליחת ליד) בעמודים עם טראפיק גבוה

**חשוב:** כאשר רמת המטרה משתנה — העץ נבנה מחדש מיד (ראה סעיף 7).

---

## 7. תהליך חישוב מחדש — טריגרים ותזמון

### 7.1 שלושה טריגרים לבניית העץ מחדש

העץ אינו נבנה רק פעם ביום. ישנם **שלושה טריגרים** שגורמים לבנייה מחדש:

| טריגר | תנאי | תזמון |
|-------|------|-------|
| **מתוזמן (Scheduled)** | ריצה יומית קבועה | כל יום ב-03:00 שעון ישראל |
| **סף טראפיק (Traffic Threshold)** | כמות מבקרים חדשים מאז הבנייה האחרונה עוברת סף | בדיקה כל שעה דרך Vercel Cron |
| **שינוי מטרה (Goal Change)** | רמת המטרה התקדמה (למשל מרמה 2 לרמה 3) | מיידי — מזוהה בבדיקה השעתית |

### 7.2 לוגיקת טריגר סף טראפיק

```
FUNCTION checkTrafficThreshold(experiment):
  lastTreeComputedAt = getActiveTree(experiment).computed_at
  newVisitorsSince = COUNT(visitor_assignments WHERE created_at > lastTreeComputedAt)

  currentTreeSampleSize = getActiveTree(experiment).sample_size

  -- הסף הוא 20% גידול מעל הדגימה הנוכחית, מינימום 50 מבקרים חדשים
  threshold = MAX(50, currentTreeSampleSize * 0.20)

  IF newVisitorsSince >= threshold:
    TRIGGER rebuildTree(experiment, 'traffic_threshold')
```

**דוגמה:** אם העץ הנוכחי נבנה עם 300 דגימות, הסף יהיה MAX(50, 60) = 60 מבקרים חדשים. כלומר, אם 60 מבקרים חדשים הגיעו מאז הבנייה האחרונה — נבנה מחדש.

### 7.3 לוגיקת טריגר שינוי מטרה

```
FUNCTION checkGoalChange(experiment):
  currentGoalLevel = getActiveTree(experiment).goal_level
  newGoalLevel = selectGoalLevel(experiment)  -- מסעיף 6.2

  IF newGoalLevel > currentGoalLevel:
    -- התקדמנו לרמת מטרה גבוהה יותר!
    TRIGGER rebuildTree(experiment, 'goal_change')
    LOG "Goal level advanced from {currentGoalLevel} to {newGoalLevel}"

  ELSE IF newGoalLevel < currentGoalLevel:
    -- נסיגה — ייתכן שאין מספיק דאטה יותר (למשל מבקרים חדשים שגיללו פחות)
    -- לא בונים מחדש — ממתינים לבדיקה היומית
    LOG "Goal level regression detected: {currentGoalLevel} -> {newGoalLevel}"
```

### 7.4 תזמון Cron Jobs

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/recalculate-trees",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/check-rebuild-triggers",
      "schedule": "0 * * * *"
    }
  ]
}
```

- **ריצה יומית (00:00 UTC = 03:00 ישראל)**: בנייה מחדש מלאה לכל הניסויים הפעילים
- **ריצה שעתית**: בדיקת סף טראפיק + שינוי מטרה. בונה מחדש רק אם נדרש.

### 7.5 שלבי חישוב מחדש

```
FOR EACH experiment WHERE status = 'running':
  1. שאילתת visitor_assignments + engagement_events ל-30 הימים האחרונים
  2. בדיקה אם העמוד קיבל >= 20 מבקרים יומיים (ממוצע על 7 ימים)
     IF NOT: דלג על ניסוי זה (לא מספיק דאטה)

  3. קביעת רמת מטרה נוכחית (ראה סעיף 6.2)

  4. בניית מטריצת פיצ'רים מ-visitor_assignments
  5. בניית וקטור תוצאות מ-engagement_events (לפי רמת מטרה)
  6. הרצת אלגוריתם בניית עץ החלטות (סעיף 5.3)
  7. הערכת דיוק העץ באמצעות ולידציה holdout (פיצול 80/20)

  8. השוואת ציון עץ חדש מול עץ פעיל נוכחי:
     IF שיפור > 2%:
       - שמירת עץ חדש ב-decision_tree_models
       - סימון כ-is_active = true
       - סימון עץ ישן כ-is_active = false
       - רישום ב-tree_rebuild_log
     ELSE:
       - שמירת עץ נוכחי

  9. עדכון experiment.total_visitors
  10. רישום תוצאות חישוב ל-audit_logs
```

### 7.6 מנגנוני בטיחות

- **בדיקת מינימום דאטה**: דילוג על עמודים עם < 20 מבקרים יומיים (ממוצע 7 ימים)
- **ולידצית holdout**: תמיד ולידציה על 20% דאטה שלא נראה לפני פריסה
- **Rollback**: שמירת 5 גרסאות עץ אחרונות; אדמין יכול לחזור ידנית
- **Circuit breaker**: אם ציון מעורבות מרוכב יורד > 15% מ-baseline על פני 3 ימים, הניסוי נעצר אוטומטית ומתריע לאדמין
- **רצפת חקירה**: 5% מהטראפיק תמיד מקבל הקצאה אקראית, גם כשמודל פעיל
- **מגבלת תדירות**: מקסימום 3 בניות מחדש ביום לכל ניסוי (למנוע חישוב-יתר)

---

## 8. ממשק ניהול בדשבורד

### 8.1 נתיבים חדשים בדשבורד

| נתיב | מטרה |
|------|------|
| `/dashboard/optimization` | סקירה כללית של כל הניסויים בכל העמודים |
| `/dashboard/pages/[id]/variants` | ניהול חלופות לעמוד ספציפי |
| `/dashboard/pages/[id]/experiment` | הגדרה וניטור ניסוי A/B |
| `/dashboard/pages/[id]/experiment/tree` | ויזואליזציה של עץ ההחלטות הנוכחי |
| `/dashboard/settings/ai` | הגדרת ספק AI, מפתחות API, מגבלות עלות |
| `/dashboard/settings/brand` | העלאה/ניהול הנחיות מותג |
| `/dashboard/programs/[id]/docs` | העלאת מסמכי רקע לכל תוכנית |

### 8.2 ממשק ניהול חלופות (לכל עמוד)

ממוקם בתוך זרימת בונה העמודים הקיים. לכל סקשן ב-canvas:

1. **סרגל טאבים של חלופות**: מציג "מקורי | A | B | C"
2. **כפתור יצירה**: "צור עם AI" פותח מודל:
   - בחירת סוג תוכן: טקסט בלבד / תמונה בלבד / שניהם
   - בחירת ספק AI (מהאפשרויות המוגדרות)
   - תצוגה מקדימה של הערכת עלות
   - אישור ויצירה
3. **תצוגה מקדימה**: השוואה side-by-side של מקורי מול חלופה
4. **אישור**: תג סטטוס (טיוטה / ממתין / מאושר / נדחה) עם כפתורי אישור/דחייה
5. **עריכה**: עריכה ידנית של תוכן שנוצר ב-AI לפני אישור

### 8.3 ממשק דשבורד ניסויים

כרטיסים שמציגים:
- סטטוס ניסוי (טיוטה / פעיל / מושהה / הושלם)
- רמת מטרה נוכחית שמאפטמים לה
- חלוקת טראפיק (explore vs. exploit %)
- סה"כ מבקרים / המרות בכל רמה
- גרף השוואת ביצועי חלופות (bar chart לכל חלופה לכל רמת מטרה)
- ויזואליזציית עץ החלטות (דיאגרמת עץ מתקפלת)
- סיכום "שילוב מנצח" כשמנצח ברור מזוהה
- כפתורי פעולה: התחל / השהה / אפס / סיים
- **לוג בנייה מחדש**: טבלה שמציגה מתי כל בנייה מחדש התרחשה, מה הטריגר היה, ומה השתנה

### 8.4 סקירה כללית של אופטימיזציה

טבלה של כל העמודים עם עמודות:
- שם עמוד
- סטטוס ניסוי
- חלופות מוגדרות (כמות)
- רמת מטרה נוכחית
- שילוב הביצועים הטוב ביותר
- שיפור מול control (%)
- מבקרים יומיים
- פעולה מומלצת (אייקון: צריך יותר דאטה / רץ טוב / מנצח נמצא)
- טריגר בנייה אחרונה (מתוזמן / סף טראפיק / שינוי מטרה)

---

## 9. נקודות קצה API

### 9.1 נתיבי API חדשים

| שיטה | נתיב | מטרה | הרשאה |
|------|------|------|-------|
| `GET` | `/api/variant-assignment` | קבלת שילוב חלופות למבקר | Anon (Edge Function) |
| `POST` | `/api/track` | שליחת batch אירועי מעורבות | Anon |
| `POST` | `/api/admin/variants/generate` | הפעלת יצירת חלופה ב-AI | Auth |
| `GET/PUT` | `/api/admin/variants/[id]` | קריאה/עדכון תוכן וסטטוס חלופה | Auth |
| `POST` | `/api/admin/variants/[id]/approve` | אישור חלופה | Auth |
| `POST` | `/api/admin/variants/[id]/reject` | דחיית חלופה עם הערה | Auth |
| `GET/POST/PUT` | `/api/admin/experiments/[id]` | CRUD לניסויים | Auth |
| `POST` | `/api/admin/experiments/[id]/start` | התחלת ניסוי | Auth |
| `POST` | `/api/admin/experiments/[id]/pause` | השהיית ניסוי | Auth |
| `POST` | `/api/admin/experiments/[id]/complete` | סיום והחלת מנצח | Auth |
| `GET` | `/api/admin/experiments/[id]/results` | קבלת תוצאות ניסוי ועץ | Auth |
| `POST` | `/api/admin/reference-docs/upload` | העלאת מסמך רקע לתוכנית | Auth |
| `POST` | `/api/admin/brand-guidelines/upload` | העלאת הנחיות מותג | Auth |
| `POST` | `/api/cron/recalculate-trees` | חישוב עצים יומי מחדש | Cron secret |
| `POST` | `/api/cron/check-rebuild-triggers` | בדיקה שעתית של טריגרים לבנייה מחדש | Cron secret |

---

## 10. הערכת עלויות

### 10.1 הנחות

- 10 עמודי נחיתה פעילים
- 100,000 מבקרים/חודש סה"כ (10,000 לכל עמוד בממוצע)
- כל עמוד כולל ~8 סקשנים עם תוכן שניתן לבדוק
- 3 חלופות לכל סקשן (A, B, C) = 24 יצירות טקסט AI לכל עמוד
- 3 חלופות תמונה לכל עמוד (hero + 2 סקשנים נוספים)
- עלות יצירה חד-פעמית (לא חוזרת לכל ביקור)
- חישוב עץ ההחלטות הוא SQL מקומי — אפס עלות AI

### 10.2 עלויות יצירה חד-פעמיות (לכל עמוד)

#### יצירת טקסט (24 חלופות לכל עמוד, ~500 טוקנים פלט לכל אחד)

| ספק | מודל | עלות קלט/1K | עלות פלט/1K | טוקני קלט מוערכים | טוקני פלט מוערכים | עלות ל-10 עמודים |
|-----|------|------------|------------|-------------------|-------------------|-----------------|
| OpenAI | GPT-4o | $0.0025 | $0.01 | 48K | 12K | **$2.40** |
| OpenAI (Azure) | GPT-4o | $0.0025 | $0.01 | 48K | 12K | **$2.40** |
| Anthropic | Claude Sonnet 4 | $0.003 | $0.015 | 48K | 12K | **$3.24** |
| Anthropic | Claude Opus 4 | $0.015 | $0.075 | 48K | 12K | **$16.20** |
| Google | Gemini 2.5 Pro | $0.00125 | $0.01 | 48K | 12K | **$1.80** |

#### יצירת תמונות (3 תמונות לכל עמוד)

| ספק | מודל | עלות לתמונה | עלות ל-10 עמודים |
|-----|------|------------|-----------------|
| OpenAI | DALL-E 3 (1024x1024) | $0.04 | **$1.20** |
| OpenAI | DALL-E 3 (1792x1024) | $0.08 | **$2.40** |
| Google | Imagen 3 | $0.04 | **$1.20** |

#### סה"כ עלות יצירה חד-פעמית (10 עמודים, כל החלופות)

| שילוב ספקים | עלות טקסט | עלות תמונות | **סה"כ** |
|-------------|----------|------------|----------|
| GPT-4o + DALL-E 3 (1792) | $2.40 | $2.40 | **$4.80** |
| Claude Sonnet 4 + DALL-E 3 | $3.24 | $2.40 | **$5.64** |
| Gemini 2.5 Pro + Imagen 3 | $1.80 | $1.20 | **$3.00** |
| Azure GPT-4o + DALL-E 3 | $2.40 | $2.40 | **$4.80** |

**הערה:** אלו עלויות חד-פעמיות זניחות. גם אם ניצור מחדש את כל החלופות כל חודש, העלות מתחת ל-$10/חודש.

### 10.3 עלויות שוטפות חודשיות

#### אחסון מעקב אירועים (Supabase)

| מדד | נפח | גודל |
|-----|-----|------|
| מבקרים/חודש | 100,000 | -- |
| אירועים לכל מבקר (ממוצע) | 8 | -- |
| סה"כ אירועים/חודש | 800,000 | -- |
| גודל ממוצע שורת אירוע | ~200 bytes | -- |
| גידול אחסון חודשי | 160 MB | -- |
| הקצאות מבקרים/חודש | 100,000 שורות | 20 MB |

תוכנית Supabase Pro כוללת 8 GB database + 100 GB storage. בגידול של 180 MB/חודש, זה בר-קיימא ל-3+ שנים לפני שצריך לארכב אירועים ישנים.

#### סיכום עלויות חודשיות

| רכיב | עלות חודשית |
|------|------------|
| יצירת טקסט AI מחדש (אם נדרש) | $0-3 |
| יצירת תמונות AI מחדש (אם נדרש) | $0-2 |
| Supabase Pro | $25 (קיים) |
| Vercel Pro | $20 (קיים) |
| **סה"כ עלות נוספת** | **$0-5/חודש** |

**המערכת מוסיפה למעשה אפס עלות שוטפת כי:**
1. יצירת AI היא חד-פעמית (לא לכל ביקור)
2. חישוב עץ ההחלטות הוא SQL מקומי
3. מעקב אירועים נכנס בגבולות תוכנית Supabase/Vercel הקיימת

### 10.4 המלצה

שימוש ב-**Gemini 2.5 Pro + DALL-E 3** לעלות הנמוכה ביותר, או **GPT-4o + DALL-E 3** לאיכות הטקסט העברי הטובה ביותר. Claude Sonnet 4 הוא אפשרות ביניים חזקה לעברית. שמירת שכבת ההפשטה של ספק כדי שהחלפה תהיה טריוויאלית.

---

## 11. שלבי יישום ותלויות

### שלב 1: תשתית (שבועות 1-3)

**שבוע 1: בסיס נתונים + מודל נתונים**
- יצירת כל קבצי migration חדשים (8 טבלאות)
- הוספת מדיניות RLS
- עדכון TypeScript types
- קובץ types חדש `/src/lib/types/optimization.ts`

**שבוע 2: מסמכי רקע + הנחיות מותג**
- בניית ממשק העלאה בדשבורד
- מימוש חילוץ טקסט (PDF/DOCX) ב-API route
- שמירת טקסט מחולץ בבסיס הנתונים

**שבוע 3: מודל נתוני חלופות + ממשק אדמין**
- בניית ממשק ניהול חלופות בבונה העמודים
- מימוש יצירת חלופות ידנית
- מימוש תהליך אישור

**תלויות:** אין (תוספתי טהור)

### שלב 2: יצירת AI (שבועות 4-5)

**שבוע 4: אינטגרציית AI**
- מימוש שכבת הפשטה של ספק AI (`/src/lib/ai/`)
- בניית פרומפטים ליצירת טקסט לכל סוג סקשן
- בניית צינור יצירת תמונות
- API route: `/api/admin/variants/generate`

**שבוע 5: ממשק AI + בדיקות**
- כפתור "צור עם AI" בממשק ניהול חלופות
- תצוגה מקדימה לפני אישור
- מעקב ותצוגת עלויות
- בדיקה עם כל 18 סוגי סקשנים

**תלויות:** שלב 1 מושלם (טבלאות חלופות + מסמכי רקע)

### שלב 3: מעקב + A/B Testing (שבועות 6-8)

**שבוע 6: מעקב בצד לקוח**
- בניית מודול `EngagementTracker`
- אינטגרציה ב-`LandingPageLayout`
- בניית endpoint `/api/track`
- ולידציה שדאטה זורם ל-`engagement_events`

**שבוע 7: הקצאת חלופות**
- בניית Edge Function `/api/variant-assignment`
- בניית React hook `useVariantAssignment`
- מימוש החלפת תוכן ברנדרר סקשנים
- טיפול נכון ב-SSG/hydration (ללא הבהוב תוכן שגוי)

**שבוע 8: ניהול ניסויים**
- בניית ממשק יצירה/הגדרת ניסוי
- בניית דשבורד ניסוי (סטטוס, תוצאות, גרפים)
- בקרי התחל/השהה/סיים
- בדיקת A/B ידנית עם חלוקה 50/50 אקראית (ללא עץ החלטות עדיין)

**תלויות:** שלב 1 מושלם, שלב 2 רצוי

### שלב 4: עץ החלטות + פרסונליזציה (שבועות 9-11)

**שבוע 9: אלגוריתם עץ החלטות**
- מימוש אלגוריתם בניית עץ ב-TypeScript (רץ בצד שרת)
- מימוש לוגיקת פיצול CHAID
- מימוש סידור עץ ל-JSONB
- unit tests לבניית עץ

**שבוע 10: חישוב מחדש**
- בניית endpoints `/api/cron/recalculate-trees` ו-`/api/cron/check-rebuild-triggers`
- הגדרת Vercel cron jobs (יומי + שעתי)
- מימוש לוגיקת התקדמות רמת מטרה
- מימוש טריגרים לבנייה מחדש (סף טראפיק + שינוי מטרה)
- מימוש מנגנוני בטיחות (circuit breaker, רצפת חקירה)
- בניית רכיב ויזואליזציית עץ לדשבורד

**שבוע 11: פרסונליזציה + ליטוש**
- אינטגרציית עץ החלטות בזרימת הקצאת חלופות
- מימוש חלוקה 95/5 exploit/explore
- בניית דף סקירה כללית של אופטימיזציה
- בדיקת ביצועים (הבטחת <100ms הקצאת חלופות)
- בדיקת עומס (סימולציית 100K מבקרים/חודש)

**תלויות:** שלב 3 מושלם (דאטה מעקב נחוץ לבניית עצים)

### שלב 5: ניטור + הקשחה (שבוע 12)

- רישום audit לכל פעולות אופטימיזציה
- התראות אדמין ב-email: מנצח נמצא, circuit breaker הופעל, ירידת דיוק עץ
- מדיניות שמירת דאטה (ארכוב אירועים ישנים מ-90 ימים)
- תיעוד למשתמשי אדמין
- נהלי rollback מתועדים ונבדקים

---

## 12. ניהול סיכונים

### 12.1 אין מספיק דאטה

**סיכון:** עמודים עם פחות מ-20 מבקרים יומיים לא יהיה להם מספיק דאטה לעצי החלטות משמעותיים.

**הקלה:**
- המערכת נופלת אוטומטית ל-A/B testing אקראי כשהדאטה לא מספיק
- התקדמות מטרות מבטיחה שמאפטמים למטריקות שניתנות להשגה קודם
- שקילת איחוד דאטה מתוכניות דומות (אותה פקולטה/רמת תואר)
- תקופת תצפית מינימלית של 4 שבועות לפני ציפייה לפיצולי עץ משמעותיים

### 12.2 הבהוב תוכן בטעינת עמוד

**סיכון:** מבקרים עשויים לראות תוכן control לרגע לפני שתוכן החלופה מחליף.

**הקלה:**
- Edge Function להקצאת חלופות (~30ms latency)
- Cache הקצאה ב-cookie `onoleads_id` למבקרים חוזרים (אפס latency)
- לעמודים עם מנצח ברור (>90% טראפיק), אפייה של המנצח ל-build הסטטי דרך ISR
- שימוש ב-CSS `opacity: 0` על סקשנים שזכאים לחלופה עד שהקצאה נטענת, עם timeout של 200ms כ-fallback

### 12.3 השפעה שלילית על המרות

**סיכון:** חלופות שנוצרו ב-AI או פיצול עץ גרוע עלולים להפחית המרות.

**הקלה:**
- כל חלופות AI דורשות אישור אדמין לפני שהן עולות
- רצפת חקירה 5% מבטיחה שחלופת control תמיד מקבלת טראפיק
- Circuit breaker: אם ציון מעורבות 3-ימי יורד >15%, הניסוי נעצר אוטומטית
- כל ניסוי ניתן להשהייה מיידית או rollback ל-control
- התחלה עם עמוד אחד בעל טראפיק גבוה כפיילוט לפני פריסה לכל 10

### 12.4 איכות תוכן עברי

**סיכון:** טקסט עברי שנוצר ב-AI עלול להישמע לא טבעי או להכיל שגיאות.

**הקלה:**
- אדמין סוקר ויכול לערוך כל חלופה שנוצרה ב-AI לפני אישור
- שימוש במסמך הנחיות מותג כהקשר לשמירת עקביות קול
- יצירת 3 חלופות ואדמין בוחר את הטובה ביותר
- שקילת התחלה עם GPT-4o שיש לו יכולות עברית חזקות
- שלב אישור human-in-the-loop הוא בלתי-ניתן-לוויתור

### 12.5 גידול בסיס נתונים

**סיכון:** טבלת engagement_events עלולה לגדול מאוד (800K שורות/חודש).

**הקלה:**
- חלוקת (Partition) `engagement_events` לפי חודש אחרי 6 חודשים
- ארכוב אירועים ישנים מ-90 ימים (רק תוצאות מצוברות נחוצות לעץ)
- שימוש ב-`UNLOGGED` table לחוצץ אירועים בזמן אמת אם ביצועי כתיבה הופכים לבעיה
- הערכה: 2 GB/שנה של דאטה אירועים, בתוך גבולות Supabase Pro

### 12.6 פרטיות

**סיכון:** מעקב התנהגותי עלול לעורר חששות פרטיות.

**הקלה:**
- כל המעקב משתמש ב-cookie `onoleads_id` קיים (כבר מוצהר במדיניות פרטיות)
- שום PII לא נשמר באירועי מעורבות (רק cookie_id, סוג אירוע, חותמות זמן)
- באנר הסכמת cookie הקיים כבר מכסה ניתוח התנהגותי
- דאטה נשמר ב-Supabase (תשתית עצמית), לא משותף חיצונית
- APIs חיצוניים של AI מקבלים רק בקשות יצירת תוכן (שום דאטה מבקרים לא נשלח)
- עדכון מדיניות פרטיות לציון A/B testing ואופטימיזציה התנהגותית

---

## נספח א': סוגי סקשנים ואלמנטים שניתנים לבדיקה

לכל אחד מ-18 סוגי הסקשנים, הנה שדות התוכן שזכאים לחלופות שנוצרו ב-AI:

| סוג סקשן | שדות טקסט | שדות תמונה |
|----------|----------|------------|
| hero | heading_he, subheading_he, cta_text_he, stat_label_he | background_image_url |
| about | heading_he, description_he, bullets | image_url |
| benefits | heading_he, item titles + descriptions (מערך) | item icons |
| curriculum | heading_he, items (מערך) | -- |
| career | heading_he, items (מערך) | -- |
| faculty | heading_he, member descriptions | -- |
| stats | stat values + labels | -- |
| testimonials | heading_he, quotes (מערך) | testimonial images |
| video | heading_he, description_he | thumbnail |
| faq | heading_he, questions + answers (מערך) | -- |
| cta | heading_he, description_he, button_text_he | background_image |
| admission | heading_he, requirements text | -- |
| gallery | heading_he, caption texts | gallery images |
| map | heading_he, description_he | -- |
| countdown | heading_he, description_he | -- |
| whatsapp | message_text | -- |
| program_info_bar | label texts | -- |
| form | heading_he, subheading_he, submit_text_he | -- |

---

## נספח ב': מילון מונחים

| מונח | הגדרה |
|------|-------|
| **Control** | תוכן הסקשן המקורי (ללא חלופה) |
| **Variant (חלופה)** | גרסה חלופית של תוכן סקשן (A, B, או C) |
| **Combo (שילוב)** | שילוב ספציפי של חלופות בכל סקשני העמוד |
| **Experiment (ניסוי)** | בדיקת A/B הרצה על עמוד ספציפי |
| **Engagement Level (רמת מעורבות)** | אחד מ-5 סיגנלים התנהגותיים היררכיים (ראה סעיף 6) |
| **Goal Level (רמת מטרה)** | רמת המעורבות שמאפטמים לה כעת |
| **Exploration (חקירה)** | הצגת חלופות אקראיות לאיסוף דאטה מגוון (5% מהטראפיק) |
| **Exploitation (ניצול)** | הצגת השילוב המומלץ של עץ ההחלטות (95% מהטראפיק) |
| **Decision Tree (עץ החלטות)** | מודל היררכי שממפה פיצ'רי מבקר לשילובי חלופות אופטימליים |
| **Leaf Node (עלה)** | צומת סופי בעץ ההחלטות המכיל שילוב חלופות מומלץ |
| **Split Node (צומת פיצול)** | צומת מסתעף שמחלק מבקרים לפי פיצ'ר (למשל סוג מכשיר) |
| **CHAID** | Chi-Squared Automatic Interaction Detection — שיטת בניית עץ |
| **Circuit Breaker** | מנגנון בטיחות שמשהה ניסוי כשביצועים יורדים |
| **ISR** | Incremental Static Regeneration — פיצ'ר Next.js לבניית עמודים מחדש לפי דרישה |

---

## נספח ג': קבצים קריטיים ליישום

הקבצים הקיימים הבאים הם נקודות המגע הקריטיות ביותר ליישום מערכת זו:

| קובץ | מטרה |
|------|------|
| `src/components/landing/landing-page-layout.tsx` | רנדרר סקשנים מרכזי — צריך שינוי לתמיכה בהחלפת תוכן חלופות |
| `src/app/lp/[slug]/page.tsx` | נתיב עמוד נחיתה SSG — צריך להעביר נתוני ניסוי/חלופות לקומפוננטת layout |
| `supabase/migrations/001_initial_schema.sql` | הסכמה הקיימת שכל migrations חדשים מפנים אליה |
| `src/lib/types/database.ts` | הגדרות TypeScript types שצריך להרחיב עם ממשקי טבלאות חדשים |
| `src/components/landing/sections/*.tsx` | 18 רכיבי סקשן שצריכים לקבל תוכן חלופי |
| `src/app/api/leads/route.ts` | endpoint שליחת ליד — צריך חיבור לאירוע מעורבות רמה 5 |
| `src/hooks/use-url-params.ts` | חילוץ פרמטרי UTM — בסיס לפיצ'רים של עץ ההחלטות |

---

**סוף מסמך**

*מסמך זה ממתין לאישור מחלקת מערכות מידע לפני תחילת יישום.*
