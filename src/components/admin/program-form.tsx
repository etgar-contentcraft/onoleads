"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import type {
  Faculty,
  Program,
  ProgramLevel,
  Specialization,
  SpecializationInsert,
} from "@/lib/types/database";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Save,
  Trash2,
  Plus,
  Pencil,
  GripVertical,
  Loader2,
  ArrowRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CAMPUSES = [
  { value: "kiryat_ono", label: "קריית אונו" },
  { value: "jerusalem", label: "ירושלים" },
  { value: "haifa", label: "חיפה" },
  { value: "online", label: "מקוון" },
];

const SCHEDULE_OPTIONS = [
  { value: "morning", label: "בוקר" },
  { value: "evening", label: "ערב" },
  { value: "weekend", label: "סוף שבוע" },
  { value: "online", label: "מקוון" },
];

const LEVEL_OPTIONS: { value: ProgramLevel; label: string }[] = [
  { value: "bachelor", label: "תואר ראשון" },
  { value: "master", label: "תואר שני" },
  { value: "certificate", label: "תעודה" },
  { value: "continuing_ed", label: "לימודי המשך" },
];

const DEGREE_TYPE_OPTIONS = [
  "B.A.",
  "B.Sc.",
  "B.Ed.",
  "LL.B.",
  "B.S.W.",
  "M.A.",
  "M.Sc.",
  "M.B.A.",
  "M.Ed.",
  "LL.M.",
  "M.S.W.",
  "תעודה",
  "אחר",
];

// ---------------------------------------------------------------------------
// Zod Schema
// ---------------------------------------------------------------------------

const careerOutcomeSchema = z.object({
  title_he: z.string().min(1, "שדה חובה"),
  title_en: z.string().optional(),
  title_ar: z.string().optional(),
  icon: z.string().optional(),
});

const programSchema = z.object({
  name_he: z.string().min(1, "שם בעברית הוא שדה חובה"),
  name_en: z.string().optional(),
  name_ar: z.string().optional(),
  slug: z.string().min(1, "slug הוא שדה חובה"),
  faculty_id: z.string().min(1, "יש לבחור פקולטה"),
  degree_type: z.string().min(1, "יש לבחור סוג תואר"),
  level: z.enum(["bachelor", "master", "certificate", "continuing_ed"], "יש לבחור רמה"),
  original_url: z.string().url("כתובת לא תקינה").optional().or(z.literal("")),
  description_he: z.string().optional(),
  description_en: z.string().optional(),
  description_ar: z.string().optional(),
  duration_semesters: z.coerce.number().int().min(1).max(20).optional(),
  campuses: z.array(z.string()),
  schedule_options: z.array(z.string()),
  is_international: z.boolean(),
  is_active: z.boolean(),
  hero_image_url: z.string().optional(),
  hero_stat_value: z.string().optional(),
  hero_stat_label_he: z.string().optional(),
  hero_stat_label_en: z.string().optional(),
  career_outcomes: z.array(careerOutcomeSchema),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  sort_order: z.coerce.number().int().min(0).default(0),
});

type ProgramFormValues = z.infer<typeof programSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// Specialization sub-form
// ---------------------------------------------------------------------------

interface SpecFormData {
  name_he: string;
  name_en: string;
  name_ar: string;
  slug: string;
  promote_as_standalone: boolean;
  description_he: string;
  description_en: string;
  description_ar: string;
  sort_order: number;
}

function emptySpec(): SpecFormData {
  return {
    name_he: "",
    name_en: "",
    name_ar: "",
    slug: "",
    promote_as_standalone: false,
    description_he: "",
    description_en: "",
    description_ar: "",
    sort_order: 0,
  };
}

// ---------------------------------------------------------------------------
// Component Props
// ---------------------------------------------------------------------------

interface ProgramFormProps {
  program?: Program | null;
  programId?: string;
}

// ---------------------------------------------------------------------------
// ProgramForm Component
// ---------------------------------------------------------------------------

export function ProgramForm({ program, programId }: ProgramFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const isEdit = !!programId;

  // State
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Specialization dialog state
  const [specDialogOpen, setSpecDialogOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState<Specialization | null>(null);
  const [specForm, setSpecForm] = useState<SpecFormData>(emptySpec());
  const [specSaving, setSpecSaving] = useState(false);
  const [specDeleting, setSpecDeleting] = useState<string | null>(null);

  // Form
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ProgramFormValues>({
    defaultValues: {
      name_he: program?.name_he ?? "",
      name_en: program?.name_en ?? "",
      name_ar: program?.name_ar ?? "",
      slug: program?.slug ?? "",
      faculty_id: program?.faculty_id ?? "",
      degree_type: program?.degree_type ?? "",
      level: program?.level ?? "bachelor",
      original_url: program?.original_url ?? "",
      description_he: program?.description_he ?? "",
      description_en: program?.description_en ?? "",
      description_ar: program?.description_ar ?? "",
      duration_semesters: program?.duration_semesters ?? undefined,
      campuses: program?.campuses ?? [],
      schedule_options: program?.schedule_options ?? [],
      is_international: program?.is_international ?? false,
      is_active: program?.is_active ?? true,
      hero_image_url: program?.hero_image_url ?? "",
      hero_stat_value: program?.hero_stat_value ?? "",
      hero_stat_label_he: program?.hero_stat_label_he ?? "",
      hero_stat_label_en: program?.hero_stat_label_en ?? "",
      career_outcomes: (program?.career_outcomes as ProgramFormValues["career_outcomes"]) ?? [],
      seo_title: "",
      seo_description: "",
      sort_order: program?.sort_order ?? 0,
    },
  });

  const { fields: careerFields, append: appendCareer, remove: removeCareer } =
    useFieldArray({ control, name: "career_outcomes" });

  // Auto-slug from Hebrew name
  const nameHe = watch("name_he");
  useEffect(() => {
    if (!isEdit && nameHe) {
      setValue("slug", slugify(nameHe), { shouldDirty: true });
    }
  }, [nameHe, isEdit, setValue]);

  // Load faculties
  useEffect(() => {
    async function loadFaculties() {
      const { data } = await supabase
        .from("faculties")
        .select("*")
        .order("sort_order");
      if (data) setFaculties(data as Faculty[]);
    }
    loadFaculties();
  }, [supabase]);

  // Load specializations
  const loadSpecializations = useCallback(async () => {
    if (!programId) return;
    const { data } = await supabase
      .from("specializations")
      .select("*")
      .eq("program_id", programId)
      .order("sort_order");
    if (data) setSpecializations(data as Specialization[]);
  }, [programId, supabase]);

  useEffect(() => {
    loadSpecializations();
  }, [loadSpecializations]);

  // -------------------------------------------------------------------
  // Save program
  // -------------------------------------------------------------------

  async function onSubmit(values: ProgramFormValues) {
    setSaving(true);
    setError(null);

    try {
      const payload = {
        name_he: values.name_he,
        name_en: values.name_en || null,
        name_ar: values.name_ar || null,
        slug: values.slug,
        faculty_id: values.faculty_id,
        degree_type: values.degree_type,
        level: values.level,
        original_url: values.original_url || null,
        description_he: values.description_he || null,
        description_en: values.description_en || null,
        description_ar: values.description_ar || null,
        duration_semesters: values.duration_semesters ?? null,
        campuses: values.campuses,
        schedule_options: values.schedule_options,
        is_international: values.is_international,
        is_active: values.is_active,
        hero_image_url: values.hero_image_url || null,
        hero_stat_value: values.hero_stat_value || null,
        hero_stat_label_he: values.hero_stat_label_he || null,
        hero_stat_label_en: values.hero_stat_label_en || null,
        career_outcomes: values.career_outcomes.length
          ? values.career_outcomes
          : null,
        sort_order: values.sort_order,
      };

      if (isEdit) {
        const { error: updateError } = await supabase
          .from("programs")
          .update(payload)
          .eq("id", programId);
        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from("programs")
          .insert(payload)
          .select("id")
          .single();
        if (insertError) throw insertError;
        router.push(`/dashboard/programs/${data.id}`);
        return;
      }

      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "שגיאה בשמירה, נסה שנית";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  // -------------------------------------------------------------------
  // Delete program
  // -------------------------------------------------------------------

  async function handleDelete() {
    if (!programId) return;
    setDeleting(true);
    setError(null);

    try {
      const { error: delError } = await supabase
        .from("programs")
        .delete()
        .eq("id", programId);
      if (delError) throw delError;
      router.push("/dashboard/programs");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "שגיאה במחיקה, נסה שנית";
      setError(message);
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  }

  // -------------------------------------------------------------------
  // Specialization CRUD
  // -------------------------------------------------------------------

  function openNewSpec() {
    setEditingSpec(null);
    setSpecForm(emptySpec());
    setSpecDialogOpen(true);
  }

  function openEditSpec(spec: Specialization) {
    setEditingSpec(spec);
    setSpecForm({
      name_he: spec.name_he,
      name_en: spec.name_en ?? "",
      name_ar: spec.name_ar ?? "",
      slug: spec.slug,
      promote_as_standalone: spec.promote_as_standalone,
      description_he: spec.description_he ?? "",
      description_en: spec.description_en ?? "",
      description_ar: spec.description_ar ?? "",
      sort_order: spec.sort_order,
    });
    setSpecDialogOpen(true);
  }

  async function saveSpec() {
    if (!programId || !specForm.name_he) return;
    setSpecSaving(true);

    try {
      const payload: SpecializationInsert = {
        program_id: programId,
        name_he: specForm.name_he,
        name_en: specForm.name_en || null,
        name_ar: specForm.name_ar || null,
        slug: specForm.slug || slugify(specForm.name_he),
        promote_as_standalone: specForm.promote_as_standalone,
        description_he: specForm.description_he || null,
        description_en: specForm.description_en || null,
        description_ar: specForm.description_ar || null,
        meta: null,
        sort_order: specForm.sort_order,
      };

      if (editingSpec) {
        const { error } = await supabase
          .from("specializations")
          .update(payload)
          .eq("id", editingSpec.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("specializations")
          .insert(payload);
        if (error) throw error;
      }

      setSpecDialogOpen(false);
      await loadSpecializations();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "שגיאה בשמירת התמחות";
      setError(message);
    } finally {
      setSpecSaving(false);
    }
  }

  async function deleteSpec(specId: string) {
    setSpecDeleting(specId);
    try {
      const { error } = await supabase
        .from("specializations")
        .delete()
        .eq("id", specId);
      if (error) throw error;
      await loadSpecializations();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "שגיאה במחיקת התמחות";
      setError(message);
    } finally {
      setSpecDeleting(null);
    }
  }

  // -------------------------------------------------------------------
  // Checkbox toggle helpers
  // -------------------------------------------------------------------

  function toggleArrayValue(
    field: "campuses" | "schedule_options",
    value: string
  ) {
    const current = watch(field);
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setValue(field, next, { shouldDirty: true });
  }

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  return (
    <form onSubmit={handleSubmit(onSubmit)} dir="rtl">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/programs")}
          >
            <ArrowRight className="w-4 h-4" />
            חזרה לרשימה
          </Button>
          <h1 className="text-xl font-bold text-foreground">
            {isEdit ? "עריכת תוכנית לימוד" : "תוכנית לימוד חדשה"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {isEdit && (
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger
                render={
                  <Button type="button" variant="destructive" size="sm" />
                }
              >
                <Trash2 className="w-4 h-4" />
                מחיקה
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>מחיקת תוכנית לימוד</DialogTitle>
                  <DialogDescription>
                    האם למחוק את התוכנית &ldquo;{program?.name_he}&rdquo;? פעולה
                    זו אינה הפיכה.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose
                    render={<Button variant="outline" type="button" />}
                  >
                    ביטול
                  </DialogClose>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    מחיקה סופית
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            שמירה
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 text-destructive text-sm p-3">
          {error}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">כללי</TabsTrigger>
          <TabsTrigger value="content">תוכן</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          {isEdit && (
            <TabsTrigger value="specializations">התמחויות</TabsTrigger>
          )}
        </TabsList>

        {/* ============================================================= */}
        {/* General Tab */}
        {/* ============================================================= */}
        <TabsContent value="general">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Names Card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>שמות התוכנית</CardTitle>
                <CardDescription>
                  שם התוכנית בשלוש שפות. עברית היא שדה חובה.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="name_he">שם בעברית *</Label>
                  <Input
                    id="name_he"
                    {...register("name_he")}
                    aria-invalid={!!errors.name_he}
                  />
                  {errors.name_he && (
                    <p className="text-xs text-destructive">
                      {errors.name_he.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name_en">שם באנגלית</Label>
                  <Input id="name_en" dir="ltr" {...register("name_en")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name_ar">שם בערבית</Label>
                  <Input id="name_ar" {...register("name_ar")} />
                </div>
              </CardContent>
            </Card>

            {/* Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>פרטי התוכנית</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                {/* Slug */}
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    dir="ltr"
                    {...register("slug")}
                    aria-invalid={!!errors.slug}
                  />
                  {errors.slug && (
                    <p className="text-xs text-destructive">
                      {errors.slug.message}
                    </p>
                  )}
                </div>

                {/* Faculty */}
                <div className="space-y-2">
                  <Label>פקולטה *</Label>
                  <Controller
                    control={control}
                    name="faculty_id"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="בחר פקולטה" />
                        </SelectTrigger>
                        <SelectContent>
                          {faculties.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.name_he}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.faculty_id && (
                    <p className="text-xs text-destructive">
                      {errors.faculty_id.message}
                    </p>
                  )}
                </div>

                {/* Degree Type */}
                <div className="space-y-2">
                  <Label>סוג תואר *</Label>
                  <Controller
                    control={control}
                    name="degree_type"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="בחר סוג תואר" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEGREE_TYPE_OPTIONS.map((dt) => (
                            <SelectItem key={dt} value={dt}>
                              {dt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.degree_type && (
                    <p className="text-xs text-destructive">
                      {errors.degree_type.message}
                    </p>
                  )}
                </div>

                {/* Level */}
                <div className="space-y-2">
                  <Label>רמה *</Label>
                  <Controller
                    control={control}
                    name="level"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="בחר רמה" />
                        </SelectTrigger>
                        <SelectContent>
                          {LEVEL_OPTIONS.map((l) => (
                            <SelectItem key={l.value} value={l.value}>
                              {l.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.level && (
                    <p className="text-xs text-destructive">
                      {errors.level.message}
                    </p>
                  )}
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <Label htmlFor="duration_semesters">
                    משך הלימודים (סמסטרים)
                  </Label>
                  <Input
                    id="duration_semesters"
                    type="number"
                    min={1}
                    max={20}
                    {...register("duration_semesters")}
                  />
                </div>

                {/* Original URL */}
                <div className="space-y-2">
                  <Label htmlFor="original_url">קישור לדף מקורי</Label>
                  <Input
                    id="original_url"
                    dir="ltr"
                    type="url"
                    placeholder="https://..."
                    {...register("original_url")}
                  />
                </div>

                {/* Sort Order */}
                <div className="space-y-2">
                  <Label htmlFor="sort_order">סדר מיון</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    min={0}
                    {...register("sort_order")}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Options Card */}
            <Card>
              <CardHeader>
                <CardTitle>אפשרויות</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6">
                {/* Campuses */}
                <div className="space-y-3">
                  <Label>קמפוסים</Label>
                  <div className="flex flex-wrap gap-2">
                    {CAMPUSES.map((campus) => {
                      const selected = watch("campuses").includes(campus.value);
                      return (
                        <button
                          key={campus.value}
                          type="button"
                          onClick={() =>
                            toggleArrayValue("campuses", campus.value)
                          }
                          className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                            selected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {campus.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Schedule Options */}
                <div className="space-y-3">
                  <Label>מסלולי לימוד</Label>
                  <div className="flex flex-wrap gap-2">
                    {SCHEDULE_OPTIONS.map((opt) => {
                      const selected = watch("schedule_options").includes(
                        opt.value
                      );
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            toggleArrayValue("schedule_options", opt.value)
                          }
                          className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                            selected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="is_international">תוכנית בינלאומית</Label>
                    <Controller
                      control={control}
                      name="is_international"
                      render={({ field }) => (
                        <Switch
                          id="is_international"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="is_active">תוכנית פעילה</Label>
                    <Controller
                      control={control}
                      name="is_active"
                      render={({ field }) => (
                        <Switch
                          id="is_active"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============================================================= */}
        {/* Content Tab */}
        {/* ============================================================= */}
        <TabsContent value="content">
          <div className="grid gap-6">
            {/* Descriptions */}
            <Card>
              <CardHeader>
                <CardTitle>תיאור התוכנית</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="description_he">תיאור בעברית</Label>
                  <Textarea
                    id="description_he"
                    rows={4}
                    {...register("description_he")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description_en">תיאור באנגלית</Label>
                  <Textarea
                    id="description_en"
                    dir="ltr"
                    rows={4}
                    {...register("description_en")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description_ar">תיאור בערבית</Label>
                  <Textarea
                    id="description_ar"
                    rows={4}
                    {...register("description_ar")}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Hero Stats */}
            <Card>
              <CardHeader>
                <CardTitle>נתון מרכזי (Hero)</CardTitle>
                <CardDescription>
                  נתון בולט שיוצג בראש דף הנחיתה, למשל &ldquo;95%&rdquo;
                  השמה.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="hero_stat_value">ערך</Label>
                  <Input
                    id="hero_stat_value"
                    placeholder="95%"
                    {...register("hero_stat_value")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hero_stat_label_he">תווית בעברית</Label>
                  <Input
                    id="hero_stat_label_he"
                    placeholder="השמה בתעסוקה"
                    {...register("hero_stat_label_he")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hero_stat_label_en">תווית באנגלית</Label>
                  <Input
                    id="hero_stat_label_en"
                    dir="ltr"
                    placeholder="Employment rate"
                    {...register("hero_stat_label_en")}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Hero Image */}
            <Card>
              <CardHeader>
                <CardTitle>תמונת Hero</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="hero_image_url">כתובת תמונה</Label>
                  <Input
                    id="hero_image_url"
                    dir="ltr"
                    placeholder="https://..."
                    {...register("hero_image_url")}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Career Outcomes */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>תוצאות קריירה</CardTitle>
                    <CardDescription>
                      תפקידים ותחומי עיסוק שבוגרי התוכנית יכולים להגיע אליהם.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendCareer({ title_he: "", title_en: "", icon: "" })
                    }
                  >
                    <Plus className="w-4 h-4" />
                    הוספה
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {careerFields.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    לא נוספו תוצאות קריירה עדיין.
                  </p>
                )}
                <div className="space-y-3">
                  {careerFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex items-start gap-2 rounded-lg border p-3"
                    >
                      <GripVertical className="w-4 h-4 mt-2 text-muted-foreground shrink-0" />
                      <div className="flex-1 grid gap-2 md:grid-cols-3">
                        <Input
                          placeholder="תפקיד בעברית"
                          {...register(
                            `career_outcomes.${index}.title_he` as const
                          )}
                        />
                        <Input
                          placeholder="Title in English"
                          dir="ltr"
                          {...register(
                            `career_outcomes.${index}.title_en` as const
                          )}
                        />
                        <Input
                          placeholder="אייקון (אופציונלי)"
                          dir="ltr"
                          {...register(
                            `career_outcomes.${index}.icon` as const
                          )}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeCareer(index)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============================================================= */}
        {/* SEO Tab */}
        {/* ============================================================= */}
        <TabsContent value="seo">
          <Card>
            <CardHeader>
              <CardTitle>הגדרות SEO</CardTitle>
              <CardDescription>
                מטא נתונים לקידום אורגני במנועי חיפוש.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="seo_title">כותרת SEO</Label>
                <Input
                  id="seo_title"
                  {...register("seo_title")}
                  placeholder="כותרת לתגית title"
                />
                <p className="text-xs text-muted-foreground">
                  מומלץ עד 60 תווים
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="seo_description">תיאור SEO</Label>
                <Textarea
                  id="seo_description"
                  rows={3}
                  {...register("seo_description")}
                  placeholder="תיאור קצר לתגית meta description"
                />
                <p className="text-xs text-muted-foreground">
                  מומלץ עד 160 תווים
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================= */}
        {/* Specializations Tab */}
        {/* ============================================================= */}
        {isEdit && (
          <TabsContent value="specializations">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>התמחויות</CardTitle>
                    <CardDescription>
                      ניהול התמחויות של התוכנית. ניתן לקדם התמחות כדף עצמאי.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={openNewSpec}
                  >
                    <Plus className="w-4 h-4" />
                    התמחות חדשה
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {specializations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    אין התמחויות עדיין. לחץ &ldquo;התמחות חדשה&rdquo;
                    להוספה.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>שם</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>דף עצמאי</TableHead>
                        <TableHead>סדר</TableHead>
                        <TableHead>פעולות</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {specializations.map((spec) => (
                        <TableRow key={spec.id}>
                          <TableCell className="font-medium">
                            {spec.name_he}
                          </TableCell>
                          <TableCell dir="ltr" className="text-muted-foreground">
                            {spec.slug}
                          </TableCell>
                          <TableCell>
                            {spec.promote_as_standalone ? (
                              <Badge variant="default">כן</Badge>
                            ) : (
                              <Badge variant="secondary">לא</Badge>
                            )}
                          </TableCell>
                          <TableCell>{spec.sort_order}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => openEditSpec(spec)}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                disabled={specDeleting === spec.id}
                                onClick={() => deleteSpec(spec.id)}
                              >
                                {specDeleting === spec.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Specialization Dialog */}
            <Dialog open={specDialogOpen} onOpenChange={setSpecDialogOpen}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingSpec ? "עריכת התמחות" : "התמחות חדשה"}
                  </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2" dir="rtl">
                  <div className="space-y-2">
                    <Label>שם בעברית *</Label>
                    <Input
                      value={specForm.name_he}
                      onChange={(e) =>
                        setSpecForm((p) => ({
                          ...p,
                          name_he: e.target.value,
                          slug: slugify(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>שם באנגלית</Label>
                      <Input
                        dir="ltr"
                        value={specForm.name_en}
                        onChange={(e) =>
                          setSpecForm((p) => ({
                            ...p,
                            name_en: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>שם בערבית</Label>
                      <Input
                        value={specForm.name_ar}
                        onChange={(e) =>
                          setSpecForm((p) => ({
                            ...p,
                            name_ar: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Slug</Label>
                    <Input
                      dir="ltr"
                      value={specForm.slug}
                      onChange={(e) =>
                        setSpecForm((p) => ({ ...p, slug: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>תיאור בעברית</Label>
                    <Textarea
                      rows={3}
                      value={specForm.description_he}
                      onChange={(e) =>
                        setSpecForm((p) => ({
                          ...p,
                          description_he: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>קידום כדף עצמאי</Label>
                    <Switch
                      checked={specForm.promote_as_standalone}
                      onCheckedChange={(checked: boolean) =>
                        setSpecForm((p) => ({
                          ...p,
                          promote_as_standalone: checked,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>סדר מיון</Label>
                    <Input
                      type="number"
                      min={0}
                      value={specForm.sort_order}
                      onChange={(e) =>
                        setSpecForm((p) => ({
                          ...p,
                          sort_order: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose
                    render={<Button variant="outline" type="button" />}
                  >
                    ביטול
                  </DialogClose>
                  <Button
                    type="button"
                    onClick={saveSpec}
                    disabled={specSaving || !specForm.name_he}
                  >
                    {specSaving && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    שמירה
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        )}
      </Tabs>
    </form>
  );
}
