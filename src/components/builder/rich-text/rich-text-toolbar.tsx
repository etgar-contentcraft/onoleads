"use client";

/**
 * Toolbar for the Tiptap rich text editor.
 *
 * Renders icon buttons for formatting (bold, italic, underline), headings
 * (H2, H3), lists (bullet, ordered), text alignment (right, center, left),
 * link insert/remove, and clear formatting.
 */

import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignRight,
  AlignCenter,
  AlignLeft,
  Link2,
  Heading2,
  Heading3,
  RemoveFormatting,
} from "lucide-react";

interface ToolbarProps {
  editor: Editor | null;
}

/** Single toolbar button with active-state highlight. */
function Btn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
        active
          ? "bg-[#B8D900]/25 text-[#4A4648]"
          : "text-[#716C70] hover:bg-[#F0F0F0] hover:text-[#4A4648]"
      }`}
    >
      {children}
    </button>
  );
}

/** Thin vertical divider between toolbar groups. */
function Sep() {
  return <div className="w-px h-5 bg-[#E5E5E5] mx-0.5" />;
}

export function RichTextToolbar({ editor }: ToolbarProps) {
  if (!editor) return null;

  /** Prompt user for a URL and set a link on the current selection. */
  const setLink = () => {
    const prev = editor.getAttributes("link").href || "";
    const url = window.prompt("URL:", prev);
    if (url === null) return; // cancelled
    if (url === "") {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url, target: "_blank" }).run();
    }
  };

  const ICO = "w-3.5 h-3.5";

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-1.5 py-1 border-b border-[#E5E5E5] bg-[#FAFAFA] rounded-t-lg">
      {/* Headings */}
      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="כותרת H2">
        <Heading2 className={ICO} />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="כותרת H3">
        <Heading3 className={ICO} />
      </Btn>

      <Sep />

      {/* Inline formatting */}
      <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="מודגש">
        <Bold className={ICO} />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="נטוי">
        <Italic className={ICO} />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="קו תחתון">
        <Underline className={ICO} />
      </Btn>

      <Sep />

      {/* Lists */}
      <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="רשימת תבליטים">
        <List className={ICO} />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="רשימה ממוספרת">
        <ListOrdered className={ICO} />
      </Btn>

      <Sep />

      {/* Alignment */}
      <Btn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="יישור לימין">
        <AlignRight className={ICO} />
      </Btn>
      <Btn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="יישור למרכז">
        <AlignCenter className={ICO} />
      </Btn>
      <Btn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="יישור לשמאל">
        <AlignLeft className={ICO} />
      </Btn>

      <Sep />

      {/* Link */}
      <Btn onClick={setLink} active={editor.isActive("link")} title="קישור">
        <Link2 className={ICO} />
      </Btn>

      <Sep />

      {/* Clear */}
      <Btn onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="נקה עיצוב">
        <RemoveFormatting className={ICO} />
      </Btn>
    </div>
  );
}
