"use client";

import React from "react";
import {
  Sparkles,
  Calendar,
  Clock,
  Heart,
  Archive,
  Image as ImageIcon,
  Video,
  Mic,
  BookOpen,
  X,
} from "lucide-react";

export type QuickFilterId =
  | "all"
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "this_year"
  | "favorites"
  | "archived"
  | "photos"
  | "videos"
  | "journal";

interface QuickFilterOption {
  id: QuickFilterId;
  label: string;
  icon: React.ReactNode;
}

const FILTER_OPTIONS: QuickFilterOption[] = [
  { id: "all", label: "All Memories", icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: "today", label: "Today", icon: <Clock className="w-3.5 h-3.5" /> },
  { id: "yesterday", label: "Yesterday", icon: <Calendar className="w-3.5 h-3.5" /> },
  { id: "last_7_days", label: "Last 7 Days", icon: <Clock className="w-3.5 h-3.5" /> },
  { id: "last_30_days", label: "Last 30 Days", icon: <Calendar className="w-3.5 h-3.5" /> },
  { id: "this_year", label: "This Year", icon: <Calendar className="w-3.5 h-3.5" /> },
  { id: "favorites", label: "Favorites", icon: <Heart className="w-3.5 h-3.5 text-rose-400" /> },
  { id: "archived", label: "Archived", icon: <Archive className="w-3.5 h-3.5" /> },
  { id: "photos", label: "Photos", icon: <ImageIcon className="w-3.5 h-3.5 text-aurora-cyan" /> },
  { id: "videos", label: "Videos", icon: <Video className="w-3.5 h-3.5 text-indigo-400" /> },
  { id: "journal", label: "Journal Entries", icon: <BookOpen className="w-3.5 h-3.5 text-amber-400" /> },
];

interface QuickFiltersBarProps {
  activeFilter: QuickFilterId;
  onSelectFilter: (filter: QuickFilterId) => void;
  resultCount?: number;
}

export function QuickFiltersBar({
  activeFilter,
  onSelectFilter,
  resultCount,
}: QuickFiltersBarProps) {
  return (
    <div className="w-full space-y-2 mb-6">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider font-bold text-white/50 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-aurora-cyan" />
          <span>Quick Filters</span>
        </span>
        {activeFilter !== "all" && (
          <button
            onClick={() => onSelectFilter("all")}
            className="text-xs text-aurora-cyan hover:underline flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3 h-3" /> Reset Filter
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 smooth-scroll-x scrollbar-none touch-pan-x select-none pb-2">
        {FILTER_OPTIONS.map((opt) => {
          const isActive = activeFilter === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onSelectFilter(opt.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer border active:scale-95 ${
                isActive
                  ? "bg-gradient-to-r from-aurora-cyan/25 to-aurora-violet/25 border-aurora-cyan text-white shadow-[0_0_15px_rgba(56,189,248,0.25)]"
                  : "bg-white/[0.04] border-white/10 text-white/70 hover:text-white hover:bg-white/[0.08]"
              }`}
            >
              {opt.icon}
              <span>{opt.label}</span>
              {isActive && resultCount !== undefined && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-aurora-cyan/30 text-[10px] font-bold text-aurora-cyan">
                  {resultCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
