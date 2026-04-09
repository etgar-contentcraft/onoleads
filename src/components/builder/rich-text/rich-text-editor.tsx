"use client";

/**
 * Tiptap editor wrapper — the core editing experience.
 *
 * Uses StarterKit (bold/italic/headings/lists/paragraph) + Underline +
 * Link + TextAlign. Output is HTML pushed to parent via onChange callback.
 */

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { useEffect, useRef } from "react";
import { RichTextToolbar } from "./rich-text-toolbar";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  dir?: "rtl" | "ltr" | "auto";
}

export function RichTextEditor({ value, onChange, placeholder, dir = "auto" }: RichTextEditorProps) {
  /** Track whether the editor itself triggered the update to avoid loops. */
  const isInternalUpdate = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: value || "",
    onUpdate: ({ editor: e }) => {
      isInternalUpdate.current = true;
      onChange(e.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[100px] px-3 py-2 text-[#4A4648]",
        dir,
        ...(placeholder ? { "data-placeholder": placeholder } : {}),
      },
    },
  });

  // Sync external value changes (e.g. reset, language switch) into the editor
  useEffect(() => {
    if (!editor) return;
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    const currentHtml = editor.getHTML();
    if (value !== currentHtml) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  return (
    <div className="border border-[#E5E5E5] rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#B8D900]/30 focus-within:border-[#B8D900]/50 transition-shadow">
      <RichTextToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
