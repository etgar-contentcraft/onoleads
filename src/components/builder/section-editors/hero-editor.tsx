"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface HeroContent {
  heading_he?: string;
  heading_en?: string;
  heading_ar?: string;
  subheading_he?: string;
  subheading_en?: string;
  subheading_ar?: string;
  background_image_url?: string;
  stat_value?: string;
  stat_label_he?: string;
  stat_label_en?: string;
  stat_label_ar?: string;
  cta_text_he?: string;
  cta_text_en?: string;
  cta_text_ar?: string;
  cta_url?: string;
}

interface HeroEditorProps {
  content: HeroContent;
  onChange: (content: HeroContent) => void;
}

export function HeroEditor({ content, onChange }: HeroEditorProps) {
  const update = (key: keyof HeroContent, value: string) => {
    onChange({ ...content, [key]: value });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="he" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="he">עברית</TabsTrigger>
          <TabsTrigger value="en">English</TabsTrigger>
          <TabsTrigger value="ar">عربي</TabsTrigger>
        </TabsList>

        <TabsContent value="he" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="heading_he">כותרת</Label>
            <Input
              id="heading_he"
              value={content.heading_he || ""}
              onChange={(e) => update("heading_he", e.target.value)}
              placeholder="הקריה האקדמית אונו"
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subheading_he">כותרת משנה</Label>
            <Textarea
              id="subheading_he"
              value={content.subheading_he || ""}
              onChange={(e) => update("subheading_he", e.target.value)}
              placeholder="המכללה המומלצת בישראל"
              dir="rtl"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cta_text_he">טקסט כפתור CTA</Label>
            <Input
              id="cta_text_he"
              value={content.cta_text_he || ""}
              onChange={(e) => update("cta_text_he", e.target.value)}
              placeholder="להרשמה"
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stat_label_he">תווית נתון</Label>
            <Input
              id="stat_label_he"
              value={content.stat_label_he || ""}
              onChange={(e) => update("stat_label_he", e.target.value)}
              placeholder="בוגרים מובילים"
              dir="rtl"
            />
          </div>
        </TabsContent>

        <TabsContent value="en" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="heading_en">Heading</Label>
            <Input
              id="heading_en"
              value={content.heading_en || ""}
              onChange={(e) => update("heading_en", e.target.value)}
              placeholder="Ono Academic College"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subheading_en">Subheading</Label>
            <Textarea
              id="subheading_en"
              value={content.subheading_en || ""}
              onChange={(e) => update("subheading_en", e.target.value)}
              placeholder="Israel's most recommended college"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cta_text_en">CTA Button Text</Label>
            <Input
              id="cta_text_en"
              value={content.cta_text_en || ""}
              onChange={(e) => update("cta_text_en", e.target.value)}
              placeholder="Register Now"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stat_label_en">Stat Label</Label>
            <Input
              id="stat_label_en"
              value={content.stat_label_en || ""}
              onChange={(e) => update("stat_label_en", e.target.value)}
              placeholder="Leading graduates"
            />
          </div>
        </TabsContent>

        <TabsContent value="ar" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="heading_ar">العنوان</Label>
            <Input
              id="heading_ar"
              value={content.heading_ar || ""}
              onChange={(e) => update("heading_ar", e.target.value)}
              placeholder="كلية أونو الأكاديمية"
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subheading_ar">العنوان الفرعي</Label>
            <Textarea
              id="subheading_ar"
              value={content.subheading_ar || ""}
              onChange={(e) => update("subheading_ar", e.target.value)}
              dir="rtl"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cta_text_ar">نص زر CTA</Label>
            <Input
              id="cta_text_ar"
              value={content.cta_text_ar || ""}
              onChange={(e) => update("cta_text_ar", e.target.value)}
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stat_label_ar">تسمية الإحصاء</Label>
            <Input
              id="stat_label_ar"
              value={content.stat_label_ar || ""}
              onChange={(e) => update("stat_label_ar", e.target.value)}
              dir="rtl"
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="border-t pt-4 space-y-4">
        <h3 className="text-sm font-medium text-foreground">Shared Settings</h3>

        <div className="space-y-2">
          <Label htmlFor="background_image_url">Background Image URL</Label>
          <Input
            id="background_image_url"
            value={content.background_image_url || ""}
            onChange={(e) => update("background_image_url", e.target.value)}
            placeholder="https://..."
            type="url"
          />
          {content.background_image_url && (
            <div className="mt-2 rounded-md overflow-hidden border h-24 bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={content.background_image_url}
                alt="Background preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="stat_value">Stat Value</Label>
          <Input
            id="stat_value"
            value={content.stat_value || ""}
            onChange={(e) => update("stat_value", e.target.value)}
            placeholder="50,000+"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cta_url">CTA URL</Label>
          <Input
            id="cta_url"
            value={content.cta_url || ""}
            onChange={(e) => update("cta_url", e.target.value)}
            placeholder="#form"
          />
        </div>
      </div>
    </div>
  );
}
