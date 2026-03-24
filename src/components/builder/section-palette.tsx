"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  LayoutTemplate,
  FileText,
  Video,
  BarChart3,
  HelpCircle,
  Quote,
  BookOpen,
  MousePointerClick,
  MessageCircle,
  PanelTop,
  ChevronDown,
  ImageIcon,
  Code2,
  LucideIcon,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface SectionTypeDefinition {
  type: string;
  label: string;
  labelHe: string;
  icon: LucideIcon;
  description: string;
}

export const SECTION_TYPES: SectionTypeDefinition[] = [
  { type: "hero", label: "Hero", labelHe: "באנר ראשי", icon: LayoutTemplate, description: "Main hero with background image and CTA" },
  { type: "form", label: "Lead Form", labelHe: "טופס לידים", icon: FileText, description: "Lead capture form" },
  { type: "video", label: "Video", labelHe: "וידאו", icon: Video, description: "YouTube or Vimeo embed" },
  { type: "stats", label: "Stats", labelHe: "נתונים", icon: BarChart3, description: "Animated stat counters" },
  { type: "faq", label: "FAQ", labelHe: "שאלות נפוצות", icon: HelpCircle, description: "Frequently asked questions" },
  { type: "testimonials", label: "Testimonials", labelHe: "המלצות", icon: Quote, description: "Student/alumni quotes" },
  { type: "curriculum", label: "Curriculum", labelHe: "תוכנית לימודים", icon: BookOpen, description: "Program curriculum" },
  { type: "cta", label: "CTA Banner", labelHe: "באנר קריאה לפעולה", icon: MousePointerClick, description: "Call-to-action banner" },
  { type: "whatsapp", label: "WhatsApp", labelHe: "וואטסאפ", icon: MessageCircle, description: "Floating WhatsApp button" },
  { type: "sticky_header", label: "Sticky Header", labelHe: "כותרת נצמדת", icon: PanelTop, description: "Sticky top navigation bar" },
  { type: "accordion", label: "Accordion", labelHe: "אקורדיון", icon: ChevronDown, description: "Expandable content sections" },
  { type: "gallery", label: "Gallery", labelHe: "גלריה", icon: ImageIcon, description: "Image gallery/carousel" },
  { type: "custom_html", label: "Custom HTML", labelHe: "HTML מותאם", icon: Code2, description: "Raw HTML block" },
];

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
