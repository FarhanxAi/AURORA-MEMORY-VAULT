"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Sparkles,
  Heart,
  Image as ImageIcon,
  BookOpen,
  Calendar,
  Tag,
  TrendingUp,
  Search,
  Plus,
  Maximize2,
  X,
  Plus as PlusIcon,
  Minus,
  RotateCcw,
} from "lucide-react";
import { Memory } from "@/lib/types";
import { calculateInsightMetrics } from "@/lib/intelligence";
import { MemoryCard } from "@/components/dashboard/memory-card";

interface InsightsDashboardProps {
  memories: Memory[];
  userEmail?: string;
  onSelectMemory?: (memory: Memory) => void;
  onFavoriteToggle?: (id: string, state: boolean) => void;
  onSoftDelete?: (id: string) => void;
  onArchiveToggle?: (id: string, state: boolean) => void;
  onOpenCreateModal?: (defaultType?: "photo" | "journal") => void;
}

export function InsightsDashboard({
  memories,
  onSelectMemory,
  onFavoriteToggle,
  onSoftDelete,
  onArchiveToggle,
  onOpenCreateModal,
}: InsightsDashboardProps) {
  const activeMemories = useMemo(() => memories.filter((m) => !m.deleted), [memories]);
  const metrics = useMemo(() => calculateInsightMetrics(activeMemories), [activeMemories]);

  // Static Memory Vault Image Lightbox state (100% Client-Side, Zero Storage/Backend)
  const [isVaultLightboxOpen, setIsVaultLightboxOpen] = useState(false);
  const [vaultScale, setVaultScale] = useState(1);
  const [vaultPan, setVaultPan] = useState({ x: 0, y: 0 });
  const [isVaultDragging, setIsVaultDragging] = useState(false);
  const vaultDragStartRef = useRef({ x: 0, y: 0 });
  const vaultLastTouchDistRef = useRef<number | null>(null);
  const vaultLastTapRef = useRef<number>(0);

  // ESC key handler for static lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isVaultLightboxOpen) {
        closeVaultLightbox();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVaultLightboxOpen]);

  const openVaultLightbox = () => {
    setVaultScale(1);
    setVaultPan({ x: 0, y: 0 });
    setIsVaultLightboxOpen(true);
  };

  const closeVaultLightbox = () => {
    setIsVaultLightboxOpen(false);
    setVaultScale(1);
    setVaultPan({ x: 0, y: 0 });
    setIsVaultDragging(false);
  };

  const handleVaultZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setVaultScale((prev) => Math.min(5, Math.round((prev + 0.5) * 10) / 10));
  };

  const handleVaultZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setVaultScale((prev) => {
      const next = Math.max(1, Math.round((prev - 0.5) * 10) / 10);
      if (next === 1) setVaultPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleVaultResetZoom = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setVaultScale(1);
    setVaultPan({ x: 0, y: 0 });
  };

  const handleVaultWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setVaultScale((prev) => {
      const next = Math.max(1, Math.min(5, Math.round((prev + delta) * 100) / 100));
      if (next === 1) setVaultPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleVaultDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (vaultScale > 1) {
      handleVaultResetZoom();
    } else {
      setVaultScale(2.5);
    }
  };

  const handleVaultMouseDown = (e: React.MouseEvent) => {
    if (vaultScale <= 1) return;
    e.stopPropagation();
    setIsVaultDragging(true);
    vaultDragStartRef.current = { x: e.clientX - vaultPan.x, y: e.clientY - vaultPan.y };
  };

  const handleVaultMouseMove = (e: React.MouseEvent) => {
    if (!isVaultDragging || vaultScale <= 1) return;
    e.stopPropagation();
    setVaultPan({
      x: e.clientX - vaultDragStartRef.current.x,
      y: e.clientY - vaultDragStartRef.current.y,
    });
  };

  const handleVaultMouseUp = () => {
    setIsVaultDragging(false);
  };

  const handleVaultTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      vaultLastTouchDistRef.current = dist;
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - vaultLastTapRef.current < 300) {
        if (vaultScale > 1) {
          handleVaultResetZoom();
        } else {
          setVaultScale(2.5);
        }
      }
      vaultLastTapRef.current = now;

      if (vaultScale > 1) {
        setIsVaultDragging(true);
        vaultDragStartRef.current = {
          x: e.touches[0].clientX - vaultPan.x,
          y: e.touches[0].clientY - vaultPan.y,
        };
      }
    }
  };

  const handleVaultTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && vaultLastTouchDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = (dist - vaultLastTouchDistRef.current) * 0.008;
      setVaultScale((prev) => {
        const next = Math.max(1, Math.min(5, Math.round((prev + delta) * 100) / 100));
        if (next === 1) setVaultPan({ x: 0, y: 0 });
        return next;
      });
      vaultLastTouchDistRef.current = dist;
    } else if (e.touches.length === 1 && isVaultDragging && vaultScale > 1) {
      setVaultPan({
        x: e.touches[0].clientX - vaultDragStartRef.current.x,
        y: e.touches[0].clientY - vaultDragStartRef.current.y,
      });
    }
  };

  const handleVaultTouchEnd = () => {
    vaultLastTouchDistRef.current = null;
    setIsVaultDragging(false);
  };

  // CARD 1: Memory Journey Data (Real-time dynamic calculation)
  const memoryJourney = useMemo(() => {
    if (activeMemories.length === 0) return null;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentMonthName = now.toLocaleString("en-US", { month: "long" });

    const validMemoriesWithDates = activeMemories
      .map((m) => {
        const d = new Date(m.memory_date || m.created_at);
        return { memory: m, date: d };
      })
      .filter((item) => !isNaN(item.date.getTime()))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const total = activeMemories.length;
    const firstDate = validMemoriesWithDates[0]?.date;
    const latestDate = validMemoriesWithDates[validMemoriesWithDates.length - 1]?.date;

    const formatDate = (d?: Date) =>
      d ? d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "N/A";

    const currentYearCount = validMemoriesWithDates.filter(
      (item) => item.date.getFullYear() === currentYear
    ).length;

    const currentMonthCount = validMemoriesWithDates.filter(
      (item) => item.date.getFullYear() === currentYear && item.date.getMonth() === currentMonth
    ).length;

    return {
      total,
      firstDateStr: formatDate(firstDate),
      latestDateStr: formatDate(latestDate),
      currentYear,
      currentYearCount,
      currentMonthName,
      currentMonthCount,
    };
  }, [activeMemories]);

  // Section search queries
  const [photoSearch, setPhotoSearch] = useState("");
  const [journalSearch, setJournalSearch] = useState("");

  const photoMemories = useMemo(() => {
    return activeMemories.filter((m) => {
      const isType = m.memory_type === "photo" || Boolean(m.cover_image);
      if (!isType) return false;
      if (!photoSearch.trim()) return true;
      const q = photoSearch.toLowerCase();
      return (
        m.title.toLowerCase().includes(q) ||
        (m.description || "").toLowerCase().includes(q) ||
        (m.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [activeMemories, photoSearch]);

  const journalMemories = useMemo(() => {
    return activeMemories.filter((m) => {
      const isType = m.memory_type === "journal";
      if (!isType) return false;
      if (!journalSearch.trim()) return true;
      const q = journalSearch.toLowerCase();
      return (
        m.title.toLowerCase().includes(q) ||
        (m.description || "").toLowerCase().includes(q) ||
        (m.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [activeMemories, journalSearch]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Bar */}
      <div className="glass-panel p-6 rounded-3xl border border-white/12 flex items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-aurora-cyan via-indigo-500 to-aurora-violet p-0.5 shadow-aurora-glow">
            <div className="w-full h-full bg-[#030712] rounded-[14px] flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-aurora-cyan" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white tracking-tight">
              Vault Intelligence & Analytics
            </h2>
            <p className="text-xs text-white/50">
              Real-time insights generated from your personal Aurora Vault.
            </p>
          </div>
        </div>
      </div>

      {/* Top Quick Numbers Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {[
          {
            label: "Total Memories",
            value: metrics.totalMemories,
            icon: <Sparkles className="w-4 h-4 text-aurora-cyan" />,
            borderColor: "border-aurora-cyan/40",
          },
          {
            label: "Favorites",
            value: metrics.favoriteCount,
            icon: <Heart className="w-4 h-4 text-rose-400" />,
            borderColor: "border-rose-500/40",
          },
          {
            label: "Photos",
            value: metrics.photosCount,
            icon: <ImageIcon className="w-4 h-4 text-sky-400" />,
            borderColor: "border-sky-500/40",
          },
          {
            label: "Journals",
            value: metrics.journalsCount,
            icon: <BookOpen className="w-4 h-4 text-amber-400" />,
            borderColor: "border-amber-500/40",
          },
        ].map((item, idx) => (
          <div
            key={idx}
            className={`glass-panel p-4 rounded-3xl border ${item.borderColor} space-y-1 hover:scale-105 transition-transform duration-300 shadow-lg`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-white/50">{item.label}</span>
              {item.icon}
            </div>
            <p className="text-2xl font-display font-bold text-white">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Main Analytics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Redesigned Activity Highlights (2 Premium Cards) */}
        <div className="glass-panel p-6 rounded-3xl border border-white/12 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-aurora-cyan" />
              <span>Activity Highlights</span>
            </h3>
            <span className="text-[11px] font-medium text-white/40">Real-time Insights</span>
          </div>

          {!memoryJourney || activeMemories.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/8 text-center space-y-2">
              <Sparkles className="w-6 h-6 text-white/30 mx-auto" />
              <p className="text-sm font-medium text-white/60">
                Start creating memories to unlock your insights.
              </p>
            </div>
          ) : (
            <div className="w-full">
              {/* CARD 1: Memory Journey */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent border border-white/10 space-y-3.5 relative overflow-hidden group hover:border-aurora-cyan/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-aurora-cyan/15 text-aurora-cyan border border-aurora-cyan/30">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <h4 className="text-sm font-bold text-white">Memory Journey</h4>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-aurora-cyan/10 border border-aurora-cyan/20 text-aurora-cyan font-semibold">
                    Live
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-white/[0.06]">
                    <span className="text-white/50">Total Memories</span>
                    <span className="font-mono font-bold text-white text-sm">{memoryJourney.total}</span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-white/[0.06]">
                    <span className="text-white/50">First Memory</span>
                    <span className="font-semibold text-white/90">{memoryJourney.firstDateStr}</span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-white/[0.06]">
                    <span className="text-white/50">Latest Memory</span>
                    <span className="font-semibold text-white/90">{memoryJourney.latestDateStr}</span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-white/[0.06]">
                    <span className="text-white/50">{memoryJourney.currentYear} Memories</span>
                    <span className="font-mono font-bold text-aurora-cyan">{memoryJourney.currentYearCount}</span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-white/50">{memoryJourney.currentMonthName} Memories</span>
                    <span className="font-mono font-bold text-aurora-cyan">{memoryJourney.currentMonthCount}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Memory Vault Static UI Image Card (100% Pure Local Static Asset) */}
        <div
          className="glass-panel rounded-3xl border border-white/12 shadow-xl overflow-hidden cursor-zoom-in relative group"
          onClick={openVaultLightbox}
          title="Click to view full screen"
        >
          <img
            src="/memory-vault.jpg"
            alt="Memory Vault"
            className="w-full h-auto object-contain rounded-3xl group-hover:scale-[1.02] transition-transform duration-500"
          />
          <div className="absolute bottom-3 right-3 p-2 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white/80 group-hover:text-white transition-all shadow-lg">
            <Maximize2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* --- PURE CLIENT-SIDE STATIC LIGHTBOX MODAL (Zero Storage / Backend Calls) --- */}
      <AnimatePresence>
        {isVaultLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl select-none overflow-hidden touch-none"
            onWheel={handleVaultWheel}
            onClick={closeVaultLightbox}
          >
            {/* Top Bar Controls */}
            <div
              className="absolute top-4 left-4 right-4 z-[110] flex items-center justify-between pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-xs font-semibold text-white/90 shadow-xl">
                Memory Vault
              </div>

              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/15 rounded-full p-1.5 shadow-2xl">
                <button
                  type="button"
                  onClick={handleVaultZoomOut}
                  className="p-2 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
                  title="Zoom Out (-)"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <span className="px-2 font-mono text-xs font-bold text-aurora-cyan min-w-[50px] text-center">
                  {Math.round(vaultScale * 100)}%
                </span>

                <button
                  type="button"
                  onClick={handleVaultZoomIn}
                  className="p-2 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
                  title="Zoom In (+)"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>

                {vaultScale !== 1 && (
                  <button
                    type="button"
                    onClick={handleVaultResetZoom}
                    className="p-2 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
                    title="Reset Zoom (100%)"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}

                <div className="w-[1px] h-5 bg-white/20 mx-1" />

                <button
                  type="button"
                  onClick={closeVaultLightbox}
                  className="p-2 rounded-full bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 hover:text-white transition-colors cursor-pointer"
                  title="Close (ESC)"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* Interactive Zoomable & Pannable Static Image Canvas */}
            <div
              className="relative w-full h-full flex items-center justify-center p-4 sm:p-8 overflow-hidden cursor-default"
              onClick={closeVaultLightbox}
              onMouseDown={handleVaultMouseDown}
              onMouseMove={handleVaultMouseMove}
              onMouseUp={handleVaultMouseUp}
              onMouseLeave={handleVaultMouseUp}
              onTouchStart={handleVaultTouchStart}
              onTouchMove={handleVaultTouchMove}
              onTouchEnd={handleVaultTouchEnd}
            >
              <div
                className="relative flex items-center justify-center max-w-full max-h-full transition-transform duration-100 ease-out"
                style={{
                  transform: `translate3d(${vaultPan.x}px, ${vaultPan.y}px, 0px) scale(${vaultScale})`,
                  cursor: vaultScale > 1 ? (isVaultDragging ? "grabbing" : "grab") : "zoom-in",
                }}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={handleVaultDoubleClick}
              >
                <img
                  src="/memory-vault.jpg"
                  alt="Memory Vault"
                  className="max-w-full max-h-[85vh] sm:max-h-[90vh] object-contain rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] pointer-events-auto"
                />
              </div>
            </div>

            {/* Bottom Helper Hint */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[110] pointer-events-none hidden sm:block">
              <p className="px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-medium text-white/60 shadow-lg">
                Double-click or scroll to zoom • Drag to pan when zoomed • Press ESC or click outside to close
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- REAL CONTENT SECTIONS AT BOTTOM OF INSIGHTS PAGE --- */}
      <div className="space-y-10 pt-6 border-t border-white/10">
        {/* 📷 1. PHOTO MEMORIES SECTION */}
        <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/12 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-sky-500/20 border border-sky-400/40 text-sky-400">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-white">📷 Photo Memories</h3>
                <p className="text-xs text-white/50">Every saved image memory in your encrypted vault</p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Search photo memories..."
                  value={photoSearch}
                  onChange={(e) => setPhotoSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs text-white bg-white/[0.05] border border-white/10 focus:border-sky-400 outline-none placeholder-white/30"
                />
              </div>
              <button
                onClick={() => onOpenCreateModal?.("photo")}
                className="px-3 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Photo
              </button>
            </div>
          </div>

          {photoMemories.length === 0 ? (
            <div className="py-12 text-center space-y-3 bg-white/[0.02] rounded-2xl border border-dashed border-white/10">
              <ImageIcon className="w-10 h-10 text-white/20 mx-auto" />
              <p className="text-sm font-semibold text-white/70">No Photo Memories Yet</p>
              <p className="text-xs text-white/40 max-w-sm mx-auto">
                Capture life moments by adding your first image memory to your vault.
              </p>
              <button
                onClick={() => onOpenCreateModal?.("photo")}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-aurora-cyan/20 border border-aurora-cyan/50 text-aurora-cyan text-xs font-bold hover:bg-aurora-cyan/30 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                + Add Photo Memory
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {photoMemories.map((m) => (
                <MemoryCard
                  key={m.id}
                  memory={m}
                  onSelectMemory={(mem: Memory) => onSelectMemory?.(mem)}
                  onFavoriteToggle={(id: string, state: boolean) => onFavoriteToggle?.(id, state)}
                />
              ))}
            </div>
          )}
        </section>

        {/* 📖 3. JOURNAL MEMORIES SECTION */}
        <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/12 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-white">📖 Journal Memories</h3>
                <p className="text-xs text-white/50">Every written log and journal reflection in your encrypted vault</p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Search journal notes..."
                  value={journalSearch}
                  onChange={(e) => setJournalSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs text-white bg-white/[0.05] border border-white/10 focus:border-amber-400 outline-none placeholder-white/30"
                />
              </div>
              <button
                onClick={() => onOpenCreateModal?.("journal")}
                className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Journal
              </button>
            </div>
          </div>

          {journalMemories.length === 0 ? (
            <div className="py-12 text-center space-y-3 bg-[#020617]/50 rounded-2xl border border-dashed border-white/10">
              <BookOpen className="w-10 h-10 text-white/20 mx-auto" />
              <p className="text-sm font-semibold text-white/70">No Journal Memories Yet</p>
              <p className="text-xs text-white/40 max-w-sm mx-auto">
                Document your thoughts and stories by adding journal reflections.
              </p>
              <button
                onClick={() => onOpenCreateModal?.("journal")}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-bold hover:bg-amber-500/30 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                + Add Journal Memory
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {journalMemories.map((m) => (
                <MemoryCard
                  key={m.id}
                  memory={m}
                  onSelectMemory={(mem: Memory) => onSelectMemory?.(mem)}
                  onFavoriteToggle={(id: string, state: boolean) => onFavoriteToggle?.(id, state)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
