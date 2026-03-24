"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";

type GenericContent = Record<string, unknown>;

interface GenericEditorProps {
  sectionType: string;
  content: GenericContent;
  onChange: (content: GenericContent) => void;
}

function VideoEditorFields({ content, onChange }: { content: GenericContent; onChange: (c: GenericContent) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Video URL</Label>
        <Input
          value={(content.video_url as string) || ""}
          onChange={(e) => onChange({ ...content, video_url: e.target.value })}
          placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
        />
        <p className="text-xs text-muted-foreground">YouTube or Vimeo URL</p>
      </div>
      <div className="space-y-2">
        <Label>Poster Image URL (optional)</Label>
        <Input
          value={(content.poster_url as string) || ""}
          onChange={(e) => onChange({ ...content, poster_url: e.target.value })}
          placeholder="https://..."
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={(content.autoplay as boolean) || false}
          onCheckedChange={(checked) => onChange({ ...content, autoplay: checked })}
        />
        <Label>Autoplay</Label>
      </div>
    </div>
  );
}

function StatsEditorFields({ content, onChange }: { content: GenericContent; onChange: (c: GenericContent) => void }) {
  const items = (content.items as Array<{ value: string; label_he: string; label_en: string; suffix?: string }>) || [];

  const updateItem = (index: number, item: typeof items[0]) => {
    const newItems = [...items];
    newItems[index] = item;
    onChange({ ...content, items: newItems });
  };

  const addItem = () => {
    onChange({ ...content, items: [...items, { value: "", label_he: "", label_en: "", suffix: "" }] });
  };

  const removeItem = (index: number) => {
    onChange({ ...content, items: items.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Stat {index + 1}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeItem(index)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Value</Label>
              <Input value={item.value} onChange={(e) => updateItem(index, { ...item, value: e.target.value })} placeholder="50,000" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Suffix</Label>
              <Input value={item.suffix || ""} onChange={(e) => updateItem(index, { ...item, suffix: e.target.value })} placeholder="+" className="h-8 text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Label (HE)</Label>
              <Input value={item.label_he} onChange={(e) => updateItem(index, { ...item, label_he: e.target.value })} dir="rtl" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Label (EN)</Label>
              <Input value={item.label_en} onChange={(e) => updateItem(index, { ...item, label_en: e.target.value })} className="h-8 text-xs" />
            </div>
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addItem} className="w-full">
        <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Stat
      </Button>
    </div>
  );
}

function TestimonialsEditorFields({ content, onChange }: { content: GenericContent; onChange: (c: GenericContent) => void }) {
  const items = (content.items as Array<{ name: string; role_he: string; role_en?: string; quote_he: string; quote_en?: string; image_url?: string }>) || [];

  const updateItem = (index: number, item: typeof items[0]) => {
    const newItems = [...items];
    newItems[index] = item;
    onChange({ ...content, items: newItems });
  };

  const addItem = () => {
    onChange({ ...content, items: [...items, { name: "", role_he: "", quote_he: "", quote_en: "" }] });
  };

  const removeItem = (index: number) => {
    onChange({ ...content, items: items.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Section Heading (HE)</Label>
        <Input value={(content.heading_he as string) || ""} onChange={(e) => onChange({ ...content, heading_he: e.target.value })} dir="rtl" placeholder="מה אומרים הסטודנטים" />
      </div>
      <div className="space-y-2">
        <Label>Section Heading (EN)</Label>
        <Input value={(content.heading_en as string) || ""} onChange={(e) => onChange({ ...content, heading_en: e.target.value })} placeholder="What students say" />
      </div>
      {items.map((item, index) => (
        <div key={index} className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Testimonial {index + 1}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeItem(index)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
          <Input value={item.name} onChange={(e) => updateItem(index, { ...item, name: e.target.value })} placeholder="Name" className="h-8 text-xs" />
          <div className="grid grid-cols-2 gap-2">
            <Input value={item.role_he} onChange={(e) => updateItem(index, { ...item, role_he: e.target.value })} placeholder="תפקיד" dir="rtl" className="h-8 text-xs" />
            <Input value={item.role_en || ""} onChange={(e) => updateItem(index, { ...item, role_en: e.target.value })} placeholder="Role" className="h-8 text-xs" />
          </div>
          <Textarea value={item.quote_he} onChange={(e) => updateItem(index, { ...item, quote_he: e.target.value })} placeholder="ציטוט..." dir="rtl" rows={2} className="text-xs" />
          <Textarea value={item.quote_en || ""} onChange={(e) => updateItem(index, { ...item, quote_en: e.target.value })} placeholder="Quote..." rows={2} className="text-xs" />
          <Input value={item.image_url || ""} onChange={(e) => updateItem(index, { ...item, image_url: e.target.value })} placeholder="Image URL (optional)" className="h-8 text-xs" />
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addItem} className="w-full">
        <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Testimonial
      </Button>
    </div>
  );
}

function CtaEditorFields({ content, onChange }: { content: GenericContent; onChange: (c: GenericContent) => void }) {
  return (
    <Tabs defaultValue="he" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="he">עברית</TabsTrigger>
        <TabsTrigger value="en">English</TabsTrigger>
        <TabsTrigger value="ar">عربي</TabsTrigger>
      </TabsList>
      <TabsContent value="he" className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label>כותרת</Label>
          <Input value={(content.heading_he as string) || ""} onChange={(e) => onChange({ ...content, heading_he: e.target.value })} dir="rtl" placeholder="מוכנים להתחיל?" />
        </div>
        <div className="space-y-2">
          <Label>תיאור</Label>
          <Textarea value={(content.description_he as string) || ""} onChange={(e) => onChange({ ...content, description_he: e.target.value })} dir="rtl" rows={2} />
        </div>
        <div className="space-y-2">
          <Label>טקסט כפתור</Label>
          <Input value={(content.button_text_he as string) || ""} onChange={(e) => onChange({ ...content, button_text_he: e.target.value })} dir="rtl" placeholder="להרשמה" />
        </div>
      </TabsContent>
      <TabsContent value="en" className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label>Heading</Label>
          <Input value={(content.heading_en as string) || ""} onChange={(e) => onChange({ ...content, heading_en: e.target.value })} placeholder="Ready to start?" />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea value={(content.description_en as string) || ""} onChange={(e) => onChange({ ...content, description_en: e.target.value })} rows={2} />
        </div>
        <div className="space-y-2">
          <Label>Button Text</Label>
          <Input value={(content.button_text_en as string) || ""} onChange={(e) => onChange({ ...content, button_text_en: e.target.value })} placeholder="Register Now" />
        </div>
      </TabsContent>
      <TabsContent value="ar" className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label>العنوان</Label>
          <Input value={(content.heading_ar as string) || ""} onChange={(e) => onChange({ ...content, heading_ar: e.target.value })} dir="rtl" />
        </div>
        <div className="space-y-2">
          <Label>الوصف</Label>
          <Textarea value={(content.description_ar as string) || ""} onChange={(e) => onChange({ ...content, description_ar: e.target.value })} dir="rtl" rows={2} />
        </div>
        <div className="space-y-2">
          <Label>نص الزر</Label>
          <Input value={(content.button_text_ar as string) || ""} onChange={(e) => onChange({ ...content, button_text_ar: e.target.value })} dir="rtl" />
        </div>
      </TabsContent>
      <div className="mt-4 space-y-2">
        <Label>Button URL</Label>
        <Input value={(content.button_url as string) || ""} onChange={(e) => onChange({ ...content, button_url: e.target.value })} placeholder="#form" />
      </div>
      <div className="mt-2 space-y-2">
        <Label>Background Color (hex)</Label>
        <Input value={(content.bg_color as string) || ""} onChange={(e) => onChange({ ...content, bg_color: e.target.value })} placeholder="#B8D900" />
      </div>
    </Tabs>
  );
}

function WhatsappEditorFields({ content, onChange }: { content: GenericContent; onChange: (c: GenericContent) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>WhatsApp Phone Number</Label>
        <Input value={(content.phone as string) || ""} onChange={(e) => onChange({ ...content, phone: e.target.value })} placeholder="972501234567" />
        <p className="text-xs text-muted-foreground">International format without +</p>
      </div>
      <div className="space-y-2">
        <Label>Default Message (HE)</Label>
        <Textarea value={(content.message_he as string) || ""} onChange={(e) => onChange({ ...content, message_he: e.target.value })} dir="rtl" placeholder="היי, אשמח לקבל פרטים" rows={2} />
      </div>
      <div className="space-y-2">
        <Label>Default Message (EN)</Label>
        <Textarea value={(content.message_en as string) || ""} onChange={(e) => onChange({ ...content, message_en: e.target.value })} placeholder="Hi, I'd like more info" rows={2} />
      </div>
      <div className="space-y-2">
        <Label>Tooltip Text (HE)</Label>
        <Input value={(content.tooltip_he as string) || ""} onChange={(e) => onChange({ ...content, tooltip_he: e.target.value })} dir="rtl" placeholder="דברו איתנו בוואטסאפ" />
      </div>
    </div>
  );
}

function AccordionEditorFields({ content, onChange }: { content: GenericContent; onChange: (c: GenericContent) => void }) {
  const items = (content.items as Array<{ title_he: string; title_en?: string; body_he: string; body_en?: string }>) || [];
  const updateItem = (index: number, item: typeof items[0]) => {
    const newItems = [...items];
    newItems[index] = item;
    onChange({ ...content, items: newItems });
  };
  const addItem = () => onChange({ ...content, items: [...items, { title_he: "", title_en: "", body_he: "", body_en: "" }] });
  const removeItem = (index: number) => onChange({ ...content, items: items.filter((_, i) => i !== index) });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Heading (HE)</Label>
        <Input value={(content.heading_he as string) || ""} onChange={(e) => onChange({ ...content, heading_he: e.target.value })} dir="rtl" />
      </div>
      <div className="space-y-2">
        <Label>Heading (EN)</Label>
        <Input value={(content.heading_en as string) || ""} onChange={(e) => onChange({ ...content, heading_en: e.target.value })} />
      </div>
      {items.map((item, index) => (
        <div key={index} className="p-3 rounded-lg border bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Item {index + 1}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeItem(index)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
          <Input value={item.title_he} onChange={(e) => updateItem(index, { ...item, title_he: e.target.value })} placeholder="כותרת" dir="rtl" className="h-8 text-xs" />
          <Textarea value={item.body_he} onChange={(e) => updateItem(index, { ...item, body_he: e.target.value })} placeholder="תוכן" dir="rtl" rows={2} className="text-xs" />
          <Input value={item.title_en || ""} onChange={(e) => updateItem(index, { ...item, title_en: e.target.value })} placeholder="Title" className="h-8 text-xs" />
          <Textarea value={item.body_en || ""} onChange={(e) => updateItem(index, { ...item, body_en: e.target.value })} placeholder="Content" rows={2} className="text-xs" />
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addItem} className="w-full">
        <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Item
      </Button>
    </div>
  );
}

function GalleryEditorFields({ content, onChange }: { content: GenericContent; onChange: (c: GenericContent) => void }) {
  const images = (content.images as Array<{ url: string; alt_he?: string; alt_en?: string }>) || [];
  const addImage = () => onChange({ ...content, images: [...images, { url: "", alt_he: "", alt_en: "" }] });
  const removeImage = (index: number) => onChange({ ...content, images: images.filter((_, i) => i !== index) });
  const updateImage = (index: number, img: typeof images[0]) => {
    const newImages = [...images];
    newImages[index] = img;
    onChange({ ...content, images: newImages });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Heading (HE)</Label>
        <Input value={(content.heading_he as string) || ""} onChange={(e) => onChange({ ...content, heading_he: e.target.value })} dir="rtl" />
      </div>
      <div className="space-y-2">
        <Label>Heading (EN)</Label>
        <Input value={(content.heading_en as string) || ""} onChange={(e) => onChange({ ...content, heading_en: e.target.value })} />
      </div>
      {images.map((img, index) => (
        <div key={index} className="p-3 rounded-lg border bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Image {index + 1}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeImage(index)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
          <Input value={img.url} onChange={(e) => updateImage(index, { ...img, url: e.target.value })} placeholder="Image URL" className="h-8 text-xs" />
          <Input value={img.alt_he || ""} onChange={(e) => updateImage(index, { ...img, alt_he: e.target.value })} placeholder="Alt text (HE)" dir="rtl" className="h-8 text-xs" />
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addImage} className="w-full">
        <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Image
      </Button>
    </div>
  );
}

function CurriculumEditorFields({ content, onChange }: { content: GenericContent; onChange: (c: GenericContent) => void }) {
  const semesters = (content.semesters as Array<{ title_he: string; title_en?: string; courses: Array<{ name_he: string; name_en?: string }> }>) || [];

  const addSemester = () => onChange({ ...content, semesters: [...semesters, { title_he: "", title_en: "", courses: [] }] });
  const removeSemester = (index: number) => onChange({ ...content, semesters: semesters.filter((_, i) => i !== index) });
  const updateSemester = (index: number, sem: typeof semesters[0]) => {
    const n = [...semesters];
    n[index] = sem;
    onChange({ ...content, semesters: n });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Heading (HE)</Label>
        <Input value={(content.heading_he as string) || ""} onChange={(e) => onChange({ ...content, heading_he: e.target.value })} dir="rtl" placeholder="תוכנית הלימודים" />
      </div>
      <div className="space-y-2">
        <Label>Heading (EN)</Label>
        <Input value={(content.heading_en as string) || ""} onChange={(e) => onChange({ ...content, heading_en: e.target.value })} placeholder="Curriculum" />
      </div>
      {semesters.map((sem, sIndex) => (
        <div key={sIndex} className="p-3 rounded-lg border bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Semester {sIndex + 1}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeSemester(sIndex)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
          <Input value={sem.title_he} onChange={(e) => updateSemester(sIndex, { ...sem, title_he: e.target.value })} placeholder="שנה א'" dir="rtl" className="h-8 text-xs" />
          <Input value={sem.title_en || ""} onChange={(e) => updateSemester(sIndex, { ...sem, title_en: e.target.value })} placeholder="Year 1" className="h-8 text-xs" />
          {sem.courses.map((course, cIndex) => (
            <div key={cIndex} className="flex gap-2 items-center">
              <Input value={course.name_he} onChange={(e) => {
                const courses = [...sem.courses];
                courses[cIndex] = { ...course, name_he: e.target.value };
                updateSemester(sIndex, { ...sem, courses });
              }} placeholder="שם קורס" dir="rtl" className="h-7 text-xs flex-1" />
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0" onClick={() => {
                updateSemester(sIndex, { ...sem, courses: sem.courses.filter((_, i) => i !== cIndex) });
              }}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => {
            updateSemester(sIndex, { ...sem, courses: [...sem.courses, { name_he: "", name_en: "" }] });
          }}>
            <Plus className="w-3 h-3 mr-1" /> Add Course
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addSemester} className="w-full">
        <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Semester
      </Button>
    </div>
  );
}

function CustomHtmlEditorFields({ content, onChange }: { content: GenericContent; onChange: (c: GenericContent) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>HTML Content</Label>
        <Textarea
          value={(content.html as string) || ""}
          onChange={(e) => onChange({ ...content, html: e.target.value })}
          placeholder="<div>Your custom HTML...</div>"
          rows={10}
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">Raw HTML will be rendered in an isolated container</p>
      </div>
      <div className="space-y-2">
        <Label>Custom CSS (optional)</Label>
        <Textarea
          value={(content.css as string) || ""}
          onChange={(e) => onChange({ ...content, css: e.target.value })}
          placeholder=".my-class { color: red; }"
          rows={5}
          className="font-mono text-xs"
        />
      </div>
    </div>
  );
}

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
          <div className="space-y-2">
            <Label>טקסט</Label>
            <Input value={(content.text_he as string) || ""} onChange={(e) => onChange({ ...content, text_he: e.target.value })} dir="rtl" placeholder="הירשמו עכשיו!" />
          </div>
          <div className="space-y-2">
            <Label>טקסט כפתור</Label>
            <Input value={(content.button_text_he as string) || ""} onChange={(e) => onChange({ ...content, button_text_he: e.target.value })} dir="rtl" placeholder="להרשמה" />
          </div>
        </TabsContent>
        <TabsContent value="en" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Text</Label>
            <Input value={(content.text_en as string) || ""} onChange={(e) => onChange({ ...content, text_en: e.target.value })} placeholder="Register now!" />
          </div>
          <div className="space-y-2">
            <Label>Button Text</Label>
            <Input value={(content.button_text_en as string) || ""} onChange={(e) => onChange({ ...content, button_text_en: e.target.value })} placeholder="Register" />
          </div>
        </TabsContent>
        <TabsContent value="ar" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>النص</Label>
            <Input value={(content.text_ar as string) || ""} onChange={(e) => onChange({ ...content, text_ar: e.target.value })} dir="rtl" />
          </div>
          <div className="space-y-2">
            <Label>نص الزر</Label>
            <Input value={(content.button_text_ar as string) || ""} onChange={(e) => onChange({ ...content, button_text_ar: e.target.value })} dir="rtl" />
          </div>
        </TabsContent>
      </Tabs>
      <div className="space-y-2">
        <Label>Button URL</Label>
        <Input value={(content.button_url as string) || ""} onChange={(e) => onChange({ ...content, button_url: e.target.value })} placeholder="#form" />
      </div>
      <div className="space-y-2">
        <Label>Background Color</Label>
        <Input value={(content.bg_color as string) || ""} onChange={(e) => onChange({ ...content, bg_color: e.target.value })} placeholder="#B8D900" />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={(content.show_phone as boolean) || false}
          onCheckedChange={(checked) => onChange({ ...content, show_phone: checked })}
        />
        <Label>Show Phone Number</Label>
      </div>
      {Boolean(content.show_phone) && (
        <div className="space-y-2">
          <Label>Phone Number</Label>
          <Input value={(content.phone as string) || ""} onChange={(e) => onChange({ ...content, phone: e.target.value })} placeholder="*6930" />
        </div>
      )}
    </div>
  );
}

export function GenericEditor({ sectionType, content, onChange }: GenericEditorProps) {
  switch (sectionType) {
    case "video":
      return <VideoEditorFields content={content} onChange={onChange} />;
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
          No editor available for section type: {sectionType}
        </div>
      );
  }
}
