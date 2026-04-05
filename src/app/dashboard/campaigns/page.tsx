/**
 * Popups dashboard — full CRUD for managing popup campaigns and sticky CTA bars.
 * Supports creating from templates, editing, deleting, toggling active state,
 * and assigning campaigns to specific landing pages.
 * Uses a full-screen view for create/edit instead of a dialog.
 */
"use client";

import { Suspense, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  Eye,
  MousePointerClick,
  BarChart3,
  FileStack,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  ArrowRight,
  Search,
} from "lucide-react";
import { POPUP_TEMPLATES, TEMPLATE_GROUPS } from "@/lib/popup-templates";
import type {
  PopupCampaign,
  CampaignType,
  CampaignFrequency,
  PopupContent,
  StickyBarContent,
  ExitIntentTrigger,
  TimedTrigger,
  ScrollTrigger,
  StickyBarTrigger,
  PopupTemplate,
} from "@/lib/types/popup-campaigns";

/* ──────────────────────── Constants ──────────────────────── */

/** Human-readable labels for campaign types */
const CAMPAIGN_TYPE_LABELS: Record<CampaignType, string> = {
  exit_intent: "Exit Intent",
  timed: "פופאפ מתוזמן",
  scroll_triggered: "פופאפ גלילה",
  sticky_bar: "בר קבוע",
};

/** Badge colors for campaign type chips */
const CAMPAIGN_TYPE_COLORS: Record<CampaignType, { bg: string; text: string }> = {
  exit_intent: { bg: "bg-red-50", text: "text-red-700" },
  timed: { bg: "bg-amber-50", text: "text-amber-700" },
  scroll_triggered: { bg: "bg-blue-50", text: "text-blue-700" },
  sticky_bar: { bg: "bg-purple-50", text: "text-purple-700" },
};

/** Human-readable labels for frequency options */
const FREQUENCY_LABELS: Record<CampaignFrequency, string> = {
  once_per_session: "פעם בסשן",
  once_per_day: "פעם ביום",
  once_ever: "פעם אחת בלבד",
  every_visit: "בכל ביקור",
};

/** Sensitivity options for exit-intent triggers */
const SENSITIVITY_OPTIONS = [
  { value: "subtle", label: "נמוכה (subtle)" },
  { value: "medium", label: "בינונית (medium)" },
  { value: "aggressive", label: "גבוהה (aggressive)" },
] as const;

/** Default delay in seconds for timed popups */
const DEFAULT_DELAY_SECONDS = 15;
/** Default scroll percentage for scroll-triggered popups */
const DEFAULT_SCROLL_PERCENT = 50;
/** Default scroll pixels for sticky bar visibility */
const DEFAULT_STICKY_SCROLL_PX = 0;
/** Maximum delay in seconds for timed popups */
const MAX_DELAY_SECONDS = 120;
/** Maximum scroll percentage */
const MAX_SCROLL_PERCENT = 100;
/** Maximum scroll pixels for sticky bar */
const MAX_STICKY_SCROLL_PX = 2000;
/** Step size for slider-style range inputs */
const RANGE_STEP = 5;

/** View states for the full-screen create/edit flow */
type ViewState = "list" | "create_step1" | "create_step2" | "edit";

/** Minimal page record for the assignment picker */
interface PageRecord {
  id: string;
  title_he: string;
  slug: string;
}

/** Campaign with client-side computed assignment count */
interface CampaignWithCount extends PopupCampaign {
  pages_count: number;
}

/* ──────────────────────── Filter Tabs ──────────────────────── */

/** Filter tab definitions including the "all" option */
const FILTER_TABS: { value: CampaignType | "all"; label: string }[] = [
  { value: "all", label: "הכל" },
  { value: "exit_intent", label: "Exit Intent" },
  { value: "timed", label: "פופאפ מתוזמן" },
  { value: "scroll_triggered", label: "פופאפ גלילה" },
  { value: "sticky_bar", label: "בר קבוע" },
];

/* ──────────────────────── Helpers ──────────────────────── */

/**
 * Build default popup content from a template or blank defaults.
 * @param type - campaign type
 * @param template - optional template to copy content from
 * @returns content object matching PopupContent or StickyBarContent
 */
function buildDefaultContent(
  type: CampaignType,
  template?: PopupTemplate
): PopupContent | StickyBarContent {
  if (template) return { ...template.content };

  if (type === "sticky_bar") {
    return {
      text_he: "",
      cta_text_he: "להרשמה",
      phone_number: "",
      bg_color: "#2a2628",
      accent_color: "#B8D900",
      show_phone: false,
      position: "bottom",
    } satisfies StickyBarContent;
  }

  return {
    title_he: "",
    body_he: "",
    cta_text_he: "",
    dismiss_text_he: "לא תודה",
    bg_color: "#ffffff",
    accent_color: "#B8D900",
    include_form: false,
  } satisfies PopupContent;
}

/**
 * Build default trigger config for a given campaign type.
 * @param type - campaign type
 * @param template - optional template to copy trigger from
 * @returns trigger config object
 */
function buildDefaultTrigger(
  type: CampaignType,
  template?: PopupTemplate
): ExitIntentTrigger | TimedTrigger | ScrollTrigger | StickyBarTrigger {
  if (template) return { ...template.trigger_config };

  switch (type) {
    case "exit_intent":
      return { sensitivity: "medium" } satisfies ExitIntentTrigger;
    case "timed":
      return { delay_seconds: DEFAULT_DELAY_SECONDS } satisfies TimedTrigger;
    case "scroll_triggered":
      return { scroll_percent: DEFAULT_SCROLL_PERCENT } satisfies ScrollTrigger;
    case "sticky_bar":
      return { show_after_scroll_px: DEFAULT_STICKY_SCROLL_PX } satisfies StickyBarTrigger;
  }
}

/**
 * Checks if content is a popup overlay (not sticky bar).
 * @param type - campaign type
 * @returns true if the campaign uses PopupContent
 */
function isPopupType(type: CampaignType): boolean {
  return type !== "sticky_bar";
}

/* ══════════════════════════════════════════════════════════════
   Main Page Component
   ══════════════════════════════════════════════════════════════ */

/**
 * PopupsPage — dashboard page for managing popup campaigns.
 * Uses a state-based view system: list, create_step1 (template picker),
 * create_step2 (customize form), and edit (full-screen edit form).
 */
/** Wrapper with Suspense boundary for useSearchParams */
export default function CampaignsPageWrapper() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm text-[#9A969A]">טוען...</div>}>
      <CampaignsPage />
    </Suspense>
  );
}

function CampaignsPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();

  /** Track whether we already handled ?action=create&page_id=X from URL */
  const handledUrlCreate = useRef(false);

  /* ── View state ── */
  const [view, setView] = useState<ViewState>("list");

  /* ── List state ── */
  const [campaigns, setCampaigns] = useState<CampaignWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<CampaignType | "all">("all");

  /* ── Form state ── */
  const [editTarget, setEditTarget] = useState<CampaignWithCount | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  /* ── Delete dialog state ── */
  const [deleteTarget, setDeleteTarget] = useState<CampaignWithCount | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ── Form fields ── */
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<CampaignType>("exit_intent");
  const [formTemplateId, setFormTemplateId] = useState<string | null>(null);
  const [formContent, setFormContent] = useState<PopupContent | StickyBarContent>(
    buildDefaultContent("exit_intent")
  );
  const [formTrigger, setFormTrigger] = useState<
    ExitIntentTrigger | TimedTrigger | ScrollTrigger | StickyBarTrigger
  >(buildDefaultTrigger("exit_intent"));
  const [formFrequency, setFormFrequency] = useState<CampaignFrequency>("once_per_session");
  const [formMobile, setFormMobile] = useState(true);
  const [formDesktop, setFormDesktop] = useState(true);
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");

  /* ── Page assignment state ── */
  const [allPages, setAllPages] = useState<PageRecord[]>([]);
  const [assignedPageIds, setAssignedPageIds] = useState<Set<string>>(new Set());
  const [loadingPages, setLoadingPages] = useState(false);
  const [pageSearchQuery, setPageSearchQuery] = useState("");

  /* ── Toggling active inline ── */
  const [togglingId, setTogglingId] = useState<string | null>(null);

  /* ────────────────────── Data Loading ────────────────────── */

  /**
   * Fetch all campaigns from the database and merge assignment counts.
   * Campaigns and assignments are fetched separately, then merged client-side.
   */
  const loadCampaigns = useCallback(async () => {
    setLoading(true);

    const { data: campaignsData, error: campaignsError } = await supabase
      .from("popup_campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    /* Table may not exist yet in this environment — treat as empty */
    if (campaignsError) {
      console.warn("[campaigns] table not available:", campaignsError.message);
      setLoading(false);
      return;
    }

    if (campaignsData) {
      const { data: assignmentsData } = await supabase
        .from("page_popup_assignments")
        .select("campaign_id");

      /* Build a count map: campaign_id -> number of assigned pages */
      const countMap: Record<string, number> = {};
      for (const row of assignmentsData || []) {
        countMap[row.campaign_id] = (countMap[row.campaign_id] || 0) + 1;
      }

      setCampaigns(
        (campaignsData as PopupCampaign[]).map((c) => ({
          ...c,
          pages_count: countMap[c.id] || 0,
        }))
      );
    }

    setLoading(false);
  }, [supabase]);

  /**
   * Fetch all pages for the assignment picker inside the create/edit form.
   */
  const loadPages = useCallback(async () => {
    setLoadingPages(true);
    const { data } = await supabase
      .from("pages")
      .select("id, title_he, slug")
      .order("title_he");

    if (data) setAllPages(data as PageRecord[]);
    setLoadingPages(false);
  }, [supabase]);

  /**
   * Fetch currently assigned page IDs for a specific campaign.
   * @param campaignId - the campaign to load assignments for
   */
  const loadAssignments = useCallback(
    async (campaignId: string) => {
      const { data } = await supabase
        .from("page_popup_assignments")
        .select("page_id")
        .eq("campaign_id", campaignId);

      if (data) {
        setAssignedPageIds(new Set(data.map((r) => r.page_id)));
      }
    },
    [supabase]
  );

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  /**
   * Handle URL params: ?action=create&page_id=X opens the create flow
   * with the given page auto-selected in the assignment list.
   */
  useEffect(() => {
    if (handledUrlCreate.current || loading) return;
    const action = searchParams.get("action");
    const preselectedPageId = searchParams.get("page_id");
    if (action === "create") {
      handledUrlCreate.current = true;
      // Reset form and go to template picker
      setEditTarget(null);
      setFormName("");
      setFormType("exit_intent");
      setFormTemplateId(null);
      setFormContent(buildDefaultContent("exit_intent"));
      setFormTrigger(buildDefaultTrigger("exit_intent"));
      setFormFrequency("once_per_session");
      setFormMobile(true);
      setFormDesktop(true);
      setFormStartDate("");
      setFormEndDate("");
      setPageSearchQuery("");
      setSaveError("");
      // Pre-select the page if provided
      if (preselectedPageId) {
        setAssignedPageIds(new Set([preselectedPageId]));
      } else {
        setAssignedPageIds(new Set());
      }
      setView("create_step1");
      loadPages();
    }
  }, [loading, searchParams, loadPages]);

  /* ────────────────────── Filtered lists ────────────────────── */

  /** Campaigns filtered by the currently active type tab */
  const filteredCampaigns = useMemo(() => {
    if (activeFilter === "all") return campaigns;
    return campaigns.filter((c) => c.campaign_type === activeFilter);
  }, [campaigns, activeFilter]);

  /** Pages filtered by the search query (matches title or slug) */
  const filteredPages = useMemo(() => {
    if (!pageSearchQuery.trim()) return allPages;
    const q = pageSearchQuery.trim().toLowerCase();
    return allPages.filter(
      (page) =>
        (page.title_he || "").toLowerCase().includes(q) ||
        (page.slug || "").toLowerCase().includes(q)
    );
  }, [allPages, pageSearchQuery]);

  /* ────────────────────── Stats ────────────────────── */

  /** Summary stats computed from all campaigns */
  const stats = useMemo(() => {
    const total = campaigns.length;
    const active = campaigns.filter((c) => c.is_active).length;
    const views = campaigns.reduce((sum, c) => sum + (c.views_count || 0), 0);
    const conversions = campaigns.reduce((sum, c) => sum + (c.conversions_count || 0), 0);
    return { total, active, views, conversions };
  }, [campaigns]);

  /* ────────────────────── Navigation Helpers ────────────────────── */

  /**
   * Navigate to the create flow at the template picker step.
   */
  const openCreate = () => {
    setEditTarget(null);
    setFormName("");
    setFormType("exit_intent");
    setFormTemplateId(null);
    setFormContent(buildDefaultContent("exit_intent"));
    setFormTrigger(buildDefaultTrigger("exit_intent"));
    setFormFrequency("once_per_session");
    setFormMobile(true);
    setFormDesktop(true);
    setFormStartDate("");
    setFormEndDate("");
    setAssignedPageIds(new Set());
    setPageSearchQuery("");
    setSaveError("");
    setView("create_step1");
    loadPages();
  };

  /**
   * Select a template and advance to the customize step.
   * @param template - the chosen template from the picker grid
   */
  const selectTemplate = (template: PopupTemplate) => {
    setFormType(template.campaign_type);
    setFormTemplateId(template.id);
    setFormName(template.name_he);
    setFormContent(buildDefaultContent(template.campaign_type, template));
    setFormTrigger(buildDefaultTrigger(template.campaign_type, template));
    setView("create_step2");
  };

  /**
   * Navigate to the edit form pre-filled with an existing campaign's data.
   * @param campaign - the campaign to edit
   */
  const openEdit = (campaign: CampaignWithCount) => {
    setEditTarget(campaign);
    setFormName(campaign.name);
    setFormType(campaign.campaign_type);
    setFormTemplateId(campaign.template_id);
    setFormContent({ ...(campaign.content as PopupContent | StickyBarContent) });
    setFormTrigger({ ...campaign.trigger_config });
    setFormFrequency(campaign.frequency);
    setFormMobile(campaign.show_on_mobile);
    setFormDesktop(campaign.show_on_desktop);
    setFormStartDate(campaign.start_date || "");
    setFormEndDate(campaign.end_date || "");
    setPageSearchQuery("");
    setSaveError("");
    setView("edit");
    loadPages();
    loadAssignments(campaign.id);
  };

  /**
   * Navigate back to the list view, resetting form state.
   */
  const goBackToList = () => {
    setView("list");
    setEditTarget(null);
    setSaveError("");
    setPageSearchQuery("");
  };

  /* ────────────────────── Save ────────────────────── */

  /**
   * Persist the campaign (insert or update) and sync page assignments.
   * On success, navigates back to the list and reloads campaigns.
   */
  const handleSave = async () => {
    if (!formName.trim()) {
      setSaveError("יש להזין שם לפופאפ");
      return;
    }
    setSaving(true);
    setSaveError("");

    const payload = {
      name: formName.trim(),
      campaign_type: formType,
      template_id: formTemplateId,
      content: formContent,
      trigger_config: formTrigger,
      frequency: formFrequency,
      show_on_mobile: formMobile,
      show_on_desktop: formDesktop,
      start_date: formStartDate || null,
      end_date: formEndDate || null,
    };

    let campaignId: string | null = null;

    if (editTarget) {
      /* Update existing campaign */
      const { error } = await supabase
        .from("popup_campaigns")
        .update(payload)
        .eq("id", editTarget.id);

      if (error) {
        console.error("[popups] update error:", error);
        setSaveError(`שגיאה בעדכון: ${error.message || error.code}`);
        setSaving(false);
        return;
      }
      campaignId = editTarget.id;
    } else {
      /* Insert new campaign */
      const { data, error } = await supabase
        .from("popup_campaigns")
        .insert(payload)
        .select("id")
        .single();

      if (error || !data) {
        console.error("[popups] insert error:", error);
        setSaveError(`שגיאה ביצירה: ${error?.message || error?.code || "unknown"}`);
        setSaving(false);
        return;
      }
      campaignId = data.id;
    }

    /* Sync page assignments — delete all existing, then insert new set */
    if (campaignId) {
      await supabase
        .from("page_popup_assignments")
        .delete()
        .eq("campaign_id", campaignId);

      const newAssignments = Array.from(assignedPageIds).map((pageId) => ({
        page_id: pageId,
        campaign_id: campaignId!,
      }));

      if (newAssignments.length > 0) {
        const { error: assignError } = await supabase
          .from("page_popup_assignments")
          .insert(newAssignments);

        if (assignError) {
          console.error("[popups] assignment sync error:", assignError);
        }
      }
    }

    setSaving(false);
    goBackToList();
    loadCampaigns();
  };

  /* ────────────────────── Delete ────────────────────── */

  /**
   * Delete the selected campaign and all its page assignments.
   */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    /* Remove assignments first, then the campaign itself */
    await supabase
      .from("page_popup_assignments")
      .delete()
      .eq("campaign_id", deleteTarget.id);

    await supabase
      .from("popup_campaigns")
      .delete()
      .eq("id", deleteTarget.id);

    setDeleteTarget(null);
    setDeleting(false);
    loadCampaigns();
  };

  /* ────────────────────── Toggle Active ────────────────────── */

  /**
   * Toggle a campaign's is_active flag inline from the card view.
   * @param campaign - the campaign to toggle
   */
  const toggleActive = async (campaign: CampaignWithCount) => {
    setTogglingId(campaign.id);
    const newValue = !campaign.is_active;

    const { error } = await supabase
      .from("popup_campaigns")
      .update({ is_active: newValue })
      .eq("id", campaign.id);

    if (!error) {
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaign.id ? { ...c, is_active: newValue } : c))
      );
    }
    setTogglingId(null);
  };

  /* ────────────────────── Page Assignment Toggle ────────────────────── */

  /**
   * Toggle a single page assignment on/off in the form.
   * @param pageId - the page to toggle
   */
  const togglePageAssignment = (pageId: string) => {
    setAssignedPageIds((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      return next;
    });
  };

  /* ────────────────────── Content Field Updater ────────────────────── */

  /**
   * Update a single field inside the content object.
   * @param key - field name
   * @param value - new value
   */
  const updateContent = (key: string, value: unknown) => {
    setFormContent((prev) => ({ ...prev, [key]: value }));
  };

  /**
   * Update a single field inside the trigger config object.
   * @param key - field name
   * @param value - new value
   */
  const updateTrigger = (key: string, value: unknown) => {
    setFormTrigger((prev) => ({ ...prev, [key]: value }));
  };

  /* ══════════════════════════════════════════════════════════════
     Render
     ══════════════════════════════════════════════════════════════ */

  /* ── Full-screen: Template Picker (Step 1) ── */
  if (view === "create_step1") {
    return (
      <div className="min-h-screen bg-[#f3f4f6]">
        <div className="max-w-4xl mx-auto p-8" dir="rtl">
          {/* Back button */}
          <button
            onClick={goBackToList}
            className="flex items-center gap-1.5 text-sm text-[#9A969A] hover:text-[#2A2628] transition-colors mb-6"
          >
            <ArrowRight className="w-4 h-4" />
            חזרה לרשימה
          </button>

          {/* Page title */}
          <h1 className="text-xl font-bold text-[#2A2628] mb-8">בחרו תבנית לפופאפ</h1>

          {/* Template groups */}
          <div className="space-y-8">
            {TEMPLATE_GROUPS.map((group) => {
              const templates = POPUP_TEMPLATES.filter(
                (t) => t.campaign_type === group.type
              );
              return (
                <div key={group.type}>
                  <h3 className="text-sm font-semibold text-[#2A2628] mb-1">
                    {group.label_he}
                  </h3>
                  <p className="text-xs text-[#9A969A] mb-3">{group.description_he}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {templates.map((tmpl) => (
                      <button
                        key={tmpl.id}
                        onClick={() => selectTemplate(tmpl)}
                        className="text-right p-5 rounded-xl border border-[#E5E5E5] bg-white hover:border-[#B8D900] hover:shadow-md transition-all group"
                      >
                        <span className="text-2xl block mb-2">{tmpl.icon}</span>
                        <span className="text-sm font-medium text-[#2A2628] block">
                          {tmpl.name_he}
                        </span>
                        <span className="text-xs text-[#9A969A] block mt-1 leading-relaxed">
                          {tmpl.description_he}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ── Full-screen: Customize Form (Step 2 / Edit) ── */
  if (view === "create_step2" || view === "edit") {
    const isEditing = view === "edit";
    const pageTitle = isEditing ? "עריכת פופאפ" : "יצירת פופאפ חדש";

    return (
      <div className="min-h-screen bg-[#f3f4f6]">
        <div className="max-w-4xl mx-auto p-8" dir="rtl">
          {/* Back button */}
          <button
            onClick={isEditing ? goBackToList : () => setView("create_step1")}
            className="flex items-center gap-1.5 text-sm text-[#9A969A] hover:text-[#2A2628] transition-colors mb-6"
          >
            <ArrowRight className="w-4 h-4" />
            {isEditing ? "חזרה לרשימה" : "חזרה לבחירת תבנית"}
          </button>

          {/* Page title */}
          <h1 className="text-xl font-bold text-[#2A2628] mb-8">{pageTitle}</h1>

          <div className="space-y-6">
            {/* Campaign Name */}
            <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
              <FieldGroup label="שם פופאפ (פנימי)">
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="למשל: Exit Intent — הזדמנות אחרונה"
                  dir="rtl"
                />
              </FieldGroup>
            </div>

            {/* ── Content Fields ── */}
            <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 space-y-5">
              <h4 className="text-sm font-semibold text-[#2A2628]">תוכן</h4>

              {isPopupType(formType) ? (
                /* Popup content fields */
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FieldGroup label="כותרת">
                      <Input
                        value={(formContent as PopupContent).title_he || ""}
                        onChange={(e) => updateContent("title_he", e.target.value)}
                        dir="rtl"
                        placeholder="כותרת הפופאפ"
                      />
                    </FieldGroup>
                    <FieldGroup label="טקסט כפתור CTA">
                      <Input
                        value={(formContent as PopupContent).cta_text_he || ""}
                        onChange={(e) => updateContent("cta_text_he", e.target.value)}
                        dir="rtl"
                        placeholder="כן, אני רוצה"
                      />
                    </FieldGroup>
                  </div>
                  <FieldGroup label="גוף הטקסט">
                    <Textarea
                      value={(formContent as PopupContent).body_he || ""}
                      onChange={(e) => updateContent("body_he", e.target.value)}
                      dir="rtl"
                      placeholder="טקסט ההסבר"
                      rows={3}
                    />
                  </FieldGroup>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FieldGroup label="טקסט סגירה">
                      <Input
                        value={(formContent as PopupContent).dismiss_text_he || ""}
                        onChange={(e) => updateContent("dismiss_text_he", e.target.value)}
                        dir="rtl"
                        placeholder="לא תודה"
                      />
                    </FieldGroup>
                    <div className="flex items-end pb-1">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={(formContent as PopupContent).include_form || false}
                          onCheckedChange={(val) => updateContent("include_form", val)}
                        />
                        <Label className="text-sm">כלול טופס ליד בתוך הפופאפ</Label>
                      </div>
                    </div>
                  </div>

                  {/* ── Media ── */}
                  <div className="border-t border-[#E5E5E5] pt-5 space-y-4">
                    <h5 className="text-xs font-semibold text-[#9A969A] uppercase tracking-wide">מדיה</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FieldGroup label="סוג מדיה">
                        <select
                          value={(formContent as PopupContent).media_type || "none"}
                          onChange={(e) => updateContent("media_type", e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                          dir="rtl"
                        >
                          <option value="none">ללא</option>
                          <option value="image">תמונה</option>
                          <option value="video">וידאו (YouTube / Vimeo)</option>
                        </select>
                      </FieldGroup>
                      <FieldGroup label="מיקום מדיה">
                        <select
                          value={(formContent as PopupContent).media_position || "top"}
                          onChange={(e) => updateContent("media_position", e.target.value)}
                          disabled={(formContent as PopupContent).media_type === "none" || !(formContent as PopupContent).media_type}
                          className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm disabled:opacity-40"
                          dir="rtl"
                        >
                          <option value="top">למעלה</option>
                          <option value="side">בצד (תמונה + טקסט)</option>
                          <option value="background">רקע מלא</option>
                        </select>
                      </FieldGroup>
                      <FieldGroup label="WhatsApp / חלון">
                        <div className="flex items-center gap-3 h-10">
                          <Switch
                            checked={(formContent as PopupContent).whatsapp_action || false}
                            onCheckedChange={(val) => updateContent("whatsapp_action", val)}
                          />
                          <Label className="text-sm">CTA פותח WhatsApp</Label>
                        </div>
                      </FieldGroup>
                    </div>
                    {(formContent as PopupContent).media_type && (formContent as PopupContent).media_type !== "none" && (
                      <FieldGroup label={(formContent as PopupContent).media_type === "video" ? "כתובת YouTube / Vimeo" : "תמונת פופאפ"}>
                        {(formContent as PopupContent).media_type === "image" ? (
                          <ImageUploadField
                            value={(formContent as PopupContent).media_url || ""}
                            onChange={(url) => updateContent("media_url", url)}
                            recommendedSize={
                              (formContent as PopupContent).media_position === "background"
                                ? "1200×800"
                                : (formContent as PopupContent).media_position === "side"
                                  ? "600×400"
                                  : "800×450"
                            }
                            hint={
                              (formContent as PopupContent).media_position === "background"
                                ? "רקע מלא · 3:2"
                                : (formContent as PopupContent).media_position === "side"
                                  ? "תמונה בצד · 3:2"
                                  : "מעל הטקסט · 16:9"
                            }
                            previewAspect={
                              (formContent as PopupContent).media_position === "background"
                                ? "aspect-[3/2]"
                                : "aspect-video"
                            }
                          />
                        ) : (
                          <Input
                            value={(formContent as PopupContent).media_url || ""}
                            onChange={(e) => updateContent("media_url", e.target.value)}
                            dir="ltr"
                            placeholder="https://youtube.com/watch?v=... או https://vimeo.com/..."
                          />
                        )}
                      </FieldGroup>
                    )}
                  </div>

                  {/* ── Engagement elements ── */}
                  <div className="border-t border-[#E5E5E5] pt-5 space-y-4">
                    <h5 className="text-xs font-semibold text-[#9A969A] uppercase tracking-wide">אלמנטים מתקדמים</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FieldGroup label="ספירה לאחור (תאריך סיום)">
                        <Input
                          type="datetime-local"
                          value={(formContent as PopupContent).countdown_end?.slice(0, 16) || ""}
                          onChange={(e) => updateContent("countdown_end", e.target.value ? new Date(e.target.value).toISOString() : null)}
                          className="text-sm"
                        />
                      </FieldGroup>
                      <FieldGroup label="הוכחה חברתית (Social Proof)">
                        <Input
                          value={(formContent as PopupContent).social_proof_text || ""}
                          onChange={(e) => updateContent("social_proof_text", e.target.value)}
                          dir="rtl"
                          placeholder="כבר 47 אנשים נרשמו השבוע"
                        />
                      </FieldGroup>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FieldGroup label="דירוג כוכבים (0–5)">
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={5}
                            step={0.1}
                            value={(formContent as PopupContent).rating?.score ?? ""}
                            onChange={(e) => {
                              const score = parseFloat(e.target.value);
                              const count = (formContent as PopupContent).rating?.count || 0;
                              updateContent("rating", e.target.value ? { score: Math.min(5, Math.max(0, score)), count } : null);
                            }}
                            placeholder="4.8"
                            className="w-24"
                          />
                          <Input
                            type="number"
                            min={0}
                            value={(formContent as PopupContent).rating?.count ?? ""}
                            onChange={(e) => {
                              const count = parseInt(e.target.value) || 0;
                              const score = (formContent as PopupContent).rating?.score || 5;
                              updateContent("rating", e.target.value ? { score, count } : null);
                            }}
                            placeholder="ביקורות (מס׳)"
                          />
                        </div>
                      </FieldGroup>
                      <div className="flex items-end pb-1">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={(formContent as PopupContent).confetti_on_submit || false}
                            onCheckedChange={(val) => updateContent("confetti_on_submit", val)}
                          />
                          <Label className="text-sm">קונפטי בשליחת טופס</Label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Mobile variant ── */}
                  <div className="border-t border-[#E5E5E5] pt-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-semibold text-[#9A969A] uppercase tracking-wide">גרסת מובייל (שונה מדסקטופ)</h5>
                      <span className="text-[10px] text-[#9A969A]">שאר השדות יורשים מהדסקטופ</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FieldGroup label="כותרת מובייל">
                        <Input
                          value={(formContent as PopupContent).mobile_override?.title_he || ""}
                          onChange={(e) => updateContent("mobile_override", {
                            ...(formContent as PopupContent).mobile_override,
                            title_he: e.target.value || undefined,
                          })}
                          dir="rtl"
                          placeholder="(כמו דסקטופ)"
                        />
                      </FieldGroup>
                      <FieldGroup label="CTA מובייל">
                        <Input
                          value={(formContent as PopupContent).mobile_override?.cta_text_he || ""}
                          onChange={(e) => updateContent("mobile_override", {
                            ...(formContent as PopupContent).mobile_override,
                            cta_text_he: e.target.value || undefined,
                          })}
                          dir="rtl"
                          placeholder="(כמו דסקטופ)"
                        />
                      </FieldGroup>
                    </div>
                    <FieldGroup label="גוף טקסט מובייל">
                      <Textarea
                        value={(formContent as PopupContent).mobile_override?.body_he || ""}
                        onChange={(e) => updateContent("mobile_override", {
                          ...(formContent as PopupContent).mobile_override,
                          body_he: e.target.value || undefined,
                        })}
                        dir="rtl"
                        placeholder="(כמו דסקטופ)"
                        rows={2}
                      />
                    </FieldGroup>
                    <FieldGroup label="תמונה מובייל">
                      <ImageUploadField
                        value={(formContent as PopupContent).mobile_override?.media_url || ""}
                        onChange={(url) => updateContent("mobile_override", {
                          ...(formContent as PopupContent).mobile_override,
                          media_url: url || undefined,
                        })}
                        recommendedSize="390×500"
                        hint="פורטרט · 4:5 למובייל"
                        previewAspect="aspect-[4/3]"
                        placeholder="(ישתמש בתמונת דסקטופ)"
                      />
                    </FieldGroup>
                    <FieldGroup label="הוכחה חברתית מובייל">
                      <Input
                        value={(formContent as PopupContent).mobile_override?.social_proof_text || ""}
                        onChange={(e) => updateContent("mobile_override", {
                          ...(formContent as PopupContent).mobile_override,
                          social_proof_text: e.target.value || undefined,
                        })}
                        dir="rtl"
                        placeholder="(כמו דסקטופ)"
                      />
                    </FieldGroup>
                  </div>
                </>
              ) : (
                /* Sticky bar content fields */
                <>
                  <FieldGroup label="טקסט הבר">
                    <Input
                      value={(formContent as StickyBarContent).text_he || ""}
                      onChange={(e) => updateContent("text_he", e.target.value)}
                      dir="rtl"
                      placeholder="ההרשמה פתוחה!"
                    />
                  </FieldGroup>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FieldGroup label="טקסט כפתור CTA">
                      <Input
                        value={(formContent as StickyBarContent).cta_text_he || ""}
                        onChange={(e) => updateContent("cta_text_he", e.target.value)}
                        dir="rtl"
                        placeholder="להרשמה"
                      />
                    </FieldGroup>
                    <FieldGroup label="מספר טלפון">
                      <Input
                        value={(formContent as StickyBarContent).phone_number || ""}
                        onChange={(e) => updateContent("phone_number", e.target.value)}
                        dir="ltr"
                        placeholder="*2899"
                      />
                    </FieldGroup>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={(formContent as StickyBarContent).show_phone || false}
                      onCheckedChange={(val) => updateContent("show_phone", val)}
                    />
                    <Label className="text-sm">הצג מספר טלפון</Label>
                  </div>
                  <FieldGroup label="מיקום הבר">
                    <select
                      value={(formContent as StickyBarContent).position || "bottom"}
                      onChange={(e) => updateContent("position", e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                      dir="rtl"
                    >
                      <option value="top">למעלה</option>
                      <option value="bottom">למטה</option>
                    </select>
                  </FieldGroup>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldGroup label="הוכחה חברתית (Social Proof)">
                      <Input
                        value={(formContent as StickyBarContent).social_proof_text || ""}
                        onChange={(e) => updateContent("social_proof_text", e.target.value)}
                        dir="rtl"
                        placeholder="כבר 47 אנשים נרשמו"
                      />
                    </FieldGroup>
                    <FieldGroup label="ספירה לאחור (תאריך סיום)">
                      <Input
                        type="datetime-local"
                        value={(formContent as StickyBarContent).countdown_end?.slice(0, 16) || ""}
                        onChange={(e) => updateContent("countdown_end", e.target.value ? new Date(e.target.value).toISOString() : null)}
                        className="text-sm"
                      />
                    </FieldGroup>
                  </div>
                </>
              )}

              {/* Color inputs — shared by all types */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FieldGroup label="צבע רקע">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={(formContent as PopupContent).bg_color || "#ffffff"}
                      onChange={(e) => updateContent("bg_color", e.target.value)}
                      className="w-8 h-8 rounded border border-[#E5E5E5] cursor-pointer"
                    />
                    <Input
                      value={(formContent as PopupContent).bg_color || "#ffffff"}
                      onChange={(e) => updateContent("bg_color", e.target.value)}
                      dir="ltr"
                      className="flex-1"
                    />
                  </div>
                </FieldGroup>
                <FieldGroup label="צבע הדגשה">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={(formContent as PopupContent).accent_color || "#B8D900"}
                      onChange={(e) => updateContent("accent_color", e.target.value)}
                      className="w-8 h-8 rounded border border-[#E5E5E5] cursor-pointer"
                    />
                    <Input
                      value={(formContent as PopupContent).accent_color || "#B8D900"}
                      onChange={(e) => updateContent("accent_color", e.target.value)}
                      dir="ltr"
                      className="flex-1"
                    />
                  </div>
                </FieldGroup>
              </div>
            </div>

            {/* ── Trigger Config ── */}
            <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 space-y-5">
              <h4 className="text-sm font-semibold text-[#2A2628]">הפעלה (Trigger)</h4>

              {formType === "exit_intent" && (
                <FieldGroup label="רגישות">
                  <select
                    value={(formTrigger as ExitIntentTrigger).sensitivity || "medium"}
                    onChange={(e) => updateTrigger("sensitivity", e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                    dir="rtl"
                  >
                    {SENSITIVITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </FieldGroup>
              )}

              {formType === "timed" && (
                <FieldGroup label={`השהיה: ${(formTrigger as TimedTrigger).delay_seconds || DEFAULT_DELAY_SECONDS} שניות`}>
                  <input
                    type="range"
                    min={0}
                    max={MAX_DELAY_SECONDS}
                    step={RANGE_STEP}
                    value={(formTrigger as TimedTrigger).delay_seconds || DEFAULT_DELAY_SECONDS}
                    onChange={(e) => updateTrigger("delay_seconds", Number(e.target.value))}
                    className="w-full accent-[#B8D900]"
                  />
                  <div className="flex justify-between text-xs text-[#9A969A]">
                    <span>0 שניות</span>
                    <span>{MAX_DELAY_SECONDS} שניות</span>
                  </div>
                </FieldGroup>
              )}

              {formType === "scroll_triggered" && (
                <FieldGroup label={`אחוז גלילה: ${(formTrigger as ScrollTrigger).scroll_percent || DEFAULT_SCROLL_PERCENT}%`}>
                  <input
                    type="range"
                    min={0}
                    max={MAX_SCROLL_PERCENT}
                    step={RANGE_STEP}
                    value={(formTrigger as ScrollTrigger).scroll_percent || DEFAULT_SCROLL_PERCENT}
                    onChange={(e) => updateTrigger("scroll_percent", Number(e.target.value))}
                    className="w-full accent-[#B8D900]"
                  />
                  <div className="flex justify-between text-xs text-[#9A969A]">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </FieldGroup>
              )}

              {formType === "sticky_bar" && (
                <FieldGroup label="הצג לאחר גלילה (פיקסלים)">
                  <Input
                    type="number"
                    min={0}
                    max={MAX_STICKY_SCROLL_PX}
                    value={(formTrigger as StickyBarTrigger).show_after_scroll_px ?? DEFAULT_STICKY_SCROLL_PX}
                    onChange={(e) => updateTrigger("show_after_scroll_px", Number(e.target.value))}
                    dir="ltr"
                    placeholder="0"
                  />
                  <p className="text-xs text-[#9A969A]">0 = מיידי, ללא גלילה</p>
                </FieldGroup>
              )}
            </div>

            {/* ── Frequency & Display ── */}
            <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 space-y-5">
              <h4 className="text-sm font-semibold text-[#2A2628]">תצוגה ותדירות</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FieldGroup label="תדירות הצגה">
                  <select
                    value={formFrequency}
                    onChange={(e) => setFormFrequency(e.target.value as CampaignFrequency)}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                    dir="rtl"
                  >
                    {(Object.keys(FREQUENCY_LABELS) as CampaignFrequency[]).map((f) => (
                      <option key={f} value={f}>
                        {FREQUENCY_LABELS[f]}
                      </option>
                    ))}
                  </select>
                </FieldGroup>

                <div className="flex items-end gap-6 pb-1">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={formDesktop}
                      onCheckedChange={(val) => setFormDesktop(!!val)}
                    />
                    <Label className="text-sm">דסקטופ</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={formMobile}
                      onCheckedChange={(val) => setFormMobile(!!val)}
                    />
                    <Label className="text-sm">מובייל</Label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FieldGroup label="תאריך התחלה">
                  <Input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    dir="ltr"
                  />
                </FieldGroup>
                <FieldGroup label="תאריך סיום">
                  <Input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    dir="ltr"
                  />
                </FieldGroup>
              </div>
            </div>

            {/* ── Page Assignment ── */}
            <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 space-y-4">
              <h4 className="text-sm font-semibold text-[#2A2628]">
                שיוך לעמודים ({assignedPageIds.size} נבחרו)
              </h4>

              {/* Search input for filtering pages */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A969A]" />
                <Input
                  value={pageSearchQuery}
                  onChange={(e) => setPageSearchQuery(e.target.value)}
                  placeholder="חיפוש לפי שם עמוד או slug..."
                  dir="rtl"
                  className="pr-9"
                />
              </div>

              {loadingPages ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-[#9A969A]" />
                </div>
              ) : allPages.length === 0 ? (
                <p className="text-sm text-[#9A969A]">לא נמצאו עמודים</p>
              ) : filteredPages.length === 0 ? (
                <p className="text-sm text-[#9A969A]">לא נמצאו עמודים התואמים לחיפוש</p>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {filteredPages.map((page) => {
                    const isAssigned = assignedPageIds.has(page.id);
                    return (
                      <button
                        key={page.id}
                        onClick={() => togglePageAssignment(page.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-right transition-colors ${
                          isAssigned
                            ? "bg-[#B8D900]/10 text-[#2A2628]"
                            : "hover:bg-[#F8F9FA] text-[#716C70]"
                        }`}
                      >
                        {isAssigned ? (
                          <CheckSquare className="w-4 h-4 text-[#8aac00] shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-[#C8C4C8] shrink-0" />
                        )}
                        <span className="truncate">{page.title_he || page.slug}</span>
                        <span className="text-xs text-[#C8C4C8] mr-auto" dir="ltr">
                          /{page.slug}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Save error */}
            {saveError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {saveError}
              </p>
            )}

            {/* ── Action Buttons ── */}
            <div className="flex items-center justify-end gap-3 pt-2 pb-8">
              <Button
                variant="outline"
                onClick={isEditing ? goBackToList : () => setView("create_step1")}
              >
                ביטול
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !formName.trim()}
                className="bg-[#B8D900] text-[#2A2628] hover:bg-[#A8C400]"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "שמור"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Default: List View ── */
  return (
    <div className="p-8 max-w-6xl mx-auto" dir="rtl">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#B8D900]/15 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-[#8aac00]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#2A2628]">פופאפים</h1>
            <p className="text-sm text-[#9A969A]">ניהול פופאפים ובר CTA לדפי נחיתה</p>
          </div>
        </div>
        <Button
          onClick={openCreate}
          className="gap-2 bg-[#B8D900] text-[#2A2628] hover:bg-[#A8C400]"
        >
          <Plus className="w-4 h-4" />
          צור פופאפ חדש
        </Button>
      </div>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<FileStack className="w-4 h-4 text-[#8aac00]" />} label="סה״כ פופאפים" value={stats.total} />
        <StatCard icon={<Megaphone className="w-4 h-4 text-green-600" />} label="פופאפים פעילים" value={stats.active} />
        <StatCard icon={<Eye className="w-4 h-4 text-blue-600" />} label="סה״כ צפיות" value={stats.views} />
        <StatCard icon={<MousePointerClick className="w-4 h-4 text-purple-600" />} label="סה״כ המרות" value={stats.conversions} />
      </div>

      {/* ── Filter Tabs ── */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveFilter(tab.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeFilter === tab.value
                ? "bg-[#B8D900] text-[#2A2628]"
                : "bg-white text-[#716C70] border border-[#E5E5E5] hover:bg-[#F8F9FA]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Campaign Cards Grid ── */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-[#9A969A]" />
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-[#E5E5E5] rounded-2xl">
          <Megaphone className="w-12 h-12 mx-auto mb-3 text-[#C8C4C8]" />
          <p className="text-[#9A969A] font-medium mb-1">
            {activeFilter === "all" ? "אין פופאפים עדיין" : "אין פופאפים מסוג זה"}
          </p>
          <p className="text-sm text-[#C8C4C8]">צרו פופאפ חדש כדי להתחיל</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              toggling={togglingId === campaign.id}
              onToggleActive={() => toggleActive(campaign)}
              onEdit={() => openEdit(campaign)}
              onDelete={() => setDeleteTarget(campaign)}
            />
          ))}
        </div>
      )}

      {/* ══════════ Delete Confirmation Dialog ══════════ */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              מחיקת פופאפ
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#4A4648]">
            האם למחוק את <strong>{deleteTarget?.name}</strong>?
            {(deleteTarget?.pages_count || 0) > 0 && (
              <span className="block mt-2 text-amber-700 bg-amber-50 rounded-lg p-2 text-xs">
                אזהרה: הפופאפ משויך ל-{deleteTarget?.pages_count} עמודים. השיוכים יימחקו גם הם.
              </span>
            )}
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              ביטול
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "מחק"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Sub-Components
   ══════════════════════════════════════════════════════════════ */

/**
 * Stat card shown in the top stats bar.
 * @param props.icon - React node icon element
 * @param props.label - Hebrew label text
 * @param props.value - numeric value to display
 */
function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-[#F8F9FA] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-lg font-bold text-[#2A2628]">{value.toLocaleString("he-IL")}</p>
        <p className="text-xs text-[#9A969A]">{label}</p>
      </div>
    </div>
  );
}

/**
 * Individual campaign card in the grid view.
 * Shows name, type badge, active toggle, stats, and action buttons.
 */
function CampaignCard({
  campaign,
  toggling,
  onToggleActive,
  onEdit,
  onDelete,
}: {
  campaign: CampaignWithCount;
  toggling: boolean;
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const typeColor = CAMPAIGN_TYPE_COLORS[campaign.campaign_type];

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] p-5 hover:shadow-sm transition-shadow">
      {/* Top row: name + active toggle */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[#2A2628] truncate">{campaign.name}</h3>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${typeColor.bg} ${typeColor.text}`}
          >
            {CAMPAIGN_TYPE_LABELS[campaign.campaign_type]}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 mr-3">
          {toggling ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#9A969A]" />
          ) : (
            <Switch
              checked={campaign.is_active}
              onCheckedChange={onToggleActive}
              size="sm"
            />
          )}
          <span className={`text-xs font-medium ${campaign.is_active ? "text-green-600" : "text-[#9A969A]"}`}>
            {campaign.is_active ? "פעיל" : "כבוי"}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-[#716C70] mb-3">
        <span className="flex items-center gap-1">
          <Eye className="w-3.5 h-3.5" />
          {campaign.views_count.toLocaleString("he-IL")} צפיות
        </span>
        <span className="flex items-center gap-1">
          <MousePointerClick className="w-3.5 h-3.5" />
          {campaign.conversions_count.toLocaleString("he-IL")} המרות
        </span>
        <span className="flex items-center gap-1">
          <FileStack className="w-3.5 h-3.5" />
          {campaign.pages_count} עמודים
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 border-t border-[#F5F5F5] pt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-8 w-8 p-0 text-[#9A969A] hover:text-[#2A2628]"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-8 w-8 p-0 text-[#9A969A] hover:text-red-500"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Reusable field group with label for the campaign form.
 * @param props.label - Hebrew label text
 * @param props.children - form input(s)
 */
function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}
