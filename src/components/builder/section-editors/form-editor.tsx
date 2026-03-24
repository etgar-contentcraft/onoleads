"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, GripVertical } from "lucide-react";

interface FormField {
  name: string;
  type: "text" | "email" | "tel" | "select";
  label_he: string;
  label_en: string;
  label_ar?: string;
  required: boolean;
  options?: string[];
}

interface FormContent {
  fields?: FormField[];
  submit_text_he?: string;
  submit_text_en?: string;
  submit_text_ar?: string;
  thank_you_message_he?: string;
  thank_you_message_en?: string;
  thank_you_message_ar?: string;
  heading_he?: string;
  heading_en?: string;
  heading_ar?: string;
}

interface FormEditorProps {
  content: FormContent;
  onChange: (content: FormContent) => void;
}

const DEFAULT_FIELDS: FormField[] = [
  { name: "full_name", type: "text", label_he: "שם מלא", label_en: "Full Name", required: true },
  { name: "phone", type: "tel", label_he: "טלפון", label_en: "Phone", required: true },
  { name: "email", type: "email", label_he: "אימייל", label_en: "Email", required: false },
];

export function FormEditor({ content, onChange }: FormEditorProps) {
  const fields = content.fields || DEFAULT_FIELDS;

  const update = (key: keyof FormContent, value: unknown) => {
    onChange({ ...content, [key]: value });
  };

  const updateField = (index: number, field: FormField) => {
    const newFields = [...fields];
    newFields[index] = field;
    update("fields", newFields);
  };

  const addField = () => {
    update("fields", [
      ...fields,
      {
        name: `field_${fields.length + 1}`,
        type: "text" as const,
        label_he: "",
        label_en: "",
        required: false,
      },
    ]);
  };

  const removeField = (index: number) => {
    update("fields", fields.filter((_, i) => i !== index));
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
            <Label>כותרת הטופס</Label>
            <Input
              value={content.heading_he || ""}
              onChange={(e) => update("heading_he", e.target.value)}
              placeholder="השאירו פרטים ונחזור אליכם"
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <Label>טקסט כפתור שליחה</Label>
            <Input
              value={content.submit_text_he || ""}
              onChange={(e) => update("submit_text_he", e.target.value)}
              placeholder="שלחו לי פרטים"
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <Label>הודעת תודה</Label>
            <Textarea
              value={content.thank_you_message_he || ""}
              onChange={(e) => update("thank_you_message_he", e.target.value)}
              placeholder="תודה! נציג יחזור אליך בהקדם"
              dir="rtl"
              rows={2}
            />
          </div>
        </TabsContent>

        <TabsContent value="en" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Form Heading</Label>
            <Input
              value={content.heading_en || ""}
              onChange={(e) => update("heading_en", e.target.value)}
              placeholder="Leave your details and we'll get back to you"
            />
          </div>
          <div className="space-y-2">
            <Label>Submit Button Text</Label>
            <Input
              value={content.submit_text_en || ""}
              onChange={(e) => update("submit_text_en", e.target.value)}
              placeholder="Send me details"
            />
          </div>
          <div className="space-y-2">
            <Label>Thank You Message</Label>
            <Textarea
              value={content.thank_you_message_en || ""}
              onChange={(e) => update("thank_you_message_en", e.target.value)}
              placeholder="Thank you! We'll be in touch soon"
              rows={2}
            />
          </div>
        </TabsContent>

        <TabsContent value="ar" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>عنوان النموذج</Label>
            <Input
              value={content.heading_ar || ""}
              onChange={(e) => update("heading_ar", e.target.value)}
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <Label>نص زر الإرسال</Label>
            <Input
              value={content.submit_text_ar || ""}
              onChange={(e) => update("submit_text_ar", e.target.value)}
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <Label>رسالة الشكر</Label>
            <Textarea
              value={content.thank_you_message_ar || ""}
              onChange={(e) => update("thank_you_message_ar", e.target.value)}
              dir="rtl"
              rows={2}
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-foreground">Form Fields</h3>
          <Button variant="outline" size="sm" onClick={addField}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Field
          </Button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={index}
              className="p-3 rounded-lg border border-border bg-muted/30 space-y-3"
            >
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-xs font-medium text-muted-foreground flex-1">
                  Field {index + 1}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  onClick={() => removeField(index)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Field Name</Label>
                  <Input
                    value={field.name}
                    onChange={(e) => updateField(index, { ...field, name: e.target.value })}
                    placeholder="field_name"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <select
                    value={field.type}
                    onChange={(e) => updateField(index, { ...field, type: e.target.value as FormField["type"] })}
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="text">Text</option>
                    <option value="email">Email</option>
                    <option value="tel">Phone</option>
                    <option value="select">Select</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Label (HE)</Label>
                  <Input
                    value={field.label_he}
                    onChange={(e) => updateField(index, { ...field, label_he: e.target.value })}
                    dir="rtl"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Label (EN)</Label>
                  <Input
                    value={field.label_en}
                    onChange={(e) => updateField(index, { ...field, label_en: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={field.required}
                  onCheckedChange={(checked) => updateField(index, { ...field, required: checked })}
                />
                <Label className="text-xs">Required</Label>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
