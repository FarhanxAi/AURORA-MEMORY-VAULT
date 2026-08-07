"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Heart,
  Calendar,
  Clock,
  MapPin,
  Tag,
  Trash2,
  Volume2,
  ChevronLeft,
  ChevronRight,
  Edit3,
} from "lucide-react";
import { JournalReaderView } from "@/components/experience/journal-reader-view";
import { GlassButton } from "@/components/ui/glass-button";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { SmartImageViewer } from "@/components/ui/smart-image-viewer";
import { Memory } from "@/lib/types";
import { useToast } from "@/lib/toast-context";
import { getSafeMood, formatJournalDateTime } from "@/lib/journal-utils";

interface CinematicMemoryViewerProps {
  memory: Memory | null;
  allMemories: Memory[];
  onClose: () => void;
  onSelectMemory: (memory: Memory) => void;
  onOpenEditModal: (memory: Memory) => void;
  onSoftDelete: (id: string) => void;
  onFavoriteToggle: (id: string, newFavState: boolean) => void;
}

export function CinematicMemoryViewer({
  memory,
  allMemories = [],
  onClose,
  onSelectMemory,
  onOpenEditModal,
  onSoftDelete,
  onFavoriteToggle,
}: CinematicMemoryViewerProps) {
  const { success } = useToast();
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  const activeList = useMemo(
    () => (Array.isArray(allMemories) ? allMemories.filter((m) => m && !m.deleted) : []),
    [allMemories]
  );

  const currentIndex = memory && memory.id
    ? activeList.findIndex((m) => m && m.id === memory.id)
    : -1;

  // Keyboard navigation & Shortcuts (ESC, Left/Right Arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!memory) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && currentIndex > 0) {
        onSelectMemory(activeList[currentIndex - 1]);
      } else if (e.key === "ArrowRight" && currentIndex >= 0 && currentIndex < activeList.length - 1) {
        onSelectMemory(activeList[currentIndex + 1]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [memory, currentIndex, activeList, onClose, onSelectMemory]);

  if (!memory) return null;

  // Strictly check if memory type is journal
  const isJournal = memory.memory_type === "journal";

  const handlePrev = () => {
    if (currentIndex > 0) {
      setZoomLevel(1);
      onSelectMemory(activeList[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (currentIndex >= 0 && currentIndex < activeList.length - 1) {
      setZoomLevel(1);
      onSelectMemory(activeList[currentIndex + 1]);
    }
  };

  const toggleZoom = () => {
    setZoomLevel((prev) => (prev === 1 ? 1.8 : 1));
  };

  const handleSoftDeleteConfirmed = () => {
    if (memory?.id) {
      onSoftDelete(memory.id);
      success("Moved to Trash", `"${memory?.title || "Memory"}" moved to trash vault.`);
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  const safeMood = getSafeMood(memory?.mood);

  return (
    <ErrorBoundary fallbackTitle="Memory Viewer Failed to Render">
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/90 backdrop-blur-2xl"
          />

          {/* Carousel Navigation Arrows */}
          {currentIndex > 0 && (
            <button
              onClick={handlePrev}
              className="fixed left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/50 border border-white/20 text-white/80 hover:text-white hover:bg-black/80 transition-all cursor-pointer hidden sm:block"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {currentIndex >= 0 && currentIndex < activeList.length - 1 && (
            <button
              onClick={handleNext}
              className="fixed right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/50 border border-white/20 text-white/80 hover:text-white hover:bg-black/80 transition-all cursor-pointer hidden sm:block"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-5xl glass-panel rounded-3xl overflow-hidden border border-white/20 shadow-2xl z-10 grid grid-cols-1 lg:grid-cols-3 max-h-[90vh]"
          >
            {/* MAIN PANEL (Left Area: 2 Columns) */}
            <div className="lg:col-span-2 relative flex flex-col min-h-[360px] lg:min-h-[580px] overflow-hidden bg-[#070a14]">
              {isJournal ? (
                /* LUXURY JOURNAL READING EXPERIENCE IN LEFT PANEL */
                <div className="w-full h-full bg-gradient-to-br from-[#0c1023] via-[#090d1a] to-[#04060d] backdrop-blur-2xl border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col">
                  <JournalReaderView
                    memory={memory}
                    onFavoriteToggle={onFavoriteToggle}
                    isEmbeddedInLeftPanel={true}
                  />
                </div>
              ) : (
                /* HIGH RESOLUTION IMAGE CANVAS AREA WITH SMART VIEWER & SKELETON LOADER */
                <div className="relative w-full h-full flex items-center justify-center min-h-[320px] lg:min-h-[550px] overflow-hidden group">
                  <SmartImageViewer
                    memoryOrPath={memory}
                    alt={memory?.title || "Memory Image"}
                    zoomLevel={zoomLevel}
                    onToggleZoom={toggleZoom}
                  />

                  {/* Format Badge Overlay */}
                  <div className="absolute top-4 left-4 flex items-center gap-2 z-30 pointer-events-none">
                    <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-xs font-bold text-aurora-cyan uppercase tracking-wider shadow-lg">
                      {memory?.memory_type || "Photo"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* SIDE INFO PANEL (Right Area: 1 Column) */}
            <div className="p-6 lg:p-8 flex flex-col justify-between overflow-y-auto border-t lg:border-t-0 lg:border-l border-white/10 bg-[#060913]/90 space-y-6">
              <div className="space-y-5">
                {/* Header Actions */}
                <div className="flex items-center justify-between">
                  <span className="px-3.5 py-1 rounded-full bg-white/[0.05] border border-white/12 text-[11px] font-bold text-aurora-violet uppercase tracking-wider">
                    {memory?.category || "Personal"}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => memory?.id && onFavoriteToggle(memory.id, !memory.favorite)}
                      className="p-2 rounded-full bg-white/[0.05] border border-white/10 text-white/80 hover:text-rose-400 cursor-pointer"
                      title={memory?.favorite ? "Starred Favorite" : "Add to favorites"}
                    >
                      <Heart
                        className={`w-4 h-4 ${memory?.favorite ? "fill-rose-500 text-rose-500" : ""}`}
                      />
                    </button>

                    <button
                      onClick={() => onOpenEditModal(memory)}
                      className="p-2 rounded-full bg-white/[0.05] border border-white/10 text-white/80 hover:text-aurora-cyan cursor-pointer"
                      title="Edit Memory"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="p-2 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                      title="Move to Trash"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={onClose}
                      className="p-2 rounded-full bg-white/[0.05] border border-white/10 text-white/60 hover:text-white cursor-pointer"
                      title="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Info Metadata */}
                {!isJournal && (
                  <div className="space-y-3">
                    <h2 className="font-display text-2xl font-bold text-white leading-tight">
                      {memory?.title || "Untitled Memory"}
                    </h2>

                    <div className="space-y-2 text-xs text-white/80">
                      <div className="flex items-center gap-1.5 font-semibold text-aurora-cyan">
                        <Calendar className="w-3.5 h-3.5 text-aurora-cyan shrink-0" />
                        <span>📅 {formatJournalDateTime(memory?.created_at || memory?.memory_date).dayAndDate}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono font-bold text-white">
                        <Clock className="w-3.5 h-3.5 text-aurora-cyan shrink-0" />
                        <span>🕒 {formatJournalDateTime(memory?.created_at || memory?.memory_date).timeStr}</span>
                      </div>
                      {memory?.location && (
                        <div className="flex items-center gap-1.5 font-medium text-white/70">
                          <MapPin className="w-3.5 h-3.5 text-aurora-violet shrink-0" />
                          <span>{memory.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 font-medium text-white/70">
                        <span>{safeMood.emoji}</span>
                        <span>{safeMood.label}</span>
                      </div>
                    </div>

                    {memory?.description && (
                      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                        <h4 className="text-[10px] uppercase font-bold tracking-wider text-white/40">
                          Description Notes
                        </h4>
                        <p className="text-xs text-white/85 leading-relaxed font-light whitespace-pre-wrap">
                          {memory.description}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Voice Memory Player if Present */}
                {memory?.audio_url && (
                  <div className="p-3.5 rounded-2xl bg-aurora-emerald/10 border border-aurora-emerald/30 space-y-1.5">
                    <span className="text-[11px] font-bold text-aurora-emerald flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5" /> Voice Memory Recording
                    </span>
                    <audio src={memory.audio_url} controls className="w-full h-8" />
                  </div>
                )}

                {/* Tags */}
                {Array.isArray(memory?.tags) && memory.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <Tag className="w-3 h-3 text-white/40" />
                    {memory.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-white/70 font-medium"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Sidebar Action Buttons */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <GlassButton
                  type="button"
                  variant="secondary"
                  fullWidth
                  size="sm"
                  onClick={() => memory?.id && onFavoriteToggle(memory.id, !memory.favorite)}
                  leftIcon={
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        memory?.favorite ? "fill-rose-500 text-rose-500" : "text-white/70"
                      }`}
                    />
                  }
                >
                  {memory?.favorite ? "Starred Favorite" : "Add to Favorites"}
                </GlassButton>

                <GlassButton
                  type="button"
                  variant="danger"
                  fullWidth
                  size="sm"
                  onClick={() => {
                    console.log("[DELETE STEP 1] Delete/Trash Button Clicked inside CinematicMemoryViewer");
                    setShowDeleteConfirm(true);
                  }}
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                >
                  Move to Trash
                </GlassButton>
              </div>
            </div>
          </motion.div>

          {/* CONFIRMATION DIALOG MODAL */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div
                onClick={() => setShowDeleteConfirm(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-xl"
              />

              <div className="relative w-full max-w-md glass-panel rounded-3xl p-6 border border-rose-500/30 shadow-2xl z-10 space-y-5 bg-[#0b1020]">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-white">Delete this memory?</h3>
                    <p className="text-xs text-white/60">This memory will move to Trash.</p>
                  </div>
                </div>

                <p className="text-xs text-white/80 leading-relaxed">
                  It can be restored within 30 days from your Trash vault.
                </p>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSoftDeleteConfirmed}
                    className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer shadow-[0_0_20px_rgba(244,63,94,0.4)]"
                  >
                    Move to Trash
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AnimatePresence>
    </ErrorBoundary>
  );
}
