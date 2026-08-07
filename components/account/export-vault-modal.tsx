import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  Trash2,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Archive,
  Image as ImageIcon,
  FileText,
  Package,
  Loader2,
  Sparkles,
} from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { Memory, UserProfile } from "@/lib/types";
import { exportVaultAsZip, ExportProgress, ExportResult } from "@/lib/export-vault";
import { deleteMemoriesAtomic } from "@/lib/supabase-db";
import { calculateUserStorageMetrics } from "@/lib/storage-utils";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/toast-context";

interface ExportVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  memories: Memory[];
  user: UserProfile | null;
  onMemoriesDeleted: () => void;
}

type ModalPhase =
  | "pre-export"
  | "exporting"
  | "post-export"
  | "confirm-delete"
  | "deleting"
  | "complete";

export function ExportVaultModal({
  isOpen,
  onClose,
  memories,
  user,
  onMemoriesDeleted,
}: ExportVaultModalProps) {
  const { success, error: toastError } = useToast();

  const [phase, setPhase] = useState<ModalPhase>("pre-export");
  const [exportProgress, setExportProgress] = useState<ExportProgress>({ step: "", percent: 0 });
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [deleteStep, setDeleteStep] = useState("");
  const [freedMb, setFreedMb] = useState(0);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const activeMemories = useMemo(() => memories.filter((m) => !m.deleted), [memories]);
  const storageMetrics = useMemo(
    () => calculateUserStorageMetrics(memories, user?.avatar_url),
    [memories, user?.avatar_url]
  );

  const photoCount = activeMemories.filter(
    (m) => m.memory_type === "photo" || m.cover_image
  ).length;
  const journalCount = activeMemories.filter(
    (m) => m.memory_type === "journal"
  ).length;

  // ── EXPORT ─────────────────────────────────────────────────────────────────
  const handleStartExport = async () => {
    setPhase("exporting");
    setExportProgress({ step: "Initializing...", percent: 0 });

    const result = await exportVaultAsZip(activeMemories, user, (progress) => {
      setExportProgress(progress);
    });

    setExportResult(result);

    if (result.success) {
      setPhase("post-export");
      success(
        "Vault Exported Successfully",
        "Your backup has been downloaded to your device's Downloads folder."
      );
    } else {
      toastError("Export Failed", result.error || "Could not generate backup archive. Please try again.");
      setPhase("pre-export");
    }
  };

  // ── POST-EXPORT CHOICES ────────────────────────────────────────────────────
  const handleKeepMemories = () => {
    resetAndClose();
  };

  const handleRequestDelete = () => {
    if (!exportResult?.success) {
      toastError("Export Incomplete", "Cannot delete memories — the ZIP export did not complete successfully.");
      return;
    }
    setDeleteConfirmText("");
    setPhase("confirm-delete");
  };

  const handleCancelDelete = () => {
    setDeleteConfirmText("");
    setPhase("post-export");
  };

  // ── PERMANENT DELETE ───────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!user?.id) return;
    if (!exportResult?.success) return;
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") return;

    setPhase("deleting");
    setDeleteProgress(5);
    setDeleteStep("Preparing deletion...");

    try {
      const supabase = createClient();
      const memoriesToDelete = [...activeMemories];
      const totalItems = memoriesToDelete.length;
      const previousUsedMb = storageMetrics.usedMb;

      const res = await deleteMemoriesAtomic(
        supabase,
        user.id,
        memoriesToDelete,
        (step, percent) => {
          setDeleteStep(step);
          setDeleteProgress(percent);
        }
      );

      if (!res.success) {
        throw new Error(res.error || "Deletion operation failed.");
      }

      setFreedMb(previousUsedMb);
      setDeleteStep("Refreshing vault...");
      setDeleteProgress(100);

      // Notify parent — triggers memories state refresh & storage metrics reset to 0 B
      onMemoriesDeleted();

      resetAndClose();

      success(
        "Vault Cleared",
        `${totalItems} memories permanently deleted. ${previousUsedMb} MB of storage freed. Your exported backup remains available in your Downloads folder.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Deletion error";
      console.error("[DELETE] Error:", err);
      toastError("Deletion Failed", msg + " — No partial deletion occurred. Please try again.");
      setPhase("post-export");
    }
  };

  // ── RESET ──────────────────────────────────────────────────────────────────
  const resetAndClose = () => {
    setPhase("pre-export");
    setExportProgress({ step: "", percent: 0 });
    setExportResult(null);
    setDeleteProgress(0);
    setDeleteStep("");
    setFreedMb(0);
    setDeleteConfirmText("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={phase === "exporting" || phase === "deleting" ? undefined : resetAndClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-xl"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-8 border border-white/20 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
        >
          {/* Close Button */}
          {phase !== "exporting" && phase !== "deleting" && (
            <button
              type="button"
              onClick={resetAndClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/[0.05] border border-white/10 text-white/60 hover:text-white transition-colors cursor-pointer z-20"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* ═══════════════════ PHASE: PRE-EXPORT ═══════════════════ */}
          {phase === "pre-export" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-aurora-cyan/15 border border-aurora-cyan/30 text-aurora-cyan">
                  <Archive className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold text-white">Export Vault</h2>
                  <p className="text-xs text-white/50">Download a complete backup of all your memories</p>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-center space-y-1">
                  <ImageIcon className="w-5 h-5 text-sky-400 mx-auto" />
                  <p className="text-lg font-bold text-white font-mono">{photoCount}</p>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-white/50">Images</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-center space-y-1">
                  <FileText className="w-5 h-5 text-amber-400 mx-auto" />
                  <p className="text-lg font-bold text-white font-mono">{journalCount}</p>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-white/50">Journals</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-center space-y-1">
                  <Package className="w-5 h-5 text-aurora-cyan mx-auto" />
                  <p className="text-lg font-bold text-white font-mono">{storageMetrics.usedMb}</p>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-white/50">MB Est.</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-white/60 space-y-1.5">
                <p className="font-semibold text-white/80">Your export will include:</p>
                <ul className="space-y-0.5 pl-3">
                  <li>• All original images named using Memory Titles (JPG, PNG, WEBP — no compression)</li>
                  <li>• All journal entries as plain text (.txt) files — UTF-8</li>
                  <li>• Human-readable Memory Details text card per memory (Memory Details/ folder)</li>
                  <li>• README.txt with offline reading instructions</li>
                  <li>• 100% universal offline compatibility (No JSON, no developer tools required)</li>
                </ul>
              </div>

              {activeMemories.length === 0 ? (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>No memories to export. Your vault is empty.</span>
                </div>
              ) : (
                <GlassButton
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={handleStartExport}
                  leftIcon={<Download className="w-5 h-5" />}
                >
                  Export Vault ({activeMemories.length} memories)
                </GlassButton>
              )}
            </div>
          )}

          {/* ═══════════════════ PHASE: EXPORTING ═══════════════════ */}
          {phase === "exporting" && (
            <div className="space-y-6 py-4">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-aurora-cyan/15 border border-aurora-cyan/30 flex items-center justify-center mx-auto">
                  <Loader2 className="w-8 h-8 text-aurora-cyan animate-spin" />
                </div>
                <h3 className="text-lg font-display font-bold text-white">Creating Backup</h3>
                <p className="text-xs text-white/60">{exportProgress.step}</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-white/70">Progress</span>
                  <span className="text-aurora-cyan font-mono">{exportProgress.percent}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden border border-white/10 p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-aurora-cyan to-aurora-violet transition-all duration-300 shadow-aurora-glow"
                    style={{ width: `${exportProgress.percent}%` }}
                  />
                </div>
              </div>

              <p className="text-[11px] text-white/40 text-center">
                Please do not close this window until the export completes.
              </p>
            </div>
          )}

          {/* ═══════════════════ PHASE: POST-EXPORT ═══════════════════ */}
          {phase === "post-export" && exportResult && (
            <div className="space-y-6">
              {/* Premium Information Card */}
              <div className="p-5 rounded-3xl bg-gradient-to-b from-aurora-cyan/15 via-aurora-indigo/10 to-transparent border border-aurora-cyan/30 space-y-3 shadow-lg relative overflow-hidden">
                <div className="flex items-center gap-2.5 text-aurora-cyan">
                  <Sparkles className="w-5 h-5 shrink-0 text-amber-300" />
                  <h3 className="text-lg font-display font-bold text-white tracking-tight">
                    ✨ Your Aurora Backup is Ready
                  </h3>
                </div>
                <div className="space-y-2 text-xs text-white/80 leading-relaxed font-normal">
                  <p>Your memories have been safely exported.</p>
                  <p>
                    You can keep them in Aurora, or start a fresh chapter by permanently clearing your vault.
                  </p>
                  <p>
                    Your downloaded backup will always remain available in your Downloads folder.
                  </p>
                  <p className="font-semibold text-white pt-1">
                    This action is completely your choice.
                  </p>
                </div>
              </div>

              {/* Skipped Items Warning */}
              {exportResult.skippedItems > 0 && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    {exportResult.skippedItems} item(s) could not be exported (image download failed).
                    All other memories were exported successfully.
                  </span>
                </div>
              )}

              {/* Export Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-center space-y-0.5">
                  <p className="text-base font-bold text-white font-mono">{exportResult.exportedImages}</p>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-white/50">Images</span>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-center space-y-0.5">
                  <p className="text-base font-bold text-white font-mono">{exportResult.exportedJournals}</p>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-white/50">Journals</span>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-center space-y-0.5">
                  <p className="text-base font-bold text-white font-mono">
                    {(exportResult.zipSizeBytes / (1024 * 1024)).toFixed(1)}
                  </p>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-white/50">MB</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <GlassButton
                  variant="primary"
                  size="md"
                  className="flex-1"
                  onClick={handleKeepMemories}
                  leftIcon={<Shield className="w-4 h-4" />}
                >
                  Keep My Memories
                </GlassButton>
                <GlassButton
                  variant="secondary"
                  size="md"
                  className="flex-1 !bg-rose-500/20 !border-rose-500/40 hover:!bg-rose-500/30 text-rose-200"
                  onClick={handleRequestDelete}
                  leftIcon={<Trash2 className="w-4 h-4" />}
                >
                  Delete Everything
                </GlassButton>
              </div>
            </div>
          )}

          {/* ═══════════════════ PHASE: CONFIRM DELETE ═══════════════════ */}
          {phase === "confirm-delete" && (
            <div className="space-y-6">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-8 h-8 text-rose-400" />
                </div>
                <h3 className="text-lg font-display font-bold text-white">⚠ Permanent Deletion</h3>
              </div>

              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3">
                <p className="text-sm font-semibold text-rose-300">
                  Your backup has already been downloaded successfully.
                </p>
                <p className="text-xs text-white/70 leading-relaxed">
                  Deleting now will permanently remove every journal, image and memory
                  from Aurora. All {activeMemories.length} memories will be erased from
                  your vault and from Supabase Storage.
                </p>
                <p className="text-xs font-bold text-rose-300">
                  This action cannot be undone.
                </p>
              </div>

              {/* Type-DELETE confirmation */}
              <div className="space-y-2">
                <p className="text-xs text-white/70">
                  To continue, type{" "}
                  <strong className="text-rose-400 font-mono tracking-widest">DELETE</strong>{" "}
                  in the box below:
                </p>
                <input
                  type="text"
                  placeholder='Type "DELETE" to confirm'
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-white/[0.04] border border-rose-500/40 text-sm text-white font-mono placeholder-white/30 focus:outline-none focus:border-rose-400 transition-colors"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-3">
                <GlassButton
                  variant="secondary"
                  size="md"
                  className="flex-1"
                  onClick={handleCancelDelete}
                >
                  Cancel
                </GlassButton>
                <button
                  disabled={deleteConfirmText.trim().toUpperCase() !== "DELETE"}
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/50 text-rose-200 text-sm font-bold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Permanently Delete
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════ PHASE: DELETING ═══════════════════ */}
          {phase === "deleting" && (
            <div className="space-y-6 py-4">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto">
                  <Loader2 className="w-8 h-8 text-rose-400 animate-spin" />
                </div>
                <h3 className="text-lg font-display font-bold text-white">Clearing Aurora Vault</h3>
                <p className="text-xs text-white/60">{deleteStep}</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-white/70">Deletion Progress</span>
                  <span className="text-rose-400 font-mono">{deleteProgress}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden border border-white/10 p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-500 transition-all duration-300"
                    style={{ width: `${deleteProgress}%` }}
                  />
                </div>
              </div>

              <p className="text-[11px] text-white/40 text-center">
                Please do not close this window. Storage is being freed.
              </p>
            </div>
          )}

          {/* ═══════════════════ PHASE: COMPLETE ═══════════════════ */}
          {phase === "complete" && (
            <div className="space-y-6">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-display font-bold text-white">
                  ✔ Aurora Vault Cleared Successfully
                </h3>
                <p className="text-xs text-white/60">
                  Your exported backup remains safely stored inside your Downloads folder.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 text-center">
                <p className="text-2xl font-bold text-emerald-400 font-mono">{freedMb} MB</p>
                <p className="text-xs text-white/70">Storage space freed</p>
              </div>

              <GlassButton
                variant="primary"
                size="lg"
                className="w-full"
                onClick={resetAndClose}
                leftIcon={<CheckCircle2 className="w-5 h-5" />}
              >
                Done
              </GlassButton>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
