"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Trash2, RotateCcw, Sparkles, Search, CheckSquare, Square, AlertTriangle, FileText, Image as ImageIcon, Video, Clock } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Memory } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/toast-context";

interface TrashViewProps {
  memories: Memory[];
  onRestoreMemory: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onRestoreBatch?: (ids: string[]) => Promise<void>;
  onPermanentDeleteBatch?: (ids: string[]) => Promise<void>;
}

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => Promise<void>;
}

/**
 * Helper to purge media storage files from Supabase buckets
 */
async function purgeMemoryStorageFiles(supabase: any, memory: Memory) {
  const urls = [memory.cover_image, memory.audio_url].filter(Boolean) as string[];
  for (const url of urls) {
    try {
      if (url.includes("memory-images")) {
        const path = url.split("memory-images/")[1];
        if (path) await supabase.storage.from("memory-images").remove([path]);
      }
      if (url.includes("memory-audio")) {
        const path = url.split("memory-audio/")[1];
        if (path) await supabase.storage.from("memory-audio").remove([path]);
      }
    } catch (e) {
      console.warn("Storage cleanup notice:", e);
    }
  }
}

export function TrashArchiveView({
  memories,
  onRestoreMemory,
  onPermanentDelete,
  onRestoreBatch,
  onPermanentDeleteBatch,
}: TrashViewProps) {
  const { success, error } = useToast();
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [confirmModal, setConfirmModal] = useState<ConfirmState>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: async () => {},
  });

  const trashMemories = useMemo(() => memories.filter((m) => m.deleted), [memories]);

  const activeList = useMemo(() => {
    if (!searchFilter.trim()) return trashMemories;
    const q = searchFilter.toLowerCase();
    return trashMemories.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        (m.description || "").toLowerCase().includes(q) ||
        (m.category || "").toLowerCase().includes(q)
    );
  }, [trashMemories, searchFilter]);

  // -------------------------------------------------------------
  // AUTO CLEANUP (30 DAYS EXPIRATION)
  // -------------------------------------------------------------
  useEffect(() => {
    const runAutoCleanup = async () => {
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const nowMs = Date.now();
      const expiredMemories = trashMemories.filter((m) => {
        if (!m.deleted_at) return false;
        const deletedTime = new Date(m.deleted_at).getTime();
        return !isNaN(deletedTime) && nowMs - deletedTime > thirtyDaysMs;
      });

      if (expiredMemories.length === 0) return;

      try {
        const supabase = createClient();
        for (const item of expiredMemories) {
          await purgeMemoryStorageFiles(supabase, item);
        }

        const expiredIds = expiredMemories.map((m) => m.id);
        if (onPermanentDeleteBatch) {
          await onPermanentDeleteBatch(expiredIds);
        } else {
          const { error: dbErr } = await supabase.from("memories").delete().in("id", expiredIds);
          if (!dbErr) {
            expiredIds.forEach((id) => onPermanentDelete(id));
          }
        }
      } catch (err) {
        console.warn("Auto cleanup notice:", err);
      }
    };

    runAutoCleanup();
  }, [trashMemories, onPermanentDelete, onPermanentDeleteBatch]);

  // Selection handlers
  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === activeList.length && activeList.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(activeList.map((m) => m.id));
    }
  };

  const closeConfirm = () => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  };

  // -------------------------------------------------------------
  // EMPTY TRASH
  // -------------------------------------------------------------
  const promptEmptyTrash = () => {
    if (trashMemories.length === 0) return;

    setConfirmModal({
      isOpen: true,
      title: "Empty Trash?",
      message: "This action will permanently delete every memory currently inside Trash. This action cannot be undone.",
      onConfirm: async () => {
        setIsProcessingBatch(true);
        try {
          const targetIds = trashMemories.map((m) => m.id);
          if (onPermanentDeleteBatch) {
            await onPermanentDeleteBatch(targetIds);
          } else {
            const supabase = createClient();
            for (const item of trashMemories) {
              await purgeMemoryStorageFiles(supabase, item);
            }
            const { error: delErr } = await supabase.from("memories").delete().in("id", targetIds);
            if (delErr) throw delErr;
            targetIds.forEach((id) => onPermanentDelete(id));
          }

          setSelectedIds([]);
          success("Trash Emptied", "Trash emptied successfully.");
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Error emptying trash";
          error("Error", msg);
        } finally {
          setIsProcessingBatch(false);
          closeConfirm();
        }
      },
    });
  };

  // -------------------------------------------------------------
  // RESTORE ALL
  // -------------------------------------------------------------
  const handleRestoreAll = async () => {
    if (trashMemories.length === 0) return;

    setIsProcessingBatch(true);
    try {
      const targetIds = trashMemories.map((m) => m.id);
      if (onRestoreBatch) {
        await onRestoreBatch(targetIds);
      } else {
        const supabase = createClient();
        const { error: updateErr } = await supabase
          .from("memories")
          .update({ deleted: false, archived: false, deleted_at: null })
          .in("id", targetIds);
        if (updateErr) throw updateErr;
        targetIds.forEach((id) => onRestoreMemory(id));
      }

      setSelectedIds([]);
      success("Memories Restored", "All memories restored successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error restoring memories";
      error("Restore Error", msg);
    } finally {
      setIsProcessingBatch(false);
    }
  };

  // -------------------------------------------------------------
  // INDIVIDUAL RESTORE
  // -------------------------------------------------------------
  const handleIndividualRestore = async (memory: Memory) => {
    try {
      if (onRestoreBatch) {
        await onRestoreBatch([memory.id]);
      } else {
        const supabase = createClient();
        const { error: updateErr } = await supabase
          .from("memories")
          .update({ deleted: false, archived: false, deleted_at: null })
          .eq("id", memory.id);
        if (updateErr) throw updateErr;
        onRestoreMemory(memory.id);
      }

      setSelectedIds((prev) => prev.filter((id) => id !== memory.id));
      success("Memory Restored", `"${memory.title}" restored successfully.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error restoring memory";
      error("Restore Error", msg);
    }
  };

  // -------------------------------------------------------------
  // INDIVIDUAL PERMANENT DELETE
  // -------------------------------------------------------------
  const promptIndividualPermanentDelete = (memory: Memory) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Permanently?",
      message: `Are you sure you want to permanently delete "${memory.title}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          if (onPermanentDeleteBatch) {
            await onPermanentDeleteBatch([memory.id]);
          } else {
            const supabase = createClient();
            await purgeMemoryStorageFiles(supabase, memory);
            const { error: delErr } = await supabase.from("memories").delete().eq("id", memory.id);
            if (delErr) throw delErr;
            onPermanentDelete(memory.id);
          }

          setSelectedIds((prev) => prev.filter((id) => id !== memory.id));
          success("Permanently Erased", `"${memory.title}" permanently deleted.`);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Error deleting memory";
          error("Delete Error", msg);
        } finally {
          closeConfirm();
        }
      },
    });
  };

  // -------------------------------------------------------------
  // MULTI-SELECT ACTIONS
  // -------------------------------------------------------------
  const handleRestoreSelected = async () => {
    if (selectedIds.length === 0) return;

    setIsProcessingBatch(true);
    try {
      if (onRestoreBatch) {
        await onRestoreBatch(selectedIds);
      } else {
        const supabase = createClient();
        const { error: updateErr } = await supabase
          .from("memories")
          .update({ deleted: false, archived: false, deleted_at: null })
          .in("id", selectedIds);
        if (updateErr) throw updateErr;
        selectedIds.forEach((id) => onRestoreMemory(id));
      }

      setSelectedIds([]);
      success("Selected Restored", "Selected memories restored successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error restoring selected memories";
      error("Restore Error", msg);
    } finally {
      setIsProcessingBatch(false);
    }
  };

  const promptDeleteSelected = () => {
    if (selectedIds.length === 0) return;

    setConfirmModal({
      isOpen: true,
      title: "Delete Selected Permanently?",
      message: `Are you sure you want to permanently delete the ${selectedIds.length} selected memory item(s)? This action cannot be undone.`,
      onConfirm: async () => {
        setIsProcessingBatch(true);
        try {
          if (onPermanentDeleteBatch) {
            await onPermanentDeleteBatch(selectedIds);
          } else {
            const supabase = createClient();
            const targetMemories = trashMemories.filter((m) => selectedIds.includes(m.id));
            for (const item of targetMemories) {
              await purgeMemoryStorageFiles(supabase, item);
            }
            const { error: delErr } = await supabase.from("memories").delete().in("id", selectedIds);
            if (delErr) throw delErr;
            selectedIds.forEach((id) => onPermanentDelete(id));
          }

          setSelectedIds([]);
          success("Selected Deleted", "Selected memories deleted permanently.");
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Error deleting selected items";
          error("Delete Error", msg);
        } finally {
          setIsProcessingBatch(false);
          closeConfirm();
        }
      },
    });
  };

  return (
    <div className="space-y-6 my-8">
      {/* Header Bar */}
      <div className="p-5 rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-white/[0.06] border border-white/10">
            <Trash2 className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <span>Vault Trash</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono">
                {trashMemories.length} items
              </span>
            </h3>
            <p className="text-xs text-white/50">
              Deleted items auto-cleanup after 30 days
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {trashMemories.length > 0 && (
            <button
              type="button"
              onClick={promptEmptyTrash}
              disabled={isProcessingBatch}
              className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_12px_rgba(244,63,94,0.2)]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Empty Trash</span>
            </button>
          )}

          {trashMemories.length > 0 && (
            <button
              type="button"
              onClick={handleRestoreAll}
              disabled={isProcessingBatch}
              className="px-4 py-2 rounded-xl bg-aurora-cyan/20 hover:bg-aurora-cyan/30 border border-aurora-cyan/40 text-aurora-cyan text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_12px_rgba(56,189,248,0.2)]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore All</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Multi-Select Bar */}
      {trashMemories.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/10 text-xs">
          {/* Search Input */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Trash..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-aurora-cyan"
            />
          </div>

          {/* Select All & Multi Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors cursor-pointer font-semibold"
            >
              {selectedIds.length === activeList.length && activeList.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-aurora-cyan" />
              ) : (
                <Square className="w-4 h-4 text-white/40" />
              )}
              <span>Select All ({activeList.length})</span>
            </button>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRestoreSelected}
                  disabled={isProcessingBatch}
                  className="px-3 py-1.5 rounded-xl bg-aurora-cyan/20 hover:bg-aurora-cyan/30 text-aurora-cyan border border-aurora-cyan/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Selected ({selectedIds.length})</span>
                </button>

                <button
                  type="button"
                  onClick={promptDeleteSelected}
                  disabled={isProcessingBatch}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedIds.length})</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trash Grid */}
      {activeList.length === 0 ? (
        <GlassCard className="p-12 text-center max-w-md mx-auto space-y-3">
          <Sparkles className="w-8 h-8 text-white/40 mx-auto" />
          <h4 className="font-display font-bold text-white text-lg">
            No items in Trash
          </h4>
          <p className="text-xs text-white/50">
            Deleted memories are retained here before automatic or manual purging.
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {activeList.map((m) => {
            const isSelected = selectedIds.includes(m.id);

            return (
              <GlassCard
                key={m.id}
                glowColor="none"
                className={`p-4 flex flex-col justify-between h-full space-y-4 border-white/12 transition-all relative ${
                  isSelected ? "border-aurora-cyan bg-aurora-cyan/[0.04]" : ""
                }`}
              >
                {/* Select Checkbox Overlay (Top-Left Only) */}
                <button
                  type="button"
                  onClick={() => toggleSelectId(m.id)}
                  className="absolute top-3 left-3 z-20 p-1 rounded-lg bg-black/70 backdrop-blur-md text-white border border-white/20 hover:scale-110 transition-transform cursor-pointer"
                  title="Select Item"
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-aurora-cyan" />
                  ) : (
                    <Square className="w-4 h-4 text-white/50" />
                  )}
                </button>

                {/* Media Preview or Icon Header */}
                {m.cover_image ? (
                  <div className="w-full h-36 rounded-xl overflow-hidden bg-black/40 border border-white/10">
                    <img src={m.cover_image} alt={m.title} className="w-full h-full object-cover grayscale opacity-80" />
                  </div>
                ) : (
                  <div className="w-full h-36 rounded-xl overflow-hidden bg-white/[0.03] border border-white/10 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-white/30" />
                  </div>
                )}

                {/* Memory Meta */}
                <div className="space-y-1.5 flex-1">
                  <h4 className="font-display font-bold text-white text-base truncate">{m.title}</h4>
                  <p className="text-[10px] text-white/50">{m.memory_date} • {m.category || "Personal"}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-300 font-mono font-semibold">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>
                      {(() => {
                        if (!m.deleted_at) return "30 days remaining";
                        const deletedTime = new Date(m.deleted_at).getTime();
                        if (isNaN(deletedTime)) return "30 days remaining";
                        const remainingDays = Math.max(1, Math.ceil((30 * 24 * 60 * 60 * 1000 - (Date.now() - deletedTime)) / (24 * 60 * 60 * 1000)));
                        return `${remainingDays} days remaining`;
                      })()}
                    </span>
                  </div>
                </div>

                {/* SINGLE UNIFIED BOTTOM ACTION SECTION (RESTORE + DELETE PERMANENTLY TOGETHER) */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2 mt-auto">
                  <button
                    type="button"
                    onClick={() => handleIndividualRestore(m)}
                    className="px-3 py-1.5 rounded-xl bg-aurora-cyan/20 hover:bg-aurora-cyan/30 border border-aurora-cyan/40 text-aurora-cyan text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_10px_rgba(56,189,248,0.2)]"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => promptIndividualPermanentDelete(m)}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_10px_rgba(244,63,94,0.2)]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Permanently</span>
                  </button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* CONFIRMATION DIALOG MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            onClick={closeConfirm}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl"
          />

          {/* Modal Card */}
          <div className="relative w-full max-w-md glass-panel rounded-3xl p-6 border border-white/20 shadow-2xl z-10 space-y-5 bg-[#0b1020]">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-white">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-rose-300 font-medium">Permanent Action Warning</p>
              </div>
            </div>

            <p className="text-xs text-white/80 leading-relaxed">
              {confirmModal.message}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeConfirm}
                className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmModal.onConfirm}
                disabled={isProcessingBatch}
                className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer shadow-[0_0_20px_rgba(244,63,94,0.4)]"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
