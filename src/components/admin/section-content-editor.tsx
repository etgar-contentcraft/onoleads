/**
 * SectionContentEditor — visual form editor for a landing page section's content.
 * Mirrors the builder's SectionEditModal exactly: same field components, same
 * section types, same visual style. Used by the shared-sections dashboard.
 */
"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, X, ImageIcon, Loader2, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { extractYoutubeId } from "@/lib/utils/youtube";

export interface SectionContentEditorProps {
  sectionType: string;
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
}

// ---------------------------------------------------------------------------
// Field helpers — identical API/style to the builder
// ---------------------------------------------------------------------------

type SetFn = (key: string, value: unknown) => void;

function Field({
  label,
  fieldKey,
  placeholder = "",
  dir = "rtl",
  draft,
  set,
}: {
  label: string;
  fieldKey: string;
  placeholder?: string;
  dir?: "rtl" | "ltr";
  draft: Record<string, unknown>;
  set: SetFn;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-[#716C70]">{label}</Label>
      <Input
        value={(draft[fieldKey] as string) ?? ""}
        onChange={(e) => set(fieldKey, e.target.value)}
        placeholder={placeholder}
        dir={dir}
        className="h-9 text-sm"
      />
    </div>
  );
}

function TextareaField({
  label,
  fieldKey,
  placeholder = "",
  rows = 3,
  draft,
  set,
}: {
  label: string;
  fieldKey: string;
  placeholder?: string;
  rows?: number;
  draft: Record<string, unknown>;
  set: SetFn;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-[#716C70]">{label}</Label>
      <Textarea
        value={(draft[fieldKey] as string) ?? ""}
        onChange={(e) => set(fieldKey, e.target.value)}
        placeholder={placeholder}
        dir="rtl"
        rows={rows}
        className="text-sm resize-none"
      />
    </div>
  );
}

/** Maximum upload size in bytes (10MB) */
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

function ImageField({
  label,
  fieldKey,
  recommendedSize,
  draft,
  set,
}: {
  label: string;
  fieldKey: string;
  recommendedSize?: string;
  draft: Record<string, unknown>;
  set: SetFn;
}) {
  const url = (draft[fieldKey] as string) || "";
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    if (file.size > MAX_UPLOAD_SIZE) {
      setUploadError("הקובץ גדול מדי — מקסימום 10MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `sections/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const supabase = createClient();
      const { error } = await supabase.storage.from("media").upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) {
        if (error.message.includes("not found") || error.message.includes("Bucket")) {
          setUploadError("שגיאה: מאגר קבצים לא קיים. יש להריץ את המיגרציה 20260402_storage_bucket.sql");
        } else {
          setUploadError(`שגיאה: ${error.message}`);
        }
        setUploading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
      set(fieldKey, urlData.publicUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "שגיאה לא ידועה";
      setUploadError(`שגיאה בהעלאה: ${msg}`);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-[#716C70]">{label}</Label>
        {recommendedSize && (
          <span className="text-[10px] text-[#9A969A] bg-[#F3F4F6] rounded px-1.5 py-0.5">{recommendedSize}</span>
        )}
      </div>
      <Input
        value={url}
        onChange={(e) => set(fieldKey, e.target.value)}
        placeholder="https://... או העלה תמונה"
        dir="ltr"
        className="h-9 text-sm font-mono"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => { setUploadError(""); inputRef.current?.click(); }}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[#C8C4C8] bg-[#F8F8F8] text-xs text-[#716C70] hover:border-[#B8D900] hover:text-[#2A2628] hover:bg-[#B8D900]/5 transition-all disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
          {uploading ? "מעלה..." : "העלה תמונה"}
        </button>
        {url && (
          <button type="button" onClick={() => set(fieldKey, "")} className="text-[10px] text-[#9A969A] hover:text-red-500 transition-colors">
            הסר
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
      </div>
      {uploadError && (
        <p className="text-[11px] text-red-500 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 shrink-0" /> {uploadError}
        </p>
      )}
      {url && (
        <div className="rounded-lg overflow-hidden border border-[#E5E5E5] h-28 bg-[#F3F4F6]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="preview" className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  );
}

function StringListField({
  label,
  fieldKey,
  placeholder = "",
  draft,
  set,
}: {
  label: string;
  fieldKey: string;
  placeholder?: string;
  draft: Record<string, unknown>;
  set: SetFn;
}) {
  const list = (draft[fieldKey] as string[]) || [];
  const addItem = () => set(fieldKey, [...list, ""]);
  const updateItem = (i: number, v: string) => {
    const copy = [...list];
    copy[i] = v;
    set(fieldKey, copy);
  };
  const removeItem = (i: number) => set(fieldKey, list.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-[#716C70]">{label}</Label>
        <Button type="button" variant="ghost" size="sm" onClick={addItem} className="h-7 gap-1 text-xs text-[#B8D900] hover:text-[#9AB800]">
          <Plus className="w-3 h-3" /> הוסף
        </Button>
      </div>
      <div className="space-y-1.5">
        {list.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input value={item} onChange={(e) => updateItem(i, e.target.value)} placeholder={placeholder} dir="rtl" className="h-8 text-sm flex-1" />
            <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(i)} className="h-8 w-8 p-0 text-red-400 hover:text-red-600 shrink-0">
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ObjField {
  key: string;
  label: string;
  type?: "textarea" | "image";
}

function ObjectListField({
  label,
  fieldKey,
  fields,
  draft,
  set,
}: {
  label: string;
  fieldKey: string;
  fields: ObjField[];
  draft: Record<string, unknown>;
  set: SetFn;
}) {
  const list = (draft[fieldKey] as Record<string, string>[]) || [];
  const emptyItem = Object.fromEntries(fields.map((f) => [f.key, ""]));
  const addItem = () => set(fieldKey, [...list, { ...emptyItem }]);
  const updateField = (i: number, k: string, v: string) => {
    const copy = list.map((item) => ({ ...item }));
    copy[i][k] = v;
    set(fieldKey, copy);
  };
  const removeItem = (i: number) => set(fieldKey, list.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-[#716C70]">{label}</Label>
        <Button type="button" variant="ghost" size="sm" onClick={addItem} className="h-7 gap-1 text-xs text-[#B8D900] hover:text-[#9AB800]">
          <Plus className="w-3 h-3" /> הוסף
        </Button>
      </div>
      <div className="space-y-3">
        {list.map((item, i) => (
          <div key={i} className="border border-[#E5E5E5] rounded-xl p-3 space-y-2 bg-[#FAFAFA]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-[#9A969A]">פריט {i + 1}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(i)} className="h-7 w-7 p-0 text-red-400 hover:text-red-600">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
            {fields.map((f) =>
              f.type === "textarea" ? (
                <div key={f.key} className="space-y-1">
                  <Label className="text-[11px] text-[#9A969A]">{f.label}</Label>
                  <Textarea value={item[f.key] || ""} onChange={(e) => updateField(i, f.key, e.target.value)} rows={2} dir="rtl" className="text-sm resize-none" />
                </div>
              ) : f.type === "image" ? (
                <div key={f.key} className="space-y-1">
                  <Label className="text-[11px] text-[#9A969A]">{f.label}</Label>
                  <Input value={item[f.key] || ""} onChange={(e) => updateField(i, f.key, e.target.value)} placeholder="https://..." dir="ltr" className="h-8 text-sm font-mono" />
                  {item[f.key] && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={item[f.key]} alt="" className="w-12 h-12 rounded-lg object-cover border border-[#E5E5E5]" />
                  )}
                </div>
              ) : (
                <div key={f.key} className="space-y-1">
                  <Label className="text-[11px] text-[#9A969A]">{f.label}</Label>
                  <Input value={item[f.key] || ""} onChange={(e) => updateField(i, f.key, e.target.value)} dir="rtl" className="h-8 text-sm" />
                </div>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


function VideoListField({ draft, set }: { draft: Record<string, unknown>; set: SetFn }) {
  const videos = (draft.videos as Array<Record<string, string>>) || [];
  const addVideo = () => set("videos", [...videos, { youtube_id: "", title_he: "", duration_he: "" }]);
  const updateVideo = (i: number, key: string, value: string) => {
    const copy = videos.map((v, idx) => (idx === i ? { ...v, [key]: value } : v));
    set("videos", copy);
  };
  const removeVideo = (i: number) => set("videos", videos.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-[#716C70]">סרטונים</Label>
        <Button type="button" variant="ghost" size="sm" onClick={addVideo} className="h-7 gap-1 text-xs text-[#B8D900] hover:text-[#9AB800]">
          <Plus className="w-3 h-3" /> הוסף סרטון
        </Button>
      </div>
      {videos.length === 0 && (
        <p className="text-[11px] text-[#9A969A] bg-[#F9F9F9] rounded-lg p-3 border border-dashed border-[#E0E0E0]">
          לא נוספו סרטונים. לחצו &quot;הוסף סרטון&quot; ולהדביק קישור YouTube.
        </p>
      )}
      <div className="space-y-3">
        {videos.map((video, i) => {
          const ytId = extractYoutubeId(video.youtube_id || "");
          const thumbUrl = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : "";
          return (
            <div key={i} className="border border-[#E5E5E5] rounded-xl p-3 space-y-2 bg-[#FAFAFA]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#9A969A]">סרטון {i + 1}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeVideo(i)} className="h-6 w-6 p-0 text-red-400 hover:text-red-600">
                  <X className="w-3 h-3" />
                </Button>
              </div>
              {thumbUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={thumbUrl} alt="" className="w-full h-20 object-cover rounded-lg" />
              )}
              <div className="space-y-1">
                <Label className="text-[11px] text-[#9A969A]">קישור YouTube</Label>
                <Input value={video.youtube_id || ""} onChange={(e) => updateVideo(i, "youtube_id", e.target.value)} placeholder="https://www.youtube.com/watch?v=..." dir="ltr" className="h-8 text-xs font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-[#9A969A]">כותרת הסרטון</Label>
                <Input value={video.title_he || ""} onChange={(e) => updateVideo(i, "title_he", e.target.value)} placeholder="שם הסרטון..." dir="rtl" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-[#9A969A]">משך (אופציונלי, למשל 3:45)</Label>
                <Input value={video.duration_he || ""} onChange={(e) => updateVideo(i, "duration_he", e.target.value)} placeholder="3:45" dir="ltr" className="h-8 text-xs w-24" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SectionContentEditor({ sectionType, content, onChange }: SectionContentEditorProps) {
  const [showJson, setShowJson] = useState(false);

  const draft = content;
  const set: SetFn = (key, value) => onChange({ ...content, [key]: value });

  const renderFields = () => {
    switch (sectionType) {
      case "hero":
        return (
          <div className="space-y-4">
            <Field label="כותרת ראשית" fieldKey="heading_he" placeholder="כותרת ראשית..." draft={draft} set={set} />
            <TextareaField label="כותרת משנה" fieldKey="subheading_he" placeholder="פרטים נוספים..." draft={draft} set={set} />
            <Field label="טקסט כפתור" fieldKey="cta_text_he" placeholder="השאירו פרטים" draft={draft} set={set} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="ערך נתון (50,000+)" fieldKey="stat_value" placeholder="50,000+" dir="ltr" draft={draft} set={set} />
              <Field label="תווית נתון" fieldKey="stat_label_he" placeholder="בוגרים" draft={draft} set={set} />
            </div>
            <ImageField label="תמונת רקע" fieldKey="background_image_url" recommendedSize="1920×1080px" draft={draft} set={set} />
          </div>
        );

      case "program_info_bar":
        return (
          <div className="space-y-4">
            <Field label="משך התוכנית" fieldKey="duration" placeholder="3 שנים" draft={draft} set={set} />
            <Field label="קמפוס" fieldKey="campus" placeholder="קריית אונו, תל אביב..." draft={draft} set={set} />
            <Field label="מסגרת לימודים" fieldKey="format" placeholder="יום / ערב / שבת" draft={draft} set={set} />
            <Field label="תואר" fieldKey="degree" placeholder="B.A., M.A., LL.B..." draft={draft} set={set} />
          </div>
        );

      case "about":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="אודות התוכנית" draft={draft} set={set} />
            <TextareaField label="תיאור" fieldKey="description_he" rows={4} placeholder="פסקת תיאור..." draft={draft} set={set} />
            <ImageField label="תמונה" fieldKey="image_url" recommendedSize="800×600px" draft={draft} set={set} />
            <StringListField label="נקודות מפתח" fieldKey="bullets" placeholder="נקודה מפתח..." draft={draft} set={set} />
          </div>
        );

      case "benefits":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="למה ללמוד אצלנו" draft={draft} set={set} />
            <ObjectListField
              label="יתרונות"
              fieldKey="items"
              fields={[
                { key: "title_he", label: "כותרת יתרון" },
                { key: "description_he", label: "תיאור", type: "textarea" },
              ]}
              draft={draft}
              set={set}
            />
          </div>
        );

      case "curriculum":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="תוכנית הלימודים" draft={draft} set={set} />
            <ObjectListField
              label="שנים / סמסטרים"
              fieldKey="years"
              fields={[
                { key: "title_he", label: "כותרת שנה / סמסטר" },
                { key: "courses", label: "קורסים (מופרדים בפסיק)", type: "textarea" },
              ]}
              draft={draft}
              set={set}
            />
          </div>
        );

      case "career":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="אפשרויות קריירה" draft={draft} set={set} />
            <StringListField label="תפקידים ומשרות" fieldKey="items" placeholder="יועץ משפטי..." draft={draft} set={set} />
          </div>
        );

      case "testimonials":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="מה אומרים הסטודנטים" draft={draft} set={set} />
            <ObjectListField
              label="המלצות"
              fieldKey="items"
              fields={[
                { key: "name", label: "שם" },
                { key: "role", label: "תפקיד / שנה" },
                { key: "quote", label: "ציטוט", type: "textarea" },
                { key: "image_url", label: "תמונה (URL)", type: "image" },
              ]}
              draft={draft}
              set={set}
            />
          </div>
        );

      case "faculty":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="הסגל האקדמי" draft={draft} set={set} />
            <ObjectListField
              label="חברי סגל"
              fieldKey="members"
              fields={[
                { key: "name_he", label: "שם" },
                { key: "title_he", label: "תפקיד / תואר" },
                { key: "bio_he", label: "תיאור קצר", type: "textarea" },
                { key: "image_url", label: "תמונה (URL)", type: "image" },
              ]}
              draft={draft}
              set={set}
            />
          </div>
        );

      case "stats":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="אנו במספרים" draft={draft} set={set} />
            <ObjectListField
              label="נתונים"
              fieldKey="stats"
              fields={[
                { key: "value", label: "ערך (למשל 50,000+)" },
                { key: "label_he", label: "תווית" },
              ]}
              draft={draft}
              set={set}
            />
          </div>
        );

      case "faq":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="שאלות נפוצות" draft={draft} set={set} />
            <ObjectListField
              label="שאלות ותשובות"
              fieldKey="items"
              fields={[
                { key: "question_he", label: "שאלה" },
                { key: "answer_he", label: "תשובה", type: "textarea" },
              ]}
              draft={draft}
              set={set}
            />
          </div>
        );

      case "video":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="צפו בסרטון" draft={draft} set={set} />
            <TextareaField label="תיאור (אופציונלי)" fieldKey="description_he" rows={2} placeholder="תיאור קצר..." draft={draft} set={set} />
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#716C70]">פריסה</Label>
              <div className="flex gap-2">
                {(["featured", "grid"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => set("layout", v)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${(draft.layout || "featured") === v ? "bg-[#B8D900]/10 border-[#B8D900] text-[#2A2628]" : "border-[#E5E5E5] text-[#9A969A] hover:border-[#B8D900]/50"}`}
                  >
                    {v === "featured" ? "נגן ראשי + רשימה" : "גריד שווה"}
                  </button>
                ))}
              </div>
            </div>
            <VideoListField draft={draft} set={set} />
          </div>
        );

      case "gallery":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="גלריה" draft={draft} set={set} />
            <ObjectListField
              label="תמונות"
              fieldKey="images"
              fields={[
                { key: "url", label: "URL תמונה", type: "image" },
                { key: "caption_he", label: "כיתוב" },
              ]}
              draft={draft}
              set={set}
            />
          </div>
        );

      case "admission": {
        const hasTracks = Array.isArray(draft.tracks) && (draft.tracks as unknown[]).length > 0;
        const tracks = (draft.tracks as Array<Record<string, unknown>>) || [];
        const updateTrack = (ti: number, key: string, value: unknown) => {
          const updated = tracks.map((t, idx) => (idx === ti ? { ...t, [key]: value } : t));
          set("tracks", updated);
        };
        const updateTrackReqs = (ti: number, reqs: string[]) => updateTrack(ti, "requirements", reqs);
        const addTrack = () => set("tracks", [...tracks, { title_he: "מסלול חדש", requirements: [] }]);
        const removeTrack = (ti: number) => set("tracks", tracks.filter((_, idx) => idx !== ti));

        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="תנאי קבלה" draft={draft} set={set} />
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#F3F4F6] border border-[#E5E5E5]">
              <button type="button" onClick={() => set("tracks", undefined)} className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${!hasTracks ? "bg-white shadow text-[#2A2628]" : "text-[#9A969A] hover:text-[#4A4648]"}`}>
                מסלול אחד
              </button>
              <button type="button" onClick={() => { if (!hasTracks) set("tracks", [{ title_he: "קבלה ישירה", requirements: [] }]); }} className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${hasTracks ? "bg-white shadow text-[#2A2628]" : "text-[#9A969A] hover:text-[#4A4648]"}`}>
                מספר מסלולים
              </button>
            </div>
            {hasTracks ? (
              <div className="space-y-3">
                {tracks.map((track, ti) => (
                  <div key={ti} className="border border-[#E5E5E5] rounded-xl p-3 space-y-2 bg-[#FAFAFA]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#9A969A]">מסלול {ti + 1}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeTrack(ti)} className="h-6 w-6 p-0 text-red-400 hover:text-red-600"><X className="w-3 h-3" /></Button>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-[#9A969A]">שם המסלול</Label>
                      <Input value={(track.title_he as string) || ""} onChange={(e) => updateTrack(ti, "title_he", e.target.value)} dir="rtl" className="h-8 text-sm" placeholder="קבלה ישירה..." />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] text-[#9A969A]">דרישות המסלול</Label>
                        <Button type="button" variant="ghost" size="sm" onClick={() => updateTrackReqs(ti, [...((track.requirements as string[]) || []), ""])} className="h-5 gap-1 text-[10px] text-[#B8D900] hover:text-[#9AB800] px-1">
                          <Plus className="w-2.5 h-2.5" /> הוסף דרישה
                        </Button>
                      </div>
                      <div className="space-y-1.5">
                        {((track.requirements as string[]) || []).map((req, ri) => (
                          <div key={ri} className="flex items-center gap-1.5">
                            <Input value={req} onChange={(e) => { const reqs = [...((track.requirements as string[]) || [])]; reqs[ri] = e.target.value; updateTrackReqs(ti, reqs); }} dir="rtl" className="h-7 text-sm flex-1" placeholder="תעודת בגרות..." />
                            <Button type="button" variant="ghost" size="sm" onClick={() => updateTrackReqs(ti, ((track.requirements as string[]) || []).filter((_, idx) => idx !== ri))} className="h-7 w-7 p-0 text-red-400 hover:text-red-600 shrink-0"><X className="w-3 h-3" /></Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addTrack} className="w-full h-8 gap-1.5 text-xs border-dashed">
                  <Plus className="w-3 h-3" /> הוסף מסלול
                </Button>
              </div>
            ) : (
              <StringListField label="דרישות קבלה" fieldKey="requirements" placeholder="תעודת בגרות..." draft={draft} set={set} />
            )}
          </div>
        );
      }

      case "countdown": {
        const cdMode = (draft.mode as string) || "evergreen";
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="הרשמה מוקדמת מסתיימת בקרוב" draft={draft} set={set} />
            <Field label="כותרת משנה" fieldKey="subheading_he" placeholder="אל תפספסו את ההזדמנות" draft={draft} set={set} />
            <Field label="תגית (badge)" fieldKey="badge_he" placeholder="⏰ הצעה מוגבלת בזמן" draft={draft} set={set} />
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#716C70]">סוג טיימר</Label>
              <div className="flex gap-2">
                {(["evergreen", "fixed"] as const).map((v) => (
                  <button key={v} type="button" onClick={() => set("mode", v)} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${cdMode === v ? "bg-[#B8D900]/10 border-[#B8D900] text-[#2A2628]" : "border-[#E5E5E5] text-[#9A969A]"}`}>
                    {v === "evergreen" ? "Evergreen (מתאפס לכל מבקר)" : "תאריך קבוע"}
                  </button>
                ))}
              </div>
            </div>
            {cdMode === "evergreen" ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#716C70]">מספר ימים לפני איפוס</Label>
                <Input value={(draft.interval_days as string) || "7"} onChange={(e) => set("interval_days", e.target.value)} dir="ltr" className="h-9 text-sm w-24" type="number" min="1" max="365" />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#716C70]">תאריך ושעת סיום</Label>
                <Input value={(draft.target_date as string) || ""} onChange={(e) => set("target_date", e.target.value)} dir="ltr" className="h-9 text-sm" type="datetime-local" />
              </div>
            )}
            <Field label="הודעה בעת פקיעה" fieldKey="expired_text_he" placeholder="ההרשמה הסתיימה..." draft={draft} set={set} />
          </div>
        );
      }

      case "map":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="מיקום האירוע" draft={draft} set={set} />
            <Field label="כתובת" fieldKey="address" placeholder="רחוב האוניברסיטה 1, קריית אונו" draft={draft} set={set} />
            <Field label="קישור Google Maps" fieldKey="map_url" placeholder="https://maps.google.com/..." dir="ltr" draft={draft} set={set} />
          </div>
        );

      case "cta":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="מוכנים להתחיל?" draft={draft} set={set} />
            <TextareaField label="תיאור" fieldKey="description_he" rows={2} placeholder="הצטרפו לאלפי סטודנטים..." draft={draft} set={set} />
            <Field label="טקסט כפתור" fieldKey="button_text_he" placeholder="להרשמה" draft={draft} set={set} />
            <Field label="מספר טלפון" fieldKey="phone" placeholder="03-123-4567" dir="ltr" draft={draft} set={set} />
          </div>
        );

      case "whatsapp":
        return (
          <div className="space-y-4">
            <Field label="מספר וואטסאפ" fieldKey="phone" placeholder="972501234567" dir="ltr" draft={draft} set={set} />
            <Field label="הודעה ראשונית" fieldKey="message_he" placeholder="היי, אשמח לקבל פרטים" draft={draft} set={set} />
          </div>
        );

      case "event":
        return (
          <div className="space-y-4">
            <Field label="כותרת האירוע" fieldKey="heading_he" placeholder="יום פתוח" draft={draft} set={set} />
            <TextareaField label="תיאור" fieldKey="description_he" placeholder="פרטים על האירוע..." draft={draft} set={set} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="תאריך (ISO)" fieldKey="event_date" placeholder="2026-04-15T17:00:00" dir="ltr" draft={draft} set={set} />
              <Field label="שעה לתצוגה" fieldKey="event_time" placeholder="17:00" dir="ltr" draft={draft} set={set} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#716C70]">סוג אירוע</Label>
              <div className="flex gap-2">
                {(["event_physical", "event_zoom"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => set("event_type", t)} className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all ${(draft.event_type || "event_physical") === t ? "bg-[#B8D900]/20 border-[#B8D900] text-[#2A2628]" : "border-[#E5E5E5] text-[#9A969A] hover:border-[#B8D900]/50"}`}>
                    {t === "event_physical" ? "פיזי - קמפוס" : "זום - אונליין"}
                  </button>
                ))}
              </div>
            </div>
            <Field label="כתובת מקום" fieldKey="venue" placeholder="רחוב האוניברסיטה 2, קריית אונו" draft={draft} set={set} />
            <Field label="קישור Google Maps" fieldKey="google_maps_url" placeholder="https://maps.google.com/..." dir="ltr" draft={draft} set={set} />
            <Field label="קישור Zoom" fieldKey="zoom_link" placeholder="https://zoom.us/j/..." dir="ltr" draft={draft} set={set} />
            <Field label="מידע חניה" fieldKey="parking_info" placeholder="חניה חינם בחניון הקמפוס" draft={draft} set={set} />
            <StringListField label="תוכניות מוצגות" fieldKey="programs_featured" placeholder="משפטים, מנהל עסקים..." draft={draft} set={set} />
            <ObjectListField
              label="לוח זמנים"
              fieldKey="schedule"
              fields={[
                { key: "time", label: "שעה (למשל 17:00)" },
                { key: "title", label: "שם הסשן" },
              ]}
              draft={draft}
              set={set}
            />
          </div>
        );

      default:
        return (
          <>
            {Object.entries(content).map(([key, val]) =>
              typeof val === "string" ? (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs font-medium text-[#716C70]">{key}</Label>
                  <Input value={val} onChange={(e) => set(key, e.target.value)} dir="rtl" className="h-9 text-sm" />
                </div>
              ) : null
            )}
            {Object.keys(content).length === 0 && (
              <p className="text-xs text-[#9A969A] text-center py-4">אין שדות. השתמשו ב-JSON למטה.</p>
            )}
          </>
        );
    }
  };

  return (
    <div dir="rtl" className="space-y-4">
      {renderFields()}

      {/* Full JSON editor — advanced fallback */}
      <div className="pt-2 border-t border-[#F0F0F0]">
        <button
          type="button"
          onClick={() => setShowJson(!showJson)}
          className="text-xs text-[#9A969A] hover:text-[#4A4648] transition-colors"
        >
          {showJson ? "הסתר JSON" : "⚙ ערוך JSON מלא (מתקדם)"}
        </button>
        {showJson && (
          <textarea
            value={JSON.stringify(content, null, 2)}
            onChange={(e) => {
              try { onChange(JSON.parse(e.target.value)); } catch {/* ignore */}
            }}
            rows={14}
            dir="ltr"
            spellCheck={false}
            className="mt-2 w-full font-mono text-xs p-3 rounded-lg border border-input bg-[#FAFAFA] resize-y focus:outline-none focus:ring-1 focus:ring-[#B8D900]"
          />
        )}
      </div>
    </div>
  );
}
