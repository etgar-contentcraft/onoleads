"use client";

import { HeroEditor } from "./hero-editor";
import { FormEditor } from "./form-editor";
import { FaqEditor } from "./faq-editor";
import { GenericEditor } from "./generic-editor";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PageSection } from "@/lib/types/database";
import { SECTION_TYPES } from "../section-palette";

interface SectionEditorPanelProps {
  section: PageSection | null;
  onContentChange: (sectionId: string, content: Record<string, unknown>) => void;
}

export function SectionEditorPanel({ section, onContentChange }: SectionEditorPanelProps) {
  if (!section) {
    return (
      <div className="w-[340px] border-l border-border bg-card flex flex-col h-full">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-sm text-foreground">Section Editor</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-sm text-muted-foreground text-center">
            Select a section from the canvas to edit its content
          </p>
        </div>
      </div>
    );
  }

  const typeDef = SECTION_TYPES.find((t) => t.type === section.section_type);
  const content = (section.content || {}) as Record<string, unknown>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChange = (newContent: any) => {
    onContentChange(section.id, newContent);
  };

  const renderEditor = () => {
    switch (section.section_type) {
      case "hero":
        return <HeroEditor content={content as any} onChange={handleChange} />;
      case "form":
        return <FormEditor content={content as any} onChange={handleChange} />;
      case "faq":
        return <FaqEditor content={content as any} onChange={handleChange} />;
      default:
        return (
          <GenericEditor
            sectionType={section.section_type}
            content={content}
            onChange={handleChange}
          />
        );
    }
  };

  return (
    <div className="w-[340px] border-l border-border bg-card flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          {typeDef?.icon && (
            <div className="flex items-center justify-center w-6 h-6 rounded bg-primary/10 text-primary">
              <typeDef.icon className="w-3.5 h-3.5" />
            </div>
          )}
          <div>
            <h2 className="font-semibold text-sm text-foreground">
              {typeDef?.label || section.section_type}
            </h2>
            <p className="text-[10px] text-muted-foreground">{typeDef?.description}</p>
          </div>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4">{renderEditor()}</div>
      </ScrollArea>
    </div>
  );
}

export { HeroEditor } from "./hero-editor";
export { FormEditor } from "./form-editor";
export { FaqEditor } from "./faq-editor";
export { GenericEditor } from "./generic-editor";
