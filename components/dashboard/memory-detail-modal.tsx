"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Heart,
  Calendar,
  Clock,
  MapPin,
  Tag,
  Lock,
  Trash2,
  Volume2,
} from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { SmartImageViewer } from "@/components/ui/smart-image-viewer";
import { Memory } from "@/lib/types";
import { JournalReaderView } from "@/components/experience/journal-reader-view";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/toast-context";
import { getSafeMood, formatJournalDateTime } from "@/lib/journal-utils";

interface MemoryDetailModalProps {
  memory: Memory | null;
  onClose: () => void;
  onMemoryDeleted: (id: string) => void;
  onFavoriteToggle: (id: string, newFavState: boolean) => void;
}

export function MemoryDetailModal({
  memory,
  onClose,
  onMemoryDeleted,
  onFavoriteToggle,
}: MemoryDetailModalProps) {
  const { success, error } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!memory) return null;

  const handleDelete = async () => {
    if (!memory?.id) return;
    if (!confirm(`Delete "${memory?.title || "Memory"}"?\n\nThis memory will move to Trash. It can be restored within 30 days.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      success("Moved to Trash", `"${memory.title}" was moved to trash vault.`);
      onMemoryDeleted(memory.id);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error deleting memory";
      error("Delete Error", msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const safeMood = getSafeMood(memory?.mood);

  return (
    <ErrorBoundary fallbackTitle="Memory Detail Failed to Load">
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.35 }}
            className="relative w-full max-w-3xl glass-panel rounded-3xl p-6 sm:p-8 border border-white/20 shadow-2xl z-10 max-h-[90vh] overflow-y-auto space-y-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-aurora-cyan/20 border border-aurora-cyan/40 text-xs font-bold text-aurora-cyan uppercase tracking-wider">
                  {memory?.category || "Personal"}
                </span>
                <span className="text-xs text-white/50 flex items-center gap-1 font-mono">
                  <Lock className="w-3.5 h-3.5" />
                  RLS Encrypted
                </span>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-full bg-white/[0.05] border border-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cover Media Header if Present */}
            {(memory?.cover_image || memory?.memory_type === "photo") && (
              <div className="relative w-full h-72 sm:h-96 rounded-2xl overflow-hidden border border-white/15">
                <SmartImageViewer
                  memoryOrPath={memory}
                  alt={memory?.title || "Cover Image"}
                />
              </div>
            )}

            {/* Audio Recording */}
            {memory?.audio_url && (
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
                <span className="text-xs uppercase font-bold text-aurora-emerald flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  Voice Memory Recording
                </span>
                <audio src={memory.audio_url} controls className="w-full" />
              </div>
            )}

            {/* Details Body */}
            <div className="space-y-4">
              {memory?.memory_type === "journal" ? (
                <JournalReaderView memory={memory} onFavoriteToggle={onFavoriteToggle} />
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
                      {memory?.title || "Untitled Memory"}
                    </h2>

                    <button
                      onClick={() => memory?.id && onFavoriteToggle(memory.id, !memory.favorite)}
                      className="p-2.5 rounded-full bg-white/[0.05] border border-white/15 text-white/80 hover:text-rose-400 cursor-pointer"
                    >
                      <Heart
                        className={`w-5 h-5 ${memory?.favorite ? "fill-rose-500 text-rose-500" : ""}`}
                      />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-white/80">
                    <span className="flex items-center gap-1.5 font-semibold text-aurora-cyan">
                      <Calendar className="w-4 h-4 text-aurora-cyan" />
                      <span>📅 {formatJournalDateTime(memory?.created_at || memory?.memory_date).dayAndDate}</span>
                    </span>
                    <span className="flex items-center gap-1.5 font-mono font-bold text-white">
                      <Clock className="w-3.5 h-3.5 text-aurora-cyan" />
                      <span>🕒 {formatJournalDateTime(memory?.created_at || memory?.memory_date).timeStr}</span>
                    </span>
                    {memory?.location && (
                      <span className="flex items-center gap-1.5 font-medium">
                        <MapPin className="w-4 h-4 text-aurora-violet" />
                        {memory.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 font-medium">
                      <span>{safeMood.emoji}</span>
                      <span>{safeMood.label}</span>
                    </span>
                  </div>

                  {memory?.description && (
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                      <h4 className="text-xs uppercase font-bold text-white/40 tracking-wider">
                        Journal / Memory Notes
                      </h4>
                      <p className="text-sm text-white/85 leading-relaxed font-light whitespace-pre-wrap">
                        {memory.description}
                      </p>
                    </div>
                  )}
                </>
              )}

              {Array.isArray(memory?.tags) && memory.tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap pt-2">
                  <Tag className="w-3.5 h-3.5 text-white/40" />
                  {memory.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-white/70 font-semibold"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <GlassButton
                variant="danger"
                size="sm"
                onClick={handleDelete}
                isLoading={isDeleting}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Delete Memory
              </GlassButton>

              <GlassButton variant="secondary" size="sm" onClick={onClose}>
                Close Vault Item
              </GlassButton>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    </ErrorBoundary>
  );
}
