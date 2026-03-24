"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import { createClient } from "@/lib/supabase/client";
import type { Page, PageSection, Language } from "@/lib/types/database";
import { SectionPalette, SECTION_TYPES } from "@/components/builder/section-palette";
import { SectionCanvas } from "@/components/builder/section-canvas";
import { SectionEditorPanel } from "@/components/builder/section-editors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  Eye,
  Globe,
  Loader2,
  ArrowRight,
  Check,
} from "lucide-react";

export default function PageBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const pageId = params.id as string;
  const supabase = createClient();

  const [page, setPage] = useState<Page | null>(null);
  const [sections, setSections] = useState<PageSection[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Load page data
  useEffect(() => {
    async function loadPage() {
      setLoading(true);
      const { data: pageData } = await supabase
        .from("pages")
        .select("*")
        .eq("id", pageId)
        .single();

      if (pageData) {
        setPage(pageData as Page);
        setTitleDraft(pageData.title_he || "");
      }

      const { data: sectionsData } = await supabase
        .from("page_sections")
        .select("*")
        .eq("page_id", pageId)
        .order("sort_order", { ascending: true });

      if (sectionsData) {
        setSections(sectionsData as PageSection[]);
      }
      setLoading(false);
    }
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  // Debounced save
  const debouncedSave = useCallback(
    (updatedSections: PageSection[]) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        setSaving(true);
        try {
          const upserts = updatedSections.map((s, i) => ({
            id: s.id,
            page_id: pageId,
            section_type: s.section_type,
            sort_order: i,
            is_visible: s.is_visible,
            content: s.content,
            styles: s.styles,
          }));

          await supabase.from("page_sections").upsert(upserts);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        } catch (err) {
          console.error("Save failed:", err);
        }
        setSaving(false);
      }, 800);
    },
    [pageId, supabase]
  );

  const updateSections = useCallback(
    (newSections: PageSection[]) => {
      setSections(newSections);
      debouncedSave(newSections);
    },
    [debouncedSave]
  );

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;

    if (!over) return;

    // Dragging from palette to canvas
    if (String(active.id).startsWith("palette-")) {
      const sectionType = active.data.current?.sectionType;
      if (!sectionType) return;

      const newSection: PageSection = {
        id: crypto.randomUUID(),
        page_id: pageId,
        section_type: sectionType,
        sort_order: sections.length,
        is_visible: true,
        content: getDefaultContent(sectionType),
        styles: null,
      };

      updateSections([...sections, newSection]);
      setSelectedSectionId(newSection.id);
      return;
    }

    // Reordering within canvas
    if (active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(sections, oldIndex, newIndex).map((s, i) => ({
          ...s,
          sort_order: i,
        }));
        updateSections(reordered);
      }
    }
  };

  const handleToggleVisibility = (id: string) => {
    updateSections(
      sections.map((s) => (s.id === id ? { ...s, is_visible: !s.is_visible } : s))
    );
  };

  const handleDuplicate = (id: string) => {
    const source = sections.find((s) => s.id === id);
    if (!source) return;
    const duplicate: PageSection = {
      ...source,
      id: crypto.randomUUID(),
      sort_order: sections.length,
    };
    updateSections([...sections, duplicate]);
  };

  const handleRemove = async (id: string) => {
    if (selectedSectionId === id) setSelectedSectionId(null);
    const updated = sections
      .filter((s) => s.id !== id)
      .map((s, i) => ({ ...s, sort_order: i }));
    setSections(updated);

    // Delete from DB
    await supabase.from("page_sections").delete().eq("id", id);
    debouncedSave(updated);
  };

  const handleContentChange = (sectionId: string, content: Record<string, unknown>) => {
    updateSections(
      sections.map((s) => (s.id === sectionId ? { ...s, content } : s))
    );
  };

  const handleSaveTitle = async () => {
    if (!page) return;
    await supabase
      .from("pages")
      .update({ title_he: titleDraft })
      .eq("id", pageId);
    setPage({ ...page, title_he: titleDraft });
    setEditingTitle(false);
  };

  const handlePublish = async () => {
    if (!page) return;
    setSaving(true);
    await supabase
      .from("pages")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", pageId);
    setPage({ ...page, status: "published", published_at: new Date().toISOString() });
    setSaving(false);
  };

  const handleSave = async () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaving(true);
    try {
      const upserts = sections.map((s, i) => ({
        id: s.id,
        page_id: pageId,
        section_type: s.section_type,
        sort_order: i,
        is_visible: s.is_visible,
        content: s.content,
        styles: s.styles,
      }));
      await supabase.from("page_sections").upsert(upserts);
      if (page) {
        await supabase.from("pages").update({ title_he: titleDraft || page.title_he }).eq("id", pageId);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Save failed:", err);
    }
    setSaving(false);
  };

  const selectedSection = sections.find((s) => s.id === selectedSectionId) || null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">Page not found</p>
        <Button variant="outline" onClick={() => router.push("/dashboard/pages")}>
          <ArrowRight className="w-4 h-4 mr-2" />
          Back to Pages
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/pages")}
          >
            <ArrowRight className="w-4 h-4" />
          </Button>

          {editingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                className="h-8 w-64"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") setEditingTitle(false);
                }}
              />
              <Button size="sm" variant="ghost" onClick={handleSaveTitle}>
                <Check className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
            >
              {page.title_he || "Untitled Page"}
            </button>
          )}

          <Badge
            variant={page.status === "published" ? "default" : "secondary"}
            className="text-[10px]"
          >
            {page.status}
          </Badge>

          <span className="text-xs text-muted-foreground">
            /{page.slug}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {saving && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> Saving...
            </span>
          )}
          {saved && !saving && (
            <span className="flex items-center gap-1.5 text-xs text-green-600">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/lp/${page.slug}`, "_blank")}
          >
            <Eye className="w-4 h-4 mr-1.5" />
            Preview
          </Button>

          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="w-4 h-4 mr-1.5" />
            Save
          </Button>

          <Button
            size="sm"
            onClick={handlePublish}
            disabled={page.status === "published"}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Globe className="w-4 h-4 mr-1.5" />
            Publish
          </Button>
        </div>
      </div>

      {/* Three-Panel Layout */}
      <div className="flex flex-1 min-h-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SectionPalette />

          <SectionCanvas
            sections={sections}
            selectedSectionId={selectedSectionId}
            onSelectSection={setSelectedSectionId}
            onToggleVisibility={handleToggleVisibility}
            onDuplicate={handleDuplicate}
            onRemove={handleRemove}
          />

          <DragOverlay>
            {activeDragId && String(activeDragId).startsWith("palette-") && (
              <div className="p-3 rounded-lg border border-primary bg-card shadow-lg opacity-80">
                <p className="text-sm font-medium">
                  {SECTION_TYPES.find(
                    (t) => `palette-${t.type}` === activeDragId
                  )?.label || "Section"}
                </p>
              </div>
            )}
          </DragOverlay>
        </DndContext>

        <SectionEditorPanel
          section={selectedSection}
          onContentChange={handleContentChange}
        />
      </div>
    </div>
  );
}

function getDefaultContent(type: string): Record<string, unknown> {
  switch (type) {
    case "hero":
      return {
        heading_he: "הקריה האקדמית אונו",
        subheading_he: "המכללה המומלצת בישראל",
        heading_en: "Ono Academic College",
        subheading_en: "Israel's most recommended college",
        cta_text_he: "השאירו פרטים",
        cta_text_en: "Leave your details",
        cta_url: "#form",
        stat_value: "50,000+",
        stat_label_he: "בוגרים מובילים",
        stat_label_en: "Leading graduates",
      };
    case "form":
      return {
        heading_he: "השאירו פרטים ונחזור אליכם",
        heading_en: "Leave your details",
        submit_text_he: "שלחו לי פרטים",
        submit_text_en: "Send me details",
        thank_you_message_he: "תודה! נציג יחזור אליך בהקדם",
        thank_you_message_en: "Thank you! We'll be in touch soon",
        fields: [
          { name: "full_name", type: "text", label_he: "שם מלא", label_en: "Full Name", required: true },
          { name: "phone", type: "tel", label_he: "טלפון", label_en: "Phone", required: true },
          { name: "email", type: "email", label_he: "אימייל", label_en: "Email", required: false },
        ],
      };
    case "faq":
      return { heading_he: "שאלות נפוצות", heading_en: "FAQ", items: [] };
    case "video":
      return { video_url: "", autoplay: false };
    case "stats":
      return { items: [] };
    case "testimonials":
      return { heading_he: "מה אומרים הסטודנטים", heading_en: "What students say", items: [] };
    case "cta":
      return {
        heading_he: "מוכנים להתחיל?",
        heading_en: "Ready to start?",
        button_text_he: "להרשמה",
        button_text_en: "Register Now",
        button_url: "#form",
      };
    case "whatsapp":
      return { phone: "", message_he: "היי, אשמח לקבל פרטים", tooltip_he: "דברו איתנו" };
    case "sticky_header":
      return {
        text_he: "הירשמו עכשיו!",
        text_en: "Register now!",
        button_text_he: "להרשמה",
        button_text_en: "Register",
        button_url: "#form",
        bg_color: "#B8D900",
      };
    case "accordion":
      return { heading_he: "", items: [] };
    case "gallery":
      return { heading_he: "", images: [] };
    case "curriculum":
      return { heading_he: "תוכנית הלימודים", heading_en: "Curriculum", semesters: [] };
    case "custom_html":
      return { html: "", css: "" };
    default:
      return {};
  }
}
