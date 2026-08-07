"use client";

import React, { useState, useMemo, useDeferredValue, useEffect } from "react";
import {
  Sparkles,
  Search,
  Plus,
  Image as ImageIcon,
  BookOpen,
  Heart,
  Grid,
  X,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { Memory } from "@/lib/types";
import { MemoryCard } from "@/components/dashboard/memory-card";
import { DashboardFilterKey } from "@/components/dashboard/stats-grid";
import { getMemoryTimestamp } from "@/lib/journal-utils";

interface UnifiedTimelineGalleryProps {
  memories: Memory[];
  activeFilter: DashboardFilterKey;
  onSelectFilter: (filter: DashboardFilterKey) => void;
  onSelectMemory: (memory: Memory) => void;
  onFavoriteToggle: (id: string, state: boolean) => void;
  onOpenCreateModal: (defaultType?: "photo" | "journal") => void;
}

const PAGE_SIZE = 24;

export function UnifiedTimelineGallery({
  memories,
  activeFilter,
  onSelectFilter,
  onSelectMemory,
  onFavoriteToggle,
  onOpenCreateModal,
}: UnifiedTimelineGalleryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<"newest" | "oldest">("newest");
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  // Deferred search query prevents input frame-drops and typing lag
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Single Source of Truth Filtering, Searching & Sorting Logic
  const filteredMemories = useMemo(() => {
    return memories
      .filter((m) => !m.deleted && !m.archived)
      .filter((m) => {
        // 1. Media Type & Category Filtering
        if (activeFilter === "photo" && m.memory_type !== "photo" && !m.cover_image) return false;
        if (activeFilter === "journal" && m.memory_type !== "journal") return false;
        if (activeFilter === "favorite" && !m.favorite) return false;

        // 2. Realtime Search across Title, Description, Tags, Category, Mood, Location, Date
        if (deferredSearchQuery.trim()) {
          const q = deferredSearchQuery.toLowerCase().trim();
          const d = new Date(m.memory_date || m.created_at);
          const monthStr = isNaN(d.getTime()) ? "" : d.toLocaleString("default", { month: "long" }).toLowerCase();
          const yearStr = isNaN(d.getTime()) ? "" : d.getFullYear().toString();

          const matchTitle = (m.title || "").toLowerCase().includes(q);
          const matchDesc = (m.description || "").toLowerCase().includes(q);
          const matchCategory = (m.category || "").toLowerCase().includes(q);
          const matchMood = (m.mood || "").toLowerCase().includes(q);
          const matchLocation = (m.location || "").toLowerCase().includes(q);
          const matchTags = (m.tags || []).some((t) => t.toLowerCase().includes(q));
          const matchDate = (m.memory_date || m.created_at || "").toLowerCase().includes(q);
          const matchMonth = monthStr.includes(q);
          const matchYear = yearStr.includes(q);

          return (
            matchTitle ||
            matchDesc ||
            matchCategory ||
            matchMood ||
            matchLocation ||
            matchTags ||
            matchDate ||
            matchMonth ||
            matchYear
          );
        }

        return true;
      })
      .sort((a, b) => {
        // 3. Strict Sort: Newest First (DESC) or Oldest First (ASC)
        const timeA = getMemoryTimestamp(a);
        const timeB = getMemoryTimestamp(b);

        if (timeA === timeB) {
          return (b.id || "").localeCompare(a.id || "");
        }

        if (sortOption === "oldest") {
          return timeA - timeB; // ASC (Oldest First)
        }
        return timeB - timeA; // DESC (Newest First)
      });
  }, [memories, activeFilter, deferredSearchQuery, sortOption]);

  // Reset pagination batch when filters, search query or sorting changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeFilter, deferredSearchQuery, sortOption]);

  // Progressive infinite scroll listener for large memory datasets (up to 10,000+ items)
  useEffect(() => {
    const handleScroll = () => {
      if (visibleCount >= filteredMemories.length) return;
      const scrollPosition = window.innerHeight + window.scrollY;
      const threshold = document.documentElement.offsetHeight - 500;
      if (scrollPosition >= threshold) {
        setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredMemories.length));
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [visibleCount, filteredMemories.length]);

  const displayedMemories = useMemo(() => {
    return filteredMemories.slice(0, visibleCount);
  }, [filteredMemories, visibleCount]);

  return (
    <section id="unified-memory-gallery" className="space-y-6 pt-4">
      {/* Header & Controls Bar */}
      <div className="glass-panel p-6 rounded-3xl border border-white/12 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-aurora-cyan via-indigo-500 to-aurora-violet p-0.5 shadow-aurora-glow">
              <div className="w-full h-full bg-[#030712] rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-aurora-cyan" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-white tracking-tight">
                Unified Timeline Gallery
              </h2>
              <p className="text-xs text-white/50">
                Single source of truth timeline dataset ({filteredMemories.length} {filteredMemories.length === 1 ? "memory" : "memories"})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            {/* Realtime Search Input */}
            <div className="relative flex-1 md:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search title, tag, mood, location, date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 rounded-2xl text-xs text-white bg-white/[0.05] border border-white/12 focus:border-aurora-cyan outline-none placeholder-white/30 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Add Memory Button */}
            <button
              onClick={() => onOpenCreateModal("photo")}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-aurora-cyan to-aurora-violet text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shadow-aurora-glow hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Memory</span>
            </button>
          </div>
        </div>

        {/* Filter Pills Selector & Sort Dropdown */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 select-none border-t border-white/10 pt-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="text-[11px] uppercase font-bold tracking-wider text-white/40 flex items-center gap-1 pr-1 shrink-0">
              <Filter className="w-3 h-3 text-aurora-cyan" />
              Filter:
            </span>
            {[
              { id: "all", label: "All Items", icon: <Grid className="w-3.5 h-3.5" /> },
              { id: "photo", label: "Photos", icon: <ImageIcon className="w-3.5 h-3.5 text-sky-400" /> },
              { id: "journal", label: "Journals", icon: <BookOpen className="w-3.5 h-3.5 text-amber-400" /> },
              { id: "favorite", label: "Favorites", icon: <Heart className="w-3.5 h-3.5 text-rose-400" /> },
            ].map((pill) => {
              const isActive = activeFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => onSelectFilter(pill.id as DashboardFilterKey)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer border ${
                    isActive
                      ? "bg-aurora-cyan/20 border-aurora-cyan text-white shadow-aurora-glow font-bold"
                      : "bg-white/[0.04] border-white/10 text-white/70 hover:text-white hover:bg-white/[0.08]"
                  }`}
                >
                  {pill.icon}
                  <span>{pill.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[11px] uppercase font-bold tracking-wider text-white/40 flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-aurora-cyan" />
              Sort:
            </span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as "newest" | "oldest")}
              className="rounded-full py-1.5 px-3.5 text-xs text-white bg-[#0b1020] border border-white/15 outline-none cursor-pointer hover:border-aurora-cyan/50 font-semibold transition-all"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>

            {(activeFilter !== "all" || searchQuery || sortOption !== "newest") && (
              <button
                onClick={() => {
                  onSelectFilter("all");
                  setSearchQuery("");
                  setSortOption("newest");
                }}
                className="text-xs text-aurora-cyan hover:underline font-semibold ml-2 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Single Timeline Gallery Grid */}
      {filteredMemories.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border border-white/10 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto text-aurora-cyan">
            {activeFilter === "photo" ? (
              <ImageIcon className="w-8 h-8 text-sky-400" />
            ) : activeFilter === "journal" ? (
              <BookOpen className="w-8 h-8 text-amber-400" />
            ) : activeFilter === "favorite" ? (
              <Heart className="w-8 h-8 text-rose-400" />
            ) : (
              <Sparkles className="w-8 h-8 text-aurora-cyan" />
            )}
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-white">
              {searchQuery.trim()
                ? `No memories matching "${searchQuery}"`
                : activeFilter === "photo"
                ? "No photo memories yet."
                : activeFilter === "journal"
                ? "No journal memories yet."
                : activeFilter === "favorite"
                ? "No favorite memories yet."
                : "No memories saved yet."}
            </h3>
            <p className="text-xs text-white/50 max-w-md mx-auto">
              {searchQuery.trim()
                ? "Try searching for another term or reset your search filter."
                : "Store and relive your special moments anytime."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {displayedMemories.map((mem) => (
            <MemoryCard
              key={mem.id}
              memory={mem}
              onSelectMemory={onSelectMemory}
              onFavoriteToggle={onFavoriteToggle}
            />
          ))}
        </div>
      )}
    </section>
  );
}
