"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SECTION_REGISTRY,
  type SectionTypeMeta,
} from "@/lib/sections/registry";

/**
 * Shape used by the palette draggable items.
 * Re-exported so the builder page can reference it without an extra import.
 */
export type SectionTypeDefinition = Pick<
  SectionTypeMeta,
  "type" | "labelEn" | "labelHe" | "icon" | "description"
> & {
  /** Alias kept for backward-compat with existing drag-drop consumers */
  label: string;
};

/**
 * The ordered list of section types shown in the builder palette.
 * Only includes types that are meaningful to drag onto a page.
 * Derived from SECTION_REGISTRY — do not edit here; edit the registry instead.
 */
export const SECTION_TYPES: SectionTypeDefinition[] = SECTION_REGISTRY
  .filter((entry) =>
    // Exclude types that aren't draggable palette items
    !["program_info_bar", "sticky_header", "event"].includes(entry.type)
  )
  .map((entry) => ({
    type: entry.type,
    labelEn: entry.labelEn,
    labelHe: entry.labelHe,
    label: entry.labelEn, // backward-compat alias
    icon: entry.icon,
    description: entry.description,
  }));

function DraggableSectionType({ def }: { def: SectionTypeDefinition }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-${def.type}`,
    data: { type: "palette-item", sectionType: def.type },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = def.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 hover:border-primary/30 cursor-grab active:cursor-grabbing transition-all duration-150 group"
    >
      <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors shrink-0">
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground leading-tight">{def.label}</p>
        <p className="text-xs text-muted-foreground leading-tight mt-0.5 truncate">{def.description}</p>
      </div>
    </div>
  );
}

export function SectionPalette() {
  return (
    <div className="w-[280px] border-r border-border bg-card flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="font-semibold text-sm text-foreground">Sections</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Drag to add to page</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {SECTION_TYPES.map((def) => (
            <DraggableSectionType key={def.type} def={def} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
