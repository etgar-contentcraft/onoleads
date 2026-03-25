"use client";

/**
 * User management page for super admins.
 * Lists all system users, allows inviting new users and deleting existing ones.
 */

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Users2, Trash2, UserPlus, Mail, AlertTriangle, Loader2 } from "lucide-react";

/** Shape of a user returned from the API */
interface AdminUser {
  id: string;
  email: string | undefined;
  created_at: string;
  last_sign_in_at: string | undefined;
  user_metadata: Record<string, unknown>;
}

/** Returns a deterministic color class based on the first character of an email */
function getAvatarColor(email: string): string {
  const COLORS = [
    "bg-[#B8D900]/20 text-[#7A8F00]",
    "bg-blue-500/20 text-blue-700",
    "bg-violet-500/20 text-violet-700",
    "bg-amber-500/20 text-amber-700",
    "bg-emerald-500/20 text-emerald-700",
    "bg-rose-500/20 text-rose-700",
    "bg-cyan-500/20 text-cyan-700",
  ];
  const index = (email.charCodeAt(0) || 0) % COLORS.length;
  return COLORS[index];
}

/** Formats an ISO date string to a human-readable Hebrew-friendly date */
function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("he-IL", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function UsersPage() {
  /* --- State --- */
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Invite dialog state */
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  /* Delete confirmation dialog state */
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  /**
   * Fetches all users from the API and the current logged-in user from Supabase.
   */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      /* Get current session user */
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      /* Fetch all admin users */
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to load users");
      }
      const body = await res.json();
      setUsers(body.users as AdminUser[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /**
   * Sends an invite to the provided email address.
   */
  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    setInviteError(null);
    setInviteSuccess(null);
    try {
      const res = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to send invitation");
      setInviteSuccess(inviteEmail.trim());
      setInviteEmail("");
      /* Reload users after a successful invite */
      fetchUsers();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setInviteLoading(false);
    }
  }

  /**
   * Deletes the user stored in deleteTarget state.
   */
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to delete user");
      setDeleteTarget(null);
      fetchUsers();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setDeleteLoading(false);
    }
  }

  /** Closes and resets the invite dialog */
  function closeInviteDialog() {
    setInviteOpen(false);
    setInviteEmail("");
    setInviteError(null);
    setInviteSuccess(null);
  }

  /** Closes and resets the delete dialog */
  function closeDeleteDialog() {
    setDeleteTarget(null);
    setDeleteError(null);
  }

  return (
    <div dir="rtl" className="space-y-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#B8D900]/15 flex items-center justify-center shrink-0">
            <Users2 className="w-6 h-6 text-[#7A8F00]" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-[#2a2628]">
              ניהול משתמשים
            </h1>
            <p className="text-[#9A969A] mt-1 text-sm">
              סופר-אדמינים של המערכת
            </p>
          </div>
        </div>

        <Button
          onClick={() => setInviteOpen(true)}
          className="gap-2 bg-[#B8D900] text-[#2a2628] hover:bg-[#a8c400] shadow-md shadow-[#B8D900]/20 hover:shadow-lg hover:shadow-[#B8D900]/30 hover:-translate-y-0.5 transition-all duration-200 rounded-xl font-semibold"
        >
          <UserPlus className="w-4 h-4" />
          הזמן משתמש חדש
        </Button>
      </div>

      {/* ── Users Table Card ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#f0f0f0] overflow-hidden">
        {/* Card Header */}
        <div className="px-6 py-4 border-b border-[#f0f0f0] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#2a2628]">משתמשים פעילים</h2>
            <p className="text-xs text-[#9A969A] mt-0.5">
              {loading ? "טוען..." : `${users.length} משתמשים במערכת`}
            </p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16 gap-3 text-[#9A969A]">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">טוען משתמשים...</span>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-sm text-red-500">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsers}
              className="rounded-xl text-xs"
            >
              נסה שוב
            </Button>
          </div>
        )}

        {/* Empty State — only shown when there's exactly 1 user (current user only) */}
        {!loading && !error && users.length === 1 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-[#B8D900]/10 flex items-center justify-center">
              <Users2 className="w-7 h-7 text-[#B8D900]" />
            </div>
            <p className="text-sm font-semibold text-[#2a2628]">אין עוד משתמשים</p>
            <p className="text-xs text-[#9A969A] max-w-xs">
              אתה המשתמש היחיד במערכת. הזמן אנשי צוות נוספים.
            </p>
            <Button
              onClick={() => setInviteOpen(true)}
              className="mt-2 gap-2 bg-[#B8D900] text-[#2a2628] hover:bg-[#a8c400] rounded-xl font-semibold text-sm"
            >
              <UserPlus className="w-4 h-4" />
              הזמן משתמש
            </Button>
          </div>
        )}

        {/* Users Table */}
        {!loading && !error && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[580px]">
              <thead>
                <tr className="border-b border-[#f3f4f6]">
                  <th className="text-right text-[11px] font-semibold text-[#9A969A] uppercase tracking-wider pb-3 pt-3 px-6">
                    משתמש
                  </th>
                  <th className="text-right text-[11px] font-semibold text-[#9A969A] uppercase tracking-wider pb-3 pt-3 px-4">
                    נוצר בתאריך
                  </th>
                  <th className="text-right text-[11px] font-semibold text-[#9A969A] uppercase tracking-wider pb-3 pt-3 px-4">
                    כניסה אחרונה
                  </th>
                  <th className="text-right text-[11px] font-semibold text-[#9A969A] uppercase tracking-wider pb-3 pt-3 px-4">
                    פעולות
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, index) => {
                  const isCurrentUser = u.id === currentUserId;
                  const initial = (u.email?.[0] ?? "?").toUpperCase();
                  const avatarColor = getAvatarColor(u.email ?? "");

                  return (
                    <tr
                      key={u.id}
                      className={`group hover:bg-[#fafafa] transition-colors duration-150 ${
                        index < users.length - 1 ? "border-b border-[#f3f4f6]" : ""
                      }`}
                    >
                      {/* Avatar + Email */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor}`}
                          >
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-[#2a2628] truncate">
                                {u.email ?? "—"}
                              </span>
                              {isCurrentUser && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#B8D900]/20 text-[#7A8F00] border border-[#B8D900]/30">
                                  אתה
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Created at */}
                      <td className="py-4 px-4">
                        <span className="text-sm text-[#716C70]">
                          {formatDate(u.created_at)}
                        </span>
                      </td>

                      {/* Last sign in */}
                      <td className="py-4 px-4">
                        <span className="text-sm text-[#716C70]">
                          {formatDate(u.last_sign_in_at)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isCurrentUser}
                          onClick={() => setDeleteTarget(u)}
                          className="w-8 h-8 rounded-lg text-[#9A969A] hover:text-red-500 hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title={isCurrentUser ? "לא ניתן למחוק את עצמך" : `מחק את ${u.email}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Invite Dialog ── */}
      <Dialog open={inviteOpen} onOpenChange={closeInviteDialog}>
        <DialogContent
          dir="rtl"
          className="sm:max-w-md rounded-2xl"
        >
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-[#B8D900]/15 flex items-center justify-center">
                <Mail className="w-5 h-5 text-[#7A8F00]" />
              </div>
              <DialogTitle className="text-lg font-bold text-[#2a2628]">
                הזמן משתמש חדש
              </DialogTitle>
            </div>
          </DialogHeader>

          {/* Success state */}
          {inviteSuccess ? (
            <div className="py-4 space-y-4">
              <div className="flex flex-col items-center gap-3 text-center py-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <UserPlus className="w-7 h-7 text-emerald-600" />
                </div>
                <div>
                  <p className="text-base font-bold text-[#2a2628]">הזמנה נשלחה!</p>
                  <p className="text-sm text-[#716C70] mt-1">
                    הזמנה נשלחה ל-<span className="font-semibold text-[#2a2628]">{inviteSuccess}</span>
                  </p>
                </div>
                <p className="text-xs text-[#9A969A]">
                  המשתמש יקבל אימייל עם קישור להגדרת סיסמה
                </p>
              </div>
              <Button
                onClick={closeInviteDialog}
                className="w-full bg-[#2a2628] text-white hover:bg-[#3a3638] rounded-xl font-semibold"
              >
                סגור
              </Button>
            </div>
          ) : (
            /* Invite form */
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="invite-email" className="text-sm font-semibold text-[#2a2628]">
                  כתובת אימייל
                </Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="admin@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                  className="rounded-xl border-[#e5e7eb] focus:border-[#B8D900] focus:ring-[#B8D900]/20 text-[#2a2628]"
                  dir="ltr"
                />
              </div>

              {inviteError && (
                <p className="text-xs text-red-500 bg-red-500/5 rounded-lg px-3 py-2">
                  {inviteError}
                </p>
              )}

              <p className="text-xs text-[#9A969A]">
                המשתמש יקבל אימייל עם קישור להגדרת סיסמה
              </p>

              <DialogFooter className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={closeInviteDialog}
                  className="flex-1 rounded-xl border-[#e5e7eb] text-[#716C70] hover:bg-[#f9fafb]"
                >
                  ביטול
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={inviteLoading || !inviteEmail.trim()}
                  className="flex-1 gap-2 bg-[#B8D900] text-[#2a2628] hover:bg-[#a8c400] rounded-xl font-semibold disabled:opacity-50"
                >
                  {inviteLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      שולח...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      שלח הזמנה
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={closeDeleteDialog}>
        <DialogContent
          dir="rtl"
          className="sm:max-w-md rounded-2xl"
        >
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <DialogTitle className="text-lg font-bold text-[#2a2628]">
                אישור מחיקה
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="py-2 space-y-4">
            <p className="text-sm text-[#716C70]">
              למחוק את{" "}
              <span className="font-semibold text-[#2a2628]">
                {deleteTarget?.email}
              </span>
              ? הם יאבדו גישה מיידית למערכת.
            </p>

            {deleteError && (
              <p className="text-xs text-red-500 bg-red-500/5 rounded-lg px-3 py-2">
                {deleteError}
              </p>
            )}

            <DialogFooter className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={closeDeleteDialog}
                disabled={deleteLoading}
                className="flex-1 rounded-xl border-[#e5e7eb] text-[#716C70] hover:bg-[#f9fafb]"
              >
                ביטול
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 gap-2 bg-red-500 text-white hover:bg-red-600 rounded-xl font-semibold disabled:opacity-50"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    מוחק...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    מחק משתמש
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
