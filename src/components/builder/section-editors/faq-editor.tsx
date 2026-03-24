"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";

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
    update("items", [
      ...items,
      { question_he: "", question_en: "", answer_he: "", answer_en: "" },
    ]);
  };

  const removeItem = (index: number) => {
    update("items", items.filter((_, i) => i !== index));
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
            <Label>כותרת</Label>
            <Input
              value={content.heading_he || ""}
              onChange={(e) => update("heading_he", e.target.value)}
              placeholder="שאלות נפוצות"
              dir="rtl"
            />
          </div>

          {items.map((item, index) => (
            <div key={index} className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">שאלה {index + 1}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeItem(index)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              <Input
                value={item.question_he}
                onChange={(e) => updateItem(index, { ...item, question_he: e.target.value })}
                placeholder="שאלה..."
                dir="rtl"
                className="h-8 text-sm"
              />
              <Textarea
                value={item.answer_he}
                onChange={(e) => updateItem(index, { ...item, answer_he: e.target.value })}
                placeholder="תשובה..."
                dir="rtl"
                rows={2}
                className="text-sm"
              />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="en" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Heading</Label>
            <Input
              value={content.heading_en || ""}
              onChange={(e) => update("heading_en", e.target.value)}
              placeholder="Frequently Asked Questions"
            />
          </div>

          {items.map((item, index) => (
            <div key={index} className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Question {index + 1}</span>
              <Input
                value={item.question_en || ""}
                onChange={(e) => updateItem(index, { ...item, question_en: e.target.value })}
                placeholder="Question..."
                className="h-8 text-sm"
              />
              <Textarea
                value={item.answer_en || ""}
                onChange={(e) => updateItem(index, { ...item, answer_en: e.target.value })}
                placeholder="Answer..."
                rows={2}
                className="text-sm"
              />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="ar" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>العنوان</Label>
            <Input
              value={content.heading_ar || ""}
              onChange={(e) => update("heading_ar", e.target.value)}
              dir="rtl"
            />
          </div>

          {items.map((item, index) => (
            <div key={index} className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
              <span className="text-xs font-medium text-muted-foreground">سؤال {index + 1}</span>
              <Input
                value={item.question_ar || ""}
                onChange={(e) => updateItem(index, { ...item, question_ar: e.target.value })}
                dir="rtl"
                className="h-8 text-sm"
              />
              <Textarea
                value={item.answer_ar || ""}
                onChange={(e) => updateItem(index, { ...item, answer_ar: e.target.value })}
                dir="rtl"
                rows={2}
                className="text-sm"
              />
            </div>
          ))}
        </TabsContent>
      </Tabs>

      <Button variant="outline" size="sm" onClick={addItem} className="w-full">
        <Plus className="w-3.5 h-3.5 mr-1.5" />
        Add Question
      </Button>
    </div>
  );
}
