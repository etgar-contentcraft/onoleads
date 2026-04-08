"use client";

/**
 * FaqEditor — editing panel for the FAQ section.
 * Shows live character counters and tooltips per field.
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";
import { CharCount } from "../char-count";

const LIMITS = { heading: 50, question: 80, answer: 350, cta_text: 60 };

interface FaqItem {
  question_he: string;
  question_en?: string;
  question_ar?: string;
  answer_he: string;
  answer_en?: string;
  answer_ar?: string;
}

interface FaqContent {
  heading_he?: string;
  heading_en?: string;
  heading_ar?: string;
  items?: FaqItem[];
  /** When false, the "Have more questions?" CTA button is hidden. Default true. */
  cta_enabled?: boolean;
  cta_text_he?: string;
  cta_text_en?: string;
  cta_text_ar?: string;
}

interface FaqEditorProps {
  content: FaqContent;
  onChange: (content: FaqContent) => void;
}

export function FaqEditor({ content, onChange }: FaqEditorProps) {
  const items = content.items || [];

  const update = (key: keyof FaqContent, value: unknown) => {
    onChange({ ...content, [key]: value });
  };

  const updateItem = (index: number, item: FaqItem) => {
    const newItems = [...items];
    newItems[index] = item;
    update("items", newItems);
  };

  const addItem = () => {
    update("items", [...items, { question_he: "", question_en: "", answer_he: "", answer_en: "" }]);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="he" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="he">עברית</TabsTrigger>
          <TabsTrigger value="en">English</TabsTrigger>
          <TabsTrigger value="ar">عربي</TabsTrigger>
        </TabsList>

        {/* Hebrew */}
        <TabsContent value="he" className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label title="כותרת הסקשן שמוצגת מעל השאלות." className="text-xs font-semibold cursor-help">
                כותרת <span className="text-[#9A969A] text-[10px]">ℹ</span>
              </Label>
              <CharCount value={content.heading_he || ""} max={LIMITS.heading} />
            </div>
            <Input value={content.heading_he || ""} onChange={(e) => update("heading_he", e.target.value)} placeholder="שאלות נפוצות" dir="rtl" />
          </div>

          {items.map((item, index) => (
            <div key={index} className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#9A969A]">שאלה {index + 1}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" title="מחק שאלה" onClick={() => update("items", items.filter((_, i) => i !== index))}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <Label className="text-xs" title="השאלה שהמבקר שואל. ניסוח כשאלה ישירה ממיר יותר.">שאלה</Label>
                  <CharCount value={item.question_he} max={LIMITS.question} />
                </div>
                <Input value={item.question_he} onChange={(e) => updateItem(index, { ...item, question_he: e.target.value })} placeholder="מה משך הלימודים?" dir="rtl" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <Label className="text-xs" title="תשובה מפורטת. כדאי לכלול עובדות ומספרים. עד 350 תווים.">תשובה</Label>
                  <CharCount value={item.answer_he} max={LIMITS.answer} />
                </div>
                <Textarea value={item.answer_he} onChange={(e) => updateItem(index, { ...item, answer_he: e.target.value })} placeholder="תשובה..." dir="rtl" rows={3} className="text-sm" />
              </div>
            </div>
          ))}
        </TabsContent>

        {/* English */}
        <TabsContent value="en" className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Heading</Label>
              <CharCount value={content.heading_en || ""} max={LIMITS.heading} />
            </div>
            <Input value={content.heading_en || ""} onChange={(e) => update("heading_en", e.target.value)} placeholder="Frequently Asked Questions" />
          </div>

          {items.map((item, index) => (
            <div key={index} className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
              <span className="text-xs font-semibold text-[#9A969A]">Question {index + 1}</span>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <Label className="text-xs">Question</Label>
                  <CharCount value={item.question_en || ""} max={LIMITS.question} />
                </div>
                <Input value={item.question_en || ""} onChange={(e) => updateItem(index, { ...item, question_en: e.target.value })} placeholder="What is the program duration?" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <Label className="text-xs">Answer</Label>
                  <CharCount value={item.answer_en || ""} max={LIMITS.answer} />
                </div>
                <Textarea value={item.answer_en || ""} onChange={(e) => updateItem(index, { ...item, answer_en: e.target.value })} placeholder="Answer..." rows={3} className="text-sm" />
              </div>
            </div>
          ))}
        </TabsContent>

        {/* Arabic */}
        <TabsContent value="ar" className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">العنوان</Label>
              <CharCount value={content.heading_ar || ""} max={LIMITS.heading} />
            </div>
            <Input value={content.heading_ar || ""} onChange={(e) => update("heading_ar", e.target.value)} dir="rtl" />
          </div>

          {items.map((item, index) => (
            <div key={index} className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
              <span className="text-xs font-semibold text-[#9A969A]">سؤال {index + 1}</span>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <Label className="text-xs">السؤال</Label>
                  <CharCount value={item.question_ar || ""} max={LIMITS.question} />
                </div>
                <Input value={item.question_ar || ""} onChange={(e) => updateItem(index, { ...item, question_ar: e.target.value })} dir="rtl" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <Label className="text-xs">الإجابة</Label>
                  <CharCount value={item.answer_ar || ""} max={LIMITS.answer} />
                </div>
                <Textarea value={item.answer_ar || ""} onChange={(e) => updateItem(index, { ...item, answer_ar: e.target.value })} dir="rtl" rows={3} className="text-sm" />
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      <Button
        variant="outline"
        size="sm"
        onClick={addItem}
        title="הוסף שאלה ותשובה. FAQ עוזר לדירוג SEO ומהווה מקור ציטוט ל-AI. מומלץ: 5-8 שאלות."
        className="w-full"
      >
        <Plus className="w-3.5 h-3.5 mr-1.5" />
        הוסף שאלה
      </Button>

      {/* CTA toggle + text — applies to all languages */}
      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-4 bg-[#B8D900] rounded-full" />
          <span className="text-xs font-bold text-[#2A2628]">כפתור קריאה לפעולה</span>
        </div>
        <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-muted/30">
          <div>
            <Label className="text-xs font-semibold">הצג כפתור קריאה לפעולה</Label>
            <p className="text-[10px] text-[#9A969A] mt-0.5">כבה כדי להסתיר לחלוטין את הכפתור מתחת לשאלות</p>
          </div>
          <Switch
            checked={content.cta_enabled !== false}
            onCheckedChange={(checked) => onChange({ ...content, cta_enabled: checked })}
          />
        </div>

        {content.cta_enabled !== false && (
          <div className="space-y-2 pr-3 border-r-2 border-[#B8D900]/30">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">טקסט כפתור (עברית)</Label>
                <CharCount value={content.cta_text_he || ""} max={LIMITS.cta_text} />
              </div>
              <Input
                value={content.cta_text_he || ""}
                onChange={(e) => update("cta_text_he", e.target.value)}
                placeholder="יש לכם עוד שאלה? דברו איתנו"
                dir="rtl"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">טקסט כפתור (אנגלית)</Label>
                <CharCount value={content.cta_text_en || ""} max={LIMITS.cta_text} />
              </div>
              <Input
                value={content.cta_text_en || ""}
                onChange={(e) => update("cta_text_en", e.target.value)}
                placeholder="Have More Questions? Contact Us"
                className="h-8 text-sm"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
