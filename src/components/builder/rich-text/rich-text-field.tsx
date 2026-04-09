"use client";

/**
 * RichTextField — drop-in replacement for TextareaField in the builder.
 *
 * Wraps the Tiptap editor in a labeled field that matches the visual style
 * of the existing Field/TextareaField components.
 */

import dynamic from "next/dynamic";
import { Label } from "@/components/ui/label";

const RichTextEditor = dynamic(
  () => import("./rich-text-editor").then((m) => ({ default: m.RichTextEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[120px] rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] animate-pulse" />
    ),
  }
);

interface RichTextFieldProps {
  label: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  dir?: "rtl" | "ltr" | "auto";
}

export function RichTextField({
  label,
  value,
  onChange,
  placeholder,
  dir = "auto",
}: RichTextFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-[#716C70]">{label}</Label>
      <RichTextEditor
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        dir={dir}
      />
    </div>
  );
}
