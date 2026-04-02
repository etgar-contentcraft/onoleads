"use client";

/**
 * GenericEditor — editing panels for all section types except hero.
 * Every text field shows a live character counter and has a tooltip explaining its purpose.
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";
import { CharCount } from "../char-count";

type GenericContent = Record<string, unknown>;

interface GenericEditorProps {
  sectionType: string;
  content: GenericContent;
  onChange: (content: GenericContent) => void;
}

/** Labeled field row with optional char counter and tooltip */
function F({
  label,
  tip,
  max,
  value,
  children,
}: {
  label: string;
  tip?: string;
  max?: number;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label title={tip} className={`text-xs font-semibold leading-none ${tip ? "cursor-help" : ""}`}>
          {label}
          {tip && <span className="mr-1 text-[#9A969A] text-[10px]">ℹ</span>}
        </Label>
        {max !== undefined && value !== undefined && <CharCount value={value} max={max} />}
      </div>
      {children}
    </div>
  );
}

// ─── Video ────────────────────────────────────────────────────────────────────

interface VideoItem {
  youtube_id: string;
  title_he: string;
  duration_he?: string;
  thumbnail_url?: string;
}

function VideoEditorFields({ content, onChange }: { content: GenericContent; onChange: (c: GenericContent) => void }) {
  const videos = (content.videos as VideoItem[]) || [];
  const layout = (content.layout as string) || "featured";

  /** Update a single video in the array */
  const updateVideo = (index: number, field: string, value: string) => {
    const updated = [...videos];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...content, videos: updated });
  };

  /** Add a new empty video slot */
  const addVideo = () => {
    onChange({
      ...content,
      videos: [...videos, { youtube_id: "", title_he: "", duration_he: "" }],
    });
  };

  /** Remove a video by index */
  const removeVideo = (index: number) => {
    onChange({ ...content, videos: videos.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <F
        label="כותרת הסקציה (עברית)"
        tip="כותרת שמוצגת מעל הסרטונים. אופציונלי."
        max={60}
        value={(content.heading_he as string) || ""}
      >
        <Input
          value={(content.heading_he as string) || ""}
          onChange={(e) => onChange({ ...content, heading_he: e.target.value })}
          placeholder="צפו בסרטון הסיור שלנו"
          dir="rtl"
        />
      </F>

      <F label="תצוגה" tip="featured = סרטון גדול + פלייליסט בצד. grid = גריד שווה.">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...content, layout: "featured" })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              layout === "featured" ? "bg-[#B8D900] text-[#2a2628]" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Featured + פלייליסט
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...content, layout: "grid" })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              layout === "grid" ? "bg-[#B8D900] text-[#2a2628]" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Grid
          </button>
        </div>
      </F>

      {/* Legacy single-video field for backwards compatibility */}
      {videos.length === 0 && (
        <F label="YouTube URL (סרטון בודד)" tip="קישור YouTube. אם אתה רוצה כמה סרטונים, השתמש ב-'הוסף סרטון' למטה.">
          <Input
            value={(content.video_url as string) || ""}
            onChange={(e) => onChange({ ...content, video_url: e.target.value })}
            placeholder="https://youtube.com/watch?v=..."
          />
        </F>
      )}

      {/* Video list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">סרטונים ({videos.length})</Label>
          <Button type="button" variant="outline" size="sm" onClick={addVideo} className="gap-1 text-xs h-7">
            <Plus className="w-3 h-3" /> הוסף סרטון
          </Button>
        </div>

        {videos.map((video, i) => (
          <div key={i} className="border rounded-lg p-3 space-y-2 bg-gray-50/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-[#9A969A]">סרטון {i + 1}</span>
              <button type="button" onClick={() => removeVideo(i)} className="text-red-400 hover:text-red-600">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <Input
              value={video.youtube_id || ""}
              onChange={(e) => updateVideo(i, "youtube_id", e.target.value)}
              placeholder="YouTube URL או ID — https://youtube.com/watch?v=..."
              className="text-xs"
            />
            <div className="flex gap-2">
              <Input
                value={video.title_he || ""}
                onChange={(e) => updateVideo(i, "title_he", e.target.value)}
                placeholder="כותרת הסרטון"
                dir="rtl"
                className="text-xs flex-1"
              />
              <Input
                value={video.duration_he || ""}
                onChange={(e) => updateVideo(i, "duration_he", e.target.value)}
                placeholder="3:45"
                className="text-xs w-20"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function StatsEditorFields({ content, onChange }: { content: GenericContent; onChange: (c: GenericContent) => void }) {
  const items = (content.items as Array<{ value: string; label_he: string; label_en: string; suffix?: string }>) || [];

  const updateItem = (index: number, item: typeof items[0]) => {
    const newItems = [...items];
    newItems[index] = item;
    onChange({ ...content, items: newItems });
  };

  return (
    <div className="space-y-4">
      <F
        label="כותרת (עברית)"
        tip="כותרת הסקשן שמוצגת מעל המספרים. אופציונלי — אפשר להשאיר ריק."
        max={50}
        value={(content.heading_he as string) || ""}
      >
        <Input
          value={(content.heading_he as string) || ""}
          onChange={(e) => onChange({ ...content, heading_he: e.target.value })}
          placeholder="המספרים מדברים"
          dir="rtl"
        />
      </F>
      {items.map((item, index) => (
        <div key={index} className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9A969A]">נתון {index + 1}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" title="מחק נתון" onClick={() => onChange({ ...content, items: items.filter((_, i) => i !== index) })}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="flex justify-between">
                <Label className="text-xs" title="המספר או האחוז שיוצג בגדול. לדוג': 90%, 50,000+">ערך</Label>
                <CharCount value={item.value} max={10} />
              </div>
              <Input value={item.value} onChange={(e) => updateItem(index, { ...item, value: e.target.value })} placeholder="90%" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs" title="מה מציגים לאחר הערך. למשל '+' או '%'.">סיומת</Label>
              <Input value={item.suffix || ""} onChange={(e) => updateItem(index, { ...item, suffix: e.target.value })} placeholder="+" className="h-8 text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="flex justify-between">
                <Label className="text-xs" title="תיאור הנתון בעברית. מוצג מתחת למספר.">תווית (עברית)</Label>
                <CharCount value={item.label_he} max={30} />
              </div>
              <Input value={item.label_he} onChange={(e) => updateItem(index, { ...item, label_he: e.target.value })} dir="rtl" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <Label className="text-xs" title="Stat label in English.">Label (EN)</Label>
                <CharCount value={item.label_en} max={30} />
              </div>
              <Input value={item.label_en} onChange={(e) => updateItem(index, { ...item, label_en: e.target.value })} className="h-8 text-xs" />
            </div>
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" title="הוסף נתון סטטיסטי נוסף (מומלץ: עד 4 נתונים)" onClick={() => onChange({ ...content, items: [...items, { value: "", label_he: "", label_en: "", suffix: "" }] })} className="w-full">
        <Plus className="w-3.5 h-3.5 mr-1.5" /> הוסף נתון
      </Button>
    </div>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

function TestimonialsEditorFields({ content, onChange }: { content: GenericContent; onChange: (c: GenericContent) => void }) {
  const items = (content.items as Array<{ name: string; role_he: string; role_en?: string; quote_he: string; quote_en?: string; image_url?: string; video_url?: string }>) || [];

  const updateItem = (index: number, item: typeof items[0]) => {
    const newItems = [...items];
    newItems[index] = item;
    onChange({ ...content, items: newItems });
  };

  return (
    <div className="space-y-4">
      <F label="כותרת (עברית)" tip="כותרת סקשן ההמלצות. אופציונלי." max={50} value={(content.heading_he as string) || ""}>
        <Input value={(content.heading_he as string) || ""} onChange={(e) => onChange({ ...content, heading_he: e.target.value })} dir="rtl" placeholder="מה אומרים הסטודנטים" />
      </F>
      {items.map((item, index) => (
        <div key={index} className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9A969A]">המלצה {index + 1}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" title="מחק המלצה" onClick={() => onChange({ ...content, items: items.filter((_, i) => i !== index) })}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <Label className="text-xs" title="שם מלא של הסטודנט/ית.">שם</Label>
              <CharCount value={item.name} max={30} />
            </div>
            <Input value={item.name} onChange={(e) => updateItem(index, { ...item, name: e.target.value })} placeholder="ישראל ישראלי" className="h-8 text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="flex justify-between">
                <Label className="text-xs" title="תפקיד/תואר שהסטודנט לומד או למד.">תפקיד (עברית)</Label>
                <CharCount value={item.role_he} max={40} />
              </div>
              <Input value={item.role_he} onChange={(e) => updateItem(index, { ...item, role_he: e.target.value })} placeholder="בוגר תואר ראשון" dir="rtl" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <Label className="text-xs" title="Role in English.">Role (EN)</Label>
                <CharCount value={item.role_en || ""} max={40} />
              </div>
              <Input value={item.role_en || ""} onChange={(e) => updateItem(index, { ...item, role_en: e.target.value })} placeholder="BA Graduate" className="h-8 text-xs" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <Label className="text-xs" title="ציטוט ישיר בגוף ראשון. עד 150 תווים לתצוגה מיטבית.">ציטוט (עברית)</Label>
              <CharCount value={item.quote_he} max={150} />
            </div>
            <Textarea value={item.quote_he} onChange={(e) => updateItem(index, { ...item, quote_he: e.target.value })} placeholder="אונו שינתה את הכיוון שלי..." dir="rtl" rows={2} className="text-xs" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <Label className="text-xs" title="Quote in English.">Quote (EN)</Label>
              <CharCount value={item.quote_en || ""} max={150} />
            </div>
            <Textarea value={item.quote_en || ""} onChange={(e) => updateItem(index, { ...item, quote_en: e.target.value })} placeholder="Ono changed my direction..." rows={2} className="text-xs" />
          </div>
          <F label="תמונה (URL)" tip="תמונת פרופיל. מידות: 200×200px לפחות, ריבועית. JPG/PNG/WebP.">
            <Input value={item.image_url || ""} onChange={(e) => updateItem(index, { ...item, image_url: e.target.value })} placeholder="https://..." className="h-8 text-xs" />
          </F>
          <F label="סרטון YouTube (אופציונלי)" tip="קישור YouTube לעדות וידאו. הסרטון יוצג מעל הציטוט בכרטיס.">
            <Input value={item.video_url || ""} onChange={(e) => updateItem(index, { ...item, video_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." className="h-8 text-xs" />
          </F>
        </div>
      ))}
      <Button variant="outline" size="sm" title="הוסף המלצת סטודנט (מומלץ: 3-6 המלצות)" onClick={() => onChange({ ...content, items: [...items, { name: "", role_he: "", quote_he: "", quote_en: "" }] })} className="w-full">
        <Plus className="w-3.5 h-3.5 mr-1.5" /> הוסף המלצה
      </Button>
    </div>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function CtaEditorFields({ content, onChange }: { content: GenericContent; onChange: (c: GenericContent) => void }) {
  return (
    <Tabs defaultValue="he" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="he">עברית</TabsTrigger>
        <TabsTrigger value="en">English</TabsTrigger>
        <TabsTrigger value="ar">عربي</TabsTrigger>
      </TabsList>
      <TabsContent value="he" className="space-y-4 mt-4">
        <F label="כותרת" tip="כותרת גדולה מעל כפתור ה-CTA. שאלה או הצהרה קצרה." max={50} value={(content.heading_he as string) || ""}>
          <Input value={(content.heading_he as string) || ""} onChange={(e) => onChange({ ...content, heading_he: e.target.value })} dir="rtl" placeholder="מוכנים להתחיל?" />
        </F>
        <F label="תיאור" tip="שורה אחת מתחת לכותרת — מסביר את הערך בלחיצה." max={120} value={(content.description_he as string) || ""}>
          <Textarea value={(content.description_he as string) || ""} onChange={(e) => onChange({ ...content, description_he: e.target.value })} dir="rtl" rows={2} />
        </F>
        <F label="טקסט כפתור" tip="הפועל על הכפתור. קצר וחד — 'להרשמה', 'קבלו מידע', 'דברו איתנו'." max={22} value={(content.button_text_he as string) || ""}>
          <Input value={(content.button_text_he as string) || ""} onChange={(e) => onChange({ ...content, button_text_he: e.target.value })} dir="rtl" placeholder="להרשמה" />
        </F>
      </TabsContent>
      <TabsContent value="en" className="space-y-4 mt-4">
        <F label="Heading" tip="Large heading above the CTA button." max={50} value={(content.heading_en as string) || ""}>
          <Input value={(content.heading_en as string) || ""} onChange={(e) => onChange({ ...content, heading_en: e.target.value })} placeholder="Ready to start?" />
        </F>
        <F label="Description" tip="One-line descriptor below the heading." max={120} value={(content.description_en as string) || ""}>
          <Textarea value={(content.description_en as string) || ""} onChange={(e) => onChange({ ...content, description_en: e.target.value })} rows={2} />
        </F>
        <F label="Button Text" tip="Action verb for the button. Keep short." max={22} value={(content.button_text_en as string) || ""}>
          <Input value={(content.button_text_en as string) || ""} onChange={(e) => onChange({ ...content, button_text_en: e.target.value })} placeholder="Register Now" />
        </F>
      </TabsContent>
      <TabsContent value="ar" className="space-y-4 mt-4">
        <F label="العنوان" tip="عنوان كبير فوق زر CTA." max={50} value={(content.heading_ar as string) || ""}>
          <Input value={(content.heading_ar as string) || ""} onChange={(e) => onChange({ ...content, heading_ar: e.target.value })} dir="rtl" />
        </F>
        <F label="الوصف" max={120} value={(content.description_ar as string) || ""}>
          <Textarea value={(content.description_ar as string) || ""} onChange={(e) => onChange({ ...content, description_ar: e.target.value })} dir="rtl" rows={2} />
        </F>
        <F label="نص الزر" max={22} value={(content.button_text_ar as string) || ""}>
          <Input value={(content.button_text_ar as string) || ""} onChange={(e) => onChange({ ...content, button_text_ar: e.target.value })} dir="rtl" />
        </F>
      </TabsContent>
      <div className="mt-4 space-y-3">
        <F label="כתובת URL לכפתור" tip="לאן ילך הלחצן. '#form' לגלילה לטופס בעמוד. URL מלא לדף חיצוני.">
          <Input value={(content.button_url as string) || ""} onChange={(e) => onChange({ ...content, button_url: e.target.value })} placeholder="#form" />
        </F>
        <F label="צבע רקע (hex)" tip="הצבע מאחורי בלוק ה-CTA. ברירת מחדל: #B8D900 (צהוב-ירוק אונו).">
          <Input value={(content.bg_color as string) || ""} onChange={(e) => onChange({ ...content, bg_color: e.target.value })} placeholder="#B8D900" />
        </F>
      </div>
    </Tabs>
  );
}

// ─── WhatsApp ─────────────────────────────────────────────────────────────────

function WhatsappEditorFields({ content, onChange }: { content: GenericContent; onChange: (c: GenericContent) => void }) {
  return (
    <div className="space-y-4">
      <F label="מספר WhatsApp" tip="מספר בפורמט בינלאומי ללא '+'. לדוגמה: 972501234567. אם ריק — יורש מהגדרות הכלליות.">
        <Input value={(content.phone as string) || ""} onChange={(e) => onChange({ ...content, phone: e.target.value })} placeholder="972501234567" />
      </F>
      <F label="הודעה ברירת מחדל (עברית)" tip="הטקסט שיופיע מראש בצ'אט. המשתמש יכול לשנות." max={100} value={(content.message_he as string) || ""}>
        <Textarea value={(content.message_he as string) || ""} onChange={(e) => onChange({ ...content, message_he: e.target.value })} dir="rtl" placeholder="היי, אשמח לקבל פרטים על התוכנית" rows={2} />
      </F>
      <F label="הודעה ברירת מחדל (אנגלית)" max={100} value={(content.message_en as string) || ""}>
        <Textarea value={(content.message_en as string) || ""} onChange={(e) => onChange({ ...content, message_en: e.target.value })} placeholder="Hi, I'd like more info" rows={2} />
      </F>
      <F label="טולטיפ (עברית)" tip="הטקסט שמופיע בבועה מעל הכפתור הצף." max={40} value={(content.tooltip_he as string) || ""}>
        <Input value={(content.tooltip_he as string) || ""} onChange={(e) => onChange({ ...content, tooltip_he: e.target.value })} dir="rtl" placeholder="דברו איתנו בוואטסאפ" />
      </F>
    </div>
  );
}

// ─── Accordion ────────────────────────────────────────────────────────────────

function AccordionEditorFields({ content, onChange }: { content: GenericContent; onChange: (c: GenericContent) => void }) {
  const items = (content.items as Array<{ title_he: string; title_en?: string; body_he: string; body_en?: string }>) || [];
  const updateItem = (index: number, item: typeof items[0]) => {
    const n = [...items];
    n[index] = item;
    onChange({ ...content, items: n });
  };

  return (
    <div className="space-y-4">
      <F label="כותרת (עברית)" tip="כותרת הסקשן. אופציונלי." max={50} value={(content.heading_he as string) || ""}>
        <Input value={(content.heading_he as string) || ""} onChange={(e) => onChange({ ...content, heading_he: e.target.value })} dir="rtl" />
      </F>
      {items.map((item, index) => (
        <div key={index} className="p-3 rounded-lg border bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9A969A]">פריט {index + 1}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" title="מחק פריט" onClick={() => onChange({ ...content, items: items.filter((_, i) => i !== index) })}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <Label className="text-xs" title="הכותרת הנראית כשהפריט סגור.">כותרת (עברית)</Label>
              <CharCount value={item.title_he} max={60} />
            </div>
            <Input value={item.title_he} onChange={(e) => updateItem(index, { ...item, title_he: e.target.value })} placeholder="שאלה או נושא" dir="rtl" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <Label className="text-xs" title="התוכן שנחשף לאחר לחיצה. יכול להיות ארוך.">תוכן (עברית)</Label>
              <CharCount value={item.body_he} max={300} />
            </div>
            <Textarea value={item.body_he} onChange={(e) => updateItem(index, { ...item, body_he: e.target.value })} placeholder="תשובה או תיאור מפורט" dir="rtl" rows={2} className="text-xs" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <Label className="text-xs">Title (EN)</Label>
              <CharCount value={item.title_en || ""} max={60} />
            </div>
            <Input value={item.title_en || ""} onChange={(e) => updateItem(index, { ...item, title_en: e.target.value })} placeholder="Title" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <Label className="text-xs">Content (EN)</Label>
              <CharCount value={item.body_en || ""} max={300} />
            </div>
            <Textarea value={item.body_en || ""} onChange={(e) => updateItem(index, { ...item, body_en: e.target.value })} placeholder="Content" rows={2} className="text-xs" />
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" title="הוסף שורה לאקורדיון" onClick={() => onChange({ ...content, items: [...items, { title_he: "", title_en: "", body_he: "", body_en: "" }] })} className="w-full">
        <Plus className="w-3.5 h-3.5 mr-1.5" /> הוסף פריט
      </Button>
    </div>
  );
}

// ─── Gallery ──────────────────────────────────────────────────────────────────

function GalleryEditorFields({ content, onChange }: { content: GenericContent; onChange: (c: GenericContent) => void }) {
  const images = (content.images as Array<{ url: string; alt_he?: string; alt_en?: string }>) || [];
  const updateImage = (index: number, img: typeof images[0]) => {
    const n = [...images];
    n[index] = img;
    onChange({ ...content, images: n });
  };

  return (
    <div className="space-y-4">
      <F label="כותרת (עברית)" tip="כותרת הגלריה. אופציונלי." max={50} value={(content.heading_he as string) || ""}>
        <Input value={(content.heading_he as string) || ""} onChange={(e) => onChange({ ...content, heading_he: e.target.value })} dir="rtl" />
      </F>
      {images.map((img, index) => (
        <div key={index} className="p-3 rounded-lg border bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9A969A]">תמונה {index + 1}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" title="מחק תמונה" onClick={() => onChange({ ...content, images: images.filter((_, i) => i !== index) })}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
          <F label="URL תמונה" tip="קישור לתמונה. מידות מומלצות: 800×600px לפחות. JPG/WebP.">
            <Input value={img.url} onChange={(e) => updateImage(index, { ...img, url: e.target.value })} placeholder="https://..." className="h-8 text-xs" />
          </F>
          <div className="space-y-1">
            <div className="flex justify-between">
              <Label className="text-xs" title="תיאור הנגישות לתמונה. חשוב לנגישות ו-SEO.">Alt text (עברית)</Label>
              <CharCount value={img.alt_he || ""} max={80} />
            </div>
            <Input value={img.alt_he || ""} onChange={(e) => updateImage(index, { ...img, alt_he: e.target.value })} placeholder="תיאור התמונה" dir="rtl" className="h-8 text-xs" />
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" title="הוסף תמונה לגלריה" onClick={() => onChange({ ...content, images: [...images, { url: "", alt_he: "", alt_en: "" }] })} className="w-full">
        <Plus className="w-3.5 h-3.5 mr-1.5" /> הוסף תמונה
      </Button>
    </div>
  );
}

// ─── Curriculum ───────────────────────────────────────────────────────────────

function CurriculumEditorFields({ content, onChange }: { content: GenericContent; onChange: (c: GenericContent) => void }) {
  const semesters = (content.semesters as Array<{ title_he: string; title_en?: string; courses: Array<{ name_he: string; name_en?: string }> }>) || [];

  const updateSemester = (index: number, sem: typeof semesters[0]) => {
    const n = [...semesters];
    n[index] = sem;
    onChange({ ...content, semesters: n });
  };

  return (
    <div className="space-y-4">
      <F label="כותרת (עברית)" tip="כותרת סקשן תוכנית הלימודים." max={50} value={(content.heading_he as string) || ""}>
        <Input value={(content.heading_he as string) || ""} onChange={(e) => onChange({ ...content, heading_he: e.target.value })} dir="rtl" placeholder="תוכנית הלימודים" />
      </F>
      {semesters.map((sem, sIndex) => (
        <div key={sIndex} className="p-3 rounded-lg border bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9A969A]">סמסטר / שנה {sIndex + 1}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" title="מחק סמסטר" onClick={() => onChange({ ...content, semesters: semesters.filter((_, i) => i !== sIndex) })}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="flex justify-between">
                <Label className="text-xs" title="כותרת השנה/סמסטר בעברית.">כותרת (עברית)</Label>
                <CharCount value={sem.title_he} max={30} />
              </div>
              <Input value={sem.title_he} onChange={(e) => updateSemester(sIndex, { ...sem, title_he: e.target.value })} placeholder="שנה א'" dir="rtl" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <Label className="text-xs">Title (EN)</Label>
                <CharCount value={sem.title_en || ""} max={30} />
              </div>
              <Input value={sem.title_en || ""} onChange={(e) => updateSemester(sIndex, { ...sem, title_en: e.target.value })} placeholder="Year 1" className="h-8 text-xs" />
            </div>
          </div>
          {sem.courses.map((course, cIndex) => (
            <div key={cIndex} className="flex gap-2 items-center">
              <Input value={course.name_he} onChange={(e) => {
                const courses = [...sem.courses];
                courses[cIndex] = { ...course, name_he: e.target.value };
                updateSemester(sIndex, { ...sem, courses });
              }} placeholder="שם קורס" dir="rtl" className="h-7 text-xs flex-1" title="שם הקורס בתוכנית הלימודים" />
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0" title="מחק קורס" onClick={() => {
                updateSemester(sIndex, { ...sem, courses: sem.courses.filter((_, i) => i !== cIndex) });
              }}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          <Button variant="ghost" size="sm" className="text-xs" title="הוסף קורס לסמסטר זה" onClick={() => {
            updateSemester(sIndex, { ...sem, courses: [...sem.courses, { name_he: "", name_en: "" }] });
          }}>
            <Plus className="w-3 h-3 mr-1" /> הוסף קורס
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" title="הוסף שנה/סמסטר חדשים לתוכנית הלימודים" onClick={() => onChange({ ...content, semesters: [...semesters, { title_he: "", title_en: "", courses: [] }] })} className="w-full">
        <Plus className="w-3.5 h-3.5 mr-1.5" /> הוסף סמסטר/שנה
      </Button>
    </div>
  );
}

// ─── About ───────────────────────────────────────────────────────────────────

function AboutEditorFields({ content, onChange }: { content: GenericContent; onChange: (c: GenericContent) => void }) {
  const bullets = (content.bullets as string[]) || [];

  return (
    <div className="space-y-4">
      <F label="תיאור (עברית)" tip="טקסט תיאור התוכנית. עד 300 תווים מומלץ." max={300} value={(content.description_he as string) || ""}>
        <Textarea value={(content.description_he as string) || ""} onChange={(e) => onChange({ ...content, description_he: e.target.value })} dir="rtl" rows={4} placeholder="תיאור קצר של התוכנית..." />
      </F>

      <F label="תמונה (URL)" tip="תמונה שמוצגת בצד ה-About. מידות: 600×450px לפחות.">
        <Input value={(content.image_url as string) || ""} onChange={(e) => onChange({ ...content, image_url: e.target.value })} placeholder="https://..." />
      </F>

      <F label="סרטון YouTube (אופציונלי)" tip="קישור YouTube. אם מוזן — יוצג במקום התמונה.">
        <Input value={(content.video_url as string) || ""} onChange={(e) => onChange({ ...content, video_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
        {(content.video_url as string) && (
          <button type="button" onClick={() => onChange({ ...content, video_url: "" })} className="mt-1 text-xs text-red-500 hover:text-red-700">
            ✕ הסר סרטון
          </button>
        )}
      </F>

      {/* Bullet points */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">נקודות מפתח ({bullets.length})</Label>
        {bullets.map((bullet, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input
              value={bullet}
              onChange={(e) => {
                const updated = [...bullets];
                updated[i] = e.target.value;
                onChange({ ...content, bullets: updated });
              }}
              dir="rtl"
              placeholder={`נקודה ${i + 1}`}
              className="text-xs h-8"
            />
            <button type="button" onClick={() => onChange({ ...content, bullets: bullets.filter((_, idx) => idx !== i) })} className="text-red-400 hover:text-red-600 shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...content, bullets: [...bullets, ""] })} className="w-full gap-1 text-xs h-7">
          <Plus className="w-3 h-3" /> הוסף נקודה
        </Button>
      </div>
    </div>
  );
}

// ─── Custom HTML ──────────────────────────────────────────────────────────────

function CustomHtmlEditorFields({ content, onChange }: { content: GenericContent; onChange: (c: GenericContent) => void }) {
  return (
    <div className="space-y-4">
      <F label="HTML" tip="קוד HTML מותאם אישית. יוצג בתוך מיכל מבודד. אפשר להשתמש בתגיות <div>, <p>, <a> וכד'.">
        <Textarea
          value={(content.html as string) || ""}
          onChange={(e) => onChange({ ...content, html: e.target.value })}
          placeholder="<div>Your custom HTML...</div>"
          rows={10}
          className="font-mono text-xs"
        />
      </F>
      <F label="CSS מותאם (אופציונלי)" tip="סגנונות CSS שיחולו רק על הבלוק הזה.">
        <Textarea
          value={(content.css as string) || ""}
          onChange={(e) => onChange({ ...content, css: e.target.value })}
          placeholder=".my-class { color: red; }"
          rows={5}
          className="font-mono text-xs"
        />
      </F>
    </div>
  );
}

// ─── Sticky Header ────────────────────────────────────────────────────────────

function StickyHeaderEditorFields({ content, onChange }: { content: GenericContent; onChange: (c: GenericContent) => void }) {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="he">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="he">עברית</TabsTrigger>
          <TabsTrigger value="en">English</TabsTrigger>
          <TabsTrigger value="ar">عربي</TabsTrigger>
        </TabsList>
        <TabsContent value="he" className="space-y-4 mt-4">
          <F label="טקסט" tip="הטקסט שמוצג בכותרת הנצמדת. בדרך כלל שם התוכנית." max={40} value={(content.text_he as string) || ""}>
            <Input value={(content.text_he as string) || ""} onChange={(e) => onChange({ ...content, text_he: e.target.value })} dir="rtl" placeholder="הירשמו עכשיו!" />
          </F>
          <F label="טקסט כפתור" tip="הכפתור שמוצג בצד. עד 20 תווים." max={20} value={(content.button_text_he as string) || ""}>
            <Input value={(content.button_text_he as string) || ""} onChange={(e) => onChange({ ...content, button_text_he: e.target.value })} dir="rtl" placeholder="להרשמה" />
          </F>
        </TabsContent>
        <TabsContent value="en" className="space-y-4 mt-4">
          <F label="Text" max={40} value={(content.text_en as string) || ""}>
            <Input value={(content.text_en as string) || ""} onChange={(e) => onChange({ ...content, text_en: e.target.value })} placeholder="Register now!" />
          </F>
          <F label="Button Text" max={20} value={(content.button_text_en as string) || ""}>
            <Input value={(content.button_text_en as string) || ""} onChange={(e) => onChange({ ...content, button_text_en: e.target.value })} placeholder="Register" />
          </F>
        </TabsContent>
        <TabsContent value="ar" className="space-y-4 mt-4">
          <F label="النص" max={40} value={(content.text_ar as string) || ""}>
            <Input value={(content.text_ar as string) || ""} onChange={(e) => onChange({ ...content, text_ar: e.target.value })} dir="rtl" />
          </F>
          <F label="نص الزر" max={20} value={(content.button_text_ar as string) || ""}>
            <Input value={(content.button_text_ar as string) || ""} onChange={(e) => onChange({ ...content, button_text_ar: e.target.value })} dir="rtl" />
          </F>
        </TabsContent>
      </Tabs>
      <F label="כתובת URL לכפתור" tip="'#form' לגלילה לטופס. URL חיצוני לדף אחר.">
        <Input value={(content.button_url as string) || ""} onChange={(e) => onChange({ ...content, button_url: e.target.value })} placeholder="#form" />
      </F>
      <F label="צבע רקע" tip="צבע הכותרת הנצמדת. ברירת מחדל: צהוב-ירוק אונו.">
        <Input value={(content.bg_color as string) || ""} onChange={(e) => onChange({ ...content, bg_color: e.target.value })} placeholder="#B8D900" />
      </F>
      <div className="flex items-center gap-2">
        <Switch
          checked={(content.show_phone as boolean) || false}
          onCheckedChange={(checked) => onChange({ ...content, show_phone: checked })}
        />
        <Label title="מציג מספר טלפון לחיץ בכותרת. מומלץ למובייל.">הצג מספר טלפון</Label>
      </div>
      {Boolean(content.show_phone) && (
        <F label="מספר טלפון" tip="מספר שיוצג ויהיה ניתן ללחיצה. לדוגמה: *6930 או 03-1234567.">
          <Input value={(content.phone as string) || ""} onChange={(e) => onChange({ ...content, phone: e.target.value })} placeholder="*6930" />
        </F>
      )}
    </div>
  );
}

// ─── Title & CTA Panel ──────────────────────────────────────────────────────

/** Section types that should not show the universal title & CTA panel */
const NO_TITLE_SECTIONS = new Set(["whatsapp", "program_info_bar", "sticky_header"]);

/** CTA icon options for the dropdown selector */
const CTA_ICON_OPTIONS = [
  { value: "none", label: "ללא אייקון" },
  { value: "arrow", label: "חץ ←" },
  { value: "phone", label: "טלפון ☎" },
  { value: "whatsapp", label: "וואטסאפ 💬" },
  { value: "lock", label: "מנעול 🔒" },
  { value: "checkmark", label: "וי ✓" },
  { value: "chat", label: "צ׳אט 💭" },
] as const;

/** Maximum character limits for title and CTA fields */
const MAX_HEADING_CHARS = 80;
const MAX_CTA_TEXT_CHARS = 40;

/** Universal Title & CTA panel — shown at top of every section editor */
function TitleCtaPanel({ content, onChange }: { content: GenericContent; onChange: (c: GenericContent) => void }) {
  const ctaEnabled = content.cta_enabled !== false;

  return (
    <div className="space-y-4 pb-4 mb-4 border-b border-border">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1.5 h-4 bg-[#B8D900] rounded-full" />
        <span className="text-xs font-bold text-[#2A2628]">כותרת וקריאה לפעולה</span>
      </div>

      {/* Section title — Hebrew */}
      <F label="כותרת הסקשן (עברית)" tip="הכותרת הראשית שמוצגת בראש הסקשן" max={MAX_HEADING_CHARS} value={(content.heading_he as string) || ""}>
        <Input
          value={(content.heading_he as string) || ""}
          onChange={(e) => onChange({ ...content, heading_he: e.target.value })}
          placeholder="הכנס כותרת..."
          dir="rtl"
        />
        <p className="text-[10px] text-[#B8D900]/80 mt-0.5 font-mono" dir="ltr">
          {"ⓘ תומך בטקסט דינמי: {{utm_source}} {{utm_campaign|ברירת מחדל}}"}
        </p>
      </F>

      {/* Section title — English */}
      <F label="כותרת הסקשן (אנגלית)" tip="Section title for English pages" max={MAX_HEADING_CHARS} value={(content.heading_en as string) || ""}>
        <Input
          value={(content.heading_en as string) || ""}
          onChange={(e) => onChange({ ...content, heading_en: e.target.value })}
          placeholder="Enter section title..."
          dir="ltr"
        />
      </F>

      {/* CTA enabled toggle */}
      <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-muted/30">
        <div>
          <Label className="text-xs font-semibold">הצג כפתור קריאה לפעולה</Label>
          <p className="text-[10px] text-[#9A969A] mt-0.5">כבה כדי להסתיר את הכפתור מהסקשן</p>
        </div>
        <Switch
          checked={ctaEnabled}
          onCheckedChange={(checked) => onChange({ ...content, cta_enabled: checked })}
        />
      </div>

      {/* CTA fields — only visible when enabled */}
      {ctaEnabled && (
        <div className="space-y-3 pr-3 border-r-2 border-[#B8D900]/30">
          <F label="טקסט כפתור (עברית)" tip="הטקסט שיופיע על כפתור הקריאה לפעולה" max={MAX_CTA_TEXT_CHARS} value={(content.cta_text_he as string) || ""}>
            <Input
              value={(content.cta_text_he as string) || ""}
              onChange={(e) => onChange({ ...content, cta_text_he: e.target.value })}
              placeholder="השאירו פרטים"
              dir="rtl"
            />
          </F>

          <F label="טקסט כפתור (אנגלית)" tip="CTA button text for English pages" max={MAX_CTA_TEXT_CHARS} value={(content.cta_text_en as string) || ""}>
            <Input
              value={(content.cta_text_en as string) || ""}
              onChange={(e) => onChange({ ...content, cta_text_en: e.target.value })}
              placeholder="Get Info"
              dir="ltr"
            />
          </F>

          {/* CTA icon picker */}
          <F label="אייקון כפתור" tip="בחר אייקון שיופיע ליד טקסט הכפתור">
            <select
              value={(content.cta_icon as string) || "none"}
              onChange={(e) => onChange({ ...content, cta_icon: e.target.value })}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              dir="rtl"
            >
              {CTA_ICON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </F>
        </div>
      )}
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Resolves the section-specific editor fields for a given section type.
 * @param sectionType - the type key (e.g. "video", "stats")
 * @param content - current section content object
 * @param onChange - callback to update section content
 * @returns JSX element with the section-specific fields, or a fallback message
 */
function SectionFields({ sectionType, content, onChange }: GenericEditorProps) {
  switch (sectionType) {
    case "video":
      return <VideoEditorFields content={content} onChange={onChange} />;
    case "about":
      return <AboutEditorFields content={content} onChange={onChange} />;
    case "stats":
      return <StatsEditorFields content={content} onChange={onChange} />;
    case "testimonials":
      return <TestimonialsEditorFields content={content} onChange={onChange} />;
    case "cta":
      return <CtaEditorFields content={content} onChange={onChange} />;
    case "whatsapp":
      return <WhatsappEditorFields content={content} onChange={onChange} />;
    case "accordion":
      return <AccordionEditorFields content={content} onChange={onChange} />;
    case "gallery":
      return <GalleryEditorFields content={content} onChange={onChange} />;
    case "curriculum":
      return <CurriculumEditorFields content={content} onChange={onChange} />;
    case "custom_html":
      return <CustomHtmlEditorFields content={content} onChange={onChange} />;
    case "sticky_header":
      return <StickyHeaderEditorFields content={content} onChange={onChange} />;
    default:
      return (
        <div className="p-4 text-center text-sm text-muted-foreground">
          אין עורך זמין לסוג סקשן זה: {sectionType}
        </div>
      );
  }
}

/**
 * GenericEditor — renders the universal Title & CTA panel (when applicable)
 * followed by the section-specific editor fields.
 */
export function GenericEditor({ sectionType, content, onChange }: GenericEditorProps) {
  const showTitleCta = !NO_TITLE_SECTIONS.has(sectionType);

  return (
    <div className="space-y-6">
      {showTitleCta && <TitleCtaPanel content={content} onChange={onChange} />}
      <SectionFields sectionType={sectionType} content={content} onChange={onChange} />
    </div>
  );
}
