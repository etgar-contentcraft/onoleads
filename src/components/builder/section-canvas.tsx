"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Eye,
  EyeOff,
  Copy,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SECTION_TYPES } from "./section-palette";
import type { PageSection } from "@/lib/types/database";
import { cn } from "@/lib/utils";

interface SectionCanvasProps {
  sections: PageSection[];
  selectedSectionId: string | null;
  onSelectSection: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}

function SortableSectionCard({
  section,
  isSelected,
  onSelect,
  onToggleVisibility,
  onDuplicate,
  onRemove,
}: {
  section: PageSection;
  isSelected: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const typeDef = SECTION_TYPES.find((t) => t.type === section.section_type);
  const Icon = typeDef?.icon;
  const content = section.content as Record<string, unknown> | null;

  const getPreview = (): string => {
    if (!content) return "Empty section";
    const heading = content.heading_he || content.heading_en || content.title_he || content.title_en;
    if (typeof heading === "string") return heading;
    if (section.section_type === "video" && typeof content.video_url === "string") return content.video_url;
    if (section.section_type === "faq" && Array.isArray(content.items)) return `${content.items.length} items`;
    if (section.section_type === "custom_html") return "Custom HTML block";
    return typeDef?.label || section.section_type;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={cn(
        "group flex items-start gap-2 p-3 rounded-lg border bg-card transition-all duration-150 cursor-pointer",
        isSelected
          ? "border-primary ring-2 ring-primary/20 shadow-sm"
          : "border-border hover:border-primary/30 hover:shadow-sm",
        !section.is_visible && "opacity-50"
      )}
    >
      <button
        className="mt-0.5 p-1 rounded hover:bg-muted cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="flex items-center justify-center w-6 h-6 rounded bg-primary/10 text-primary shrink-0">
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}
          <span className="text-sm font-medium text-foreground">
            {typeDef?.label || section.section_type}
          </span>
          {!section.is_visible && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              Hidden
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1 truncate">{getPreview()}</p>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
          title={section.is_visible ? "Hide" : "Show"}
        >
          {section.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
          title="Duplicate"
        >
          <Copy className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          title="Remove"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function SectionCanvas({
  sections,
  selectedSectionId,
  onSelectSection,
  onToggleVisibility,
  onDuplicate,
  onRemove,
}: SectionCanvasProps) {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas-droppable" });

  return (
    <div className="flex-1 flex flex-col h-full bg-muted/30">
      <div className="px-4 py-3 border-b border-border bg-card">
        <h2 className="font-semibold text-sm text-foreground">Page Sections</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {sections.length} section{sections.length !== 1 ? "s" : ""} &middot; Drag to reorder
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div
          ref={setNodeRef}
          className={cn(
            "p-4 space-y-2 min-h-[300px] transition-colors",
            isOver && "bg-primary/5"
          )}
        >
          {sections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <GripVertical className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No sections yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Drag sections from the left panel to get started
              </p>
            </div>
          ) : (
            <SortableContext
              items={sections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {sections.map((section) => (
                <SortableSectionCard
                  key={section.id}
                  section={section}
                  isSelected={selectedSectionId === section.id}
                  onSelect={() => onSelectSection(section.id)}
                  onToggleVisibility={() => onToggleVisibility(section.id)}
                  onDuplicate={() => onDuplicate(section.id)}
                  onRemove={() => onRemove(section.id)}
                />
              ))}
            </SortableContext>
          )}

          {isOver && (
            <div className="border-2 border-dashed border-primary/50 rounded-lg p-4 text-center">
              <p className="text-sm text-primary font-medium">Drop here to add section</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
