"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Faculty, ProgramWithFaculty, ProgramLevel } from "@/lib/types/database";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  Pencil,
  Loader2,
  BookOpen,
  Filter,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LEVEL_LABELS: Record<ProgramLevel, string> = {
  bachelor: "תואר ראשון",
  master: "תואר שני",
  certificate: "תעודה",
  continuing_ed: "לימודי המשך",
};

function getLevelLabel(level: ProgramLevel): string {
  return LEVEL_LABELS[level] ?? level;
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function ProgramsListPage() {
  const supabase = createClient();

  const [programs, setPrograms] = useState<ProgramWithFaculty[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [facultyFilter, setFacultyFilter] = useState<string>("__all__");
  const [degreeFilter, setDegreeFilter] = useState<string>("__all__");
  const [levelFilter, setLevelFilter] = useState<string>("__all__");

  // Load data
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [programsRes, facultiesRes] = await Promise.all([
          supabase
            .from("programs")
            .select("*, faculty:faculties(*)")
            .order("sort_order"),
          supabase.from("faculties").select("*").order("sort_order"),
        ]);

        if (programsRes.error) throw programsRes.error;
        if (facultiesRes.error) throw facultiesRes.error;

        setPrograms(programsRes.data as ProgramWithFaculty[]);
        setFaculties(facultiesRes.data as Faculty[]);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "שגיאה בטעינת הנתונים";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supabase]);

  // Unique degree types from data
  const degreeTypes = useMemo(() => {
    const set = new Set(programs.map((p) => p.degree_type));
    return Array.from(set).sort();
  }, [programs]);

  // Filtered results
  const filtered = useMemo(() => {
    return programs.filter((p) => {
      if (
        search &&
        !p.name_he.toLowerCase().includes(search.toLowerCase()) &&
        !(p.name_en ?? "").toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      if (facultyFilter !== "__all__" && p.faculty_id !== facultyFilter) {
        return false;
      }
      if (degreeFilter !== "__all__" && p.degree_type !== degreeFilter) {
        return false;
      }
      if (levelFilter !== "__all__" && p.level !== levelFilter) {
        return false;
      }
      return true;
    });
  }, [programs, search, facultyFilter, degreeFilter, levelFilter]);

  // Clear all filters
  function clearFilters() {
    setSearch("");
    setFacultyFilter("__all__");
    setDegreeFilter("__all__");
    setLevelFilter("__all__");
  }

  const hasActiveFilters =
    search !== "" ||
    facultyFilter !== "__all__" ||
    degreeFilter !== "__all__" ||
    levelFilter !== "__all__";

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            תוכניות לימוד
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ניהול כלל תוכניות הלימוד במערכת
          </p>
        </div>
        <Link href="/dashboard/programs/new">
          <Button>
            <Plus className="w-4 h-4" />
            תוכנית חדשה
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="w-4 h-4" />
            סינון
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="חיפוש לפי שם..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-8"
                />
              </div>
            </div>

            {/* Faculty filter */}
            <Select value={facultyFilter} onValueChange={setFacultyFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="פקולטה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">כל הפקולטות</SelectItem>
                {faculties.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name_he}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Degree Type filter */}
            <Select value={degreeFilter} onValueChange={setDegreeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="סוג תואר" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">כל הסוגים</SelectItem>
                {degreeTypes.map((dt) => (
                  <SelectItem key={dt} value={dt}>
                    {dt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Level filter */}
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="רמה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">כל הרמות</SelectItem>
                <SelectItem value="bachelor">תואר ראשון</SelectItem>
                <SelectItem value="master">תואר שני</SelectItem>
                <SelectItem value="certificate">תעודה</SelectItem>
                <SelectItem value="continuing_ed">לימודי המשך</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
              >
                נקה סינון
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="mr-2 text-muted-foreground">טוען...</span>
        </div>
      ) : error ? (
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm p-4 text-center">
          {error}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שם התוכנית</TableHead>
                  <TableHead>סוג תואר</TableHead>
                  <TableHead>פקולטה</TableHead>
                  <TableHead>רמה</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead>פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <p className="text-muted-foreground">
                        {hasActiveFilters
                          ? "לא נמצאו תוכניות התואמות לסינון"
                          : "אין תוכניות לימוד עדיין"}
                      </p>
                      {!hasActiveFilters && (
                        <Link href="/dashboard/programs/new">
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                          >
                            <Plus className="w-4 h-4" />
                            צור תוכנית ראשונה
                          </Button>
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((program) => (
                    <TableRow key={program.id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/programs/${program.id}`}
                          className="font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {program.name_he}
                        </Link>
                        {program.name_en && (
                          <p
                            className="text-xs text-muted-foreground mt-0.5"
                            dir="ltr"
                          >
                            {program.name_en}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{program.degree_type}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {program.faculty?.name_he ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getLevelLabel(program.level)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {program.is_active ? (
                          <Badge variant="default">פעיל</Badge>
                        ) : (
                          <Badge variant="destructive">לא פעיל</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link href={`/dashboard/programs/${program.id}`}>
                          <Button variant="ghost" size="icon-sm">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {filtered.length > 0 && (
              <div className="border-t px-4 py-3 text-xs text-muted-foreground">
                מציג {filtered.length} מתוך {programs.length} תוכניות
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
