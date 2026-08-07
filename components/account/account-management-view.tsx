"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Trash2,
  AlertTriangle,
  X,
  Mail,
  CheckCircle2,
} from "lucide-react";
import { UserProfile } from "@/lib/types";
import { GlassButton } from "@/components/ui/glass-button";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/toast-context";
import { useRouter } from "next/navigation";

interface AccountManagementViewProps {
  user: UserProfile | null;
}

export function AccountManagementView({ user }: AccountManagementViewProps) {
  const router = useRouter();
  const { success, error } = useToast();

  // Delete Account Confirmation Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Permanent Delete Account & All Data Handler (with storage purge)
  const handleDeleteAccount = async () => {
    if (deleteConfirmationText.trim().toUpperCase() !== "DELETE" || !user) return;

    setIsDeleting(true);
    try {
      const supabase = createClient();

      // 1. Purge files from all storage buckets
      const possibleBuckets = [
        "memory-images",
        "memory-videos",
        "memory-audio",
        "avatars",
        "profiles",
        "backups",
        "memories",
      ];
      for (const bucket of possibleBuckets) {
        try {
          const { data: files } = await supabase.storage.from(bucket).list(user.id);
          if (files && files.length > 0) {
            const paths = files.map((f) => `${user.id}/${f.name}`);
            await supabase.storage.from(bucket).remove(paths);
          }
        } catch (storageErr) {
          console.warn("Storage cleanup notice:", storageErr);
        }
      }

      // 2. Delete user memories
      await supabase.from("memories").delete().eq("user_id", user.id);

      // 3. Delete user collections
      await supabase.from("collections").delete().eq("user_id", user.id);

      // 4. Delete search history & activity
      await supabase.from("search_history").delete().eq("user_id", user.id);
      await supabase.from("recent_activity").delete().eq("user_id", user.id);
      await supabase.from("pinned_collections").delete().eq("user_id", user.id);
      await supabase.from("user_settings").delete().eq("user_id", user.id);

      // 5. Delete profile record
      await supabase.from("profiles").delete().eq("id", user.id);

      // 6. Sign out session
      await supabase.auth.signOut();

      success("Account Deleted", "Your account and all associated vault data were permanently erased.");
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Account deletion error";
      error("Deletion Error", msg);
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Section Header */}
      <div className="glass-panel p-6 rounded-3xl border border-white/12 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-aurora-cyan to-aurora-violet p-0.5 shadow-aurora-glow">
            <div className="w-full h-full bg-[#030712] rounded-[14px] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-aurora-cyan" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white tracking-tight">
              Security & Account Management
            </h2>
            <p className="text-xs text-white/50">
              Google Single Sign-On and account management
            </p>
          </div>
        </div>
      </div>

      {/* 1. GOOGLE ACCOUNT AUTHENTICATION SECTION */}
      <div className="glass-panel p-6 rounded-3xl border border-white/12 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/[0.06] border border-white/10">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12.5s.7 2.8 1.9 5.2l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 22.3 12 23z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Google Account Authentication</h3>
              <p className="text-xs text-white/50">Primary Single Sign-On Provider</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Connected
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-white/70">
          <Mail className="w-4 h-4 text-aurora-cyan" />
          <span>Authenticated Email:</span>
          <strong className="text-white font-mono">{user?.email || "Connected via Google"}</strong>
        </div>
      </div>

      {/* 2. DELETE ACCOUNT SECTION */}
      <div className="p-6 rounded-3xl border border-rose-500/30 bg-rose-500/[0.04] space-y-4">
        <div className="flex items-center gap-2 text-rose-400">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="text-base font-bold">Danger Zone: Permanent Account Deletion</h3>
        </div>

        <p className="text-xs text-white/70">
          Deleting your account will permanently erase all your journals, photos, and personal memories. This action is irreversible and cannot be undone.
        </p>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-5 py-2.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete My Aurora Account</span>
        </button>
      </div>

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn">
          <div className="relative w-full max-w-md glass-panel rounded-3xl border border-rose-500/40 p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-sm font-bold text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Confirm Account Erasure
              </span>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-white/80 leading-relaxed">
              Please type <strong className="text-rose-400 font-mono">DELETE</strong> in all capitals below to confirm permanent account deletion:
            </p>

            <input
              type="text"
              placeholder='Type "DELETE"'
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              className="w-full p-3 rounded-2xl bg-white/[0.04] border border-rose-500/40 text-xs text-white font-mono placeholder-white/30 focus:outline-none focus:border-rose-400"
            />

            <div className="flex justify-end gap-3 pt-2">
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </GlassButton>
              <button
                disabled={deleteConfirmationText.trim().toUpperCase() !== "DELETE" || isDeleting}
                onClick={handleDeleteAccount}
                className="px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-bold transition-all cursor-pointer shadow-lg"
              >
                {isDeleting ? "Erasing..." : "Permanently Delete Everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
