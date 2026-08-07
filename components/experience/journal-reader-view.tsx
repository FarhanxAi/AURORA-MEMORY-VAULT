"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Memory } from "@/lib/types";
import { formatJournalDateTime, getSafeMood } from "@/lib/journal-utils";
import { MapPin, Heart, Tag, Calendar, Clock, BookOpen } from "lucide-react";

interface JournalReaderViewProps {
  memory?: Memory | null;
  onFavoriteToggle?: (id: string, currentFav: boolean) => void;
  className?: string;
  isEmbeddedInLeftPanel?: boolean;
}

export function JournalReaderView({
  memory,
  onFavoriteToggle,
  className = "",
  isEmbeddedInLeftPanel = false,
}: JournalReaderViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Safe default fallback if memory object is missing or null
  const safeMemory: Memory = memory || {
    id: "empty-journal",
    user_id: "system",
    title: "Untitled Journal Entry",
    description: "",
    category: "Personal",
    memory_type: "journal",
    cover_image: null,
    gallery: [],
    audio_url: null,
    tags: [],
    location: null,
    mood: "Happy",
    favorite: false,
    private: true,
    archived: false,
    deleted: false,
    deleted_at: null,
    memory_date: new Date().toISOString().split("T")[0],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { dayAndDate, timeStr } = useMemo(
    () => formatJournalDateTime(safeMemory.created_at || safeMemory.memory_date),
    [safeMemory.created_at, safeMemory.memory_date]
  );

  const safeMood = useMemo(
    () => getSafeMood(safeMemory.mood),
    [safeMemory.mood]
  );

  const isEdited = Boolean(safeMemory.updated_at && safeMemory.updated_at !== safeMemory.created_at);

  // Track reading scroll progress
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    if (scrollHeight <= clientHeight) {
      setScrollProgress(100);
      return;
    }
    const pct = Math.min(100, Math.max(0, (scrollTop / (scrollHeight - clientHeight)) * 100));
    setScrollProgress(pct);
  };

  useEffect(() => {
    handleScroll();
  }, [safeMemory.description]);

  // High-performance Drop Cap prose renderer capable of 1,000,000+ characters
  const renderLuxuryProseWithDropCap = (rawText?: string | null) => {
    if (!rawText || !rawText.trim()) {
      return (
        <div className="py-16 text-center text-white/40 italic text-base font-serif">
          No written journal entry provided for this chapter.
        </div>
      );
    }

    const blocks = rawText.split(/\n\s*\n/);

    return (
      <div className="space-y-7 text-white/95 text-[18px] sm:text-[20px] leading-[1.95] tracking-[0.25px] font-sans font-normal max-w-full selection:bg-aurora-cyan/30">
        {blocks.map((block, idx) => {
          const trimmed = block.trim();
          if (!trimmed) return <div key={idx} className="h-4" />;

          // First paragraph: Add elegant Drop Cap for magazine-style typography
          if (idx === 0 && /^[A-Za-z]/.test(trimmed)) {
            const firstChar = trimmed.charAt(0);
            const restOfBlock = trimmed.slice(1);
            return (
              <p
                key={idx}
                className="whitespace-pre-wrap leading-[1.95] tracking-[0.25px] text-white/95"
              >
                <span className="float-left text-4xl sm:text-5xl font-serif font-bold text-aurora-cyan mr-3 leading-none drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]">
                  {firstChar}
                </span>
                {restOfBlock}
              </p>
            );
          }

          // Blockquote (> text)
          if (trimmed.startsWith(">")) {
            const quoteContent = trimmed.replace(/^>\s*/, "");
            return (
              <blockquote
                key={idx}
                className="pl-6 border-l-4 border-aurora-cyan/80 italic text-amber-100/90 py-4 my-6 bg-white/[0.03] backdrop-blur-md rounded-r-2xl font-serif text-lg sm:text-xl shadow-lg border-y border-white/5"
              >
                &ldquo;{quoteContent}&rdquo;
              </blockquote>
            );
          }

          // Unordered List (- item or * item)
          if (trimmed.split("\n").every((line) => line.trim().startsWith("- ") || line.trim().startsWith("* "))) {
            const items = trimmed.split("\n").map((line) => line.trim().replace(/^[-*]\s*/, ""));
            return (
              <ul key={idx} className="list-disc list-inside space-y-3 pl-3 my-6 text-white/95">
                {items.map((item, itemIdx) => (
                  <li key={itemIdx} className="whitespace-pre-wrap leading-relaxed">{item}</li>
                ))}
              </ul>
            );
          }

          // Standard Paragraph
          return (
            <p
              key={idx}
              className="whitespace-pre-wrap leading-[1.95] tracking-[0.25px] text-white/95"
            >
              {block}
            </p>
          );
        })}
      </div>
    );
  };

  const userTags = Array.isArray(safeMemory.tags) ? safeMemory.tags.filter((t) => t && t.trim().length > 0) : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`relative w-full space-y-6 ${
        isEmbeddedInLeftPanel
          ? "p-6 sm:p-10 h-full flex flex-col justify-between overflow-hidden"
          : "p-6 sm:p-10 glass-panel rounded-3xl border border-white/15 bg-gradient-to-b from-[#0c1226]/95 via-[#0a0f20]/95 to-[#060814]/98 shadow-2xl"
      } ${className}`}
    >
      {/* SUBTLE BUTTERFLY ACCENTS IN CORNERS */}
      <div className="absolute top-4 right-4 pointer-events-none opacity-20 hover:opacity-40 transition-opacity">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-aurora-cyan animate-pulse">
          <path d="M12 12C10 8 5 4 2 8C-1 12 4 16 8 14C12 12 12 12 12 12Z" fill="currentColor" fillOpacity="0.4" />
          <path d="M12 12C14 8 19 4 22 8C25 12 20 16 16 14C12 12 12 12 12 12Z" fill="currentColor" fillOpacity="0.4" />
          <path d="M12 12C10 16 6 20 3 17C0 14 5 11 8 13C12 12 12 12 12 12Z" fill="currentColor" fillOpacity="0.25" />
          <path d="M12 12C14 16 18 20 21 17C24 14 19 11 16 13C12 12 12 12 12 12Z" fill="currentColor" fillOpacity="0.25" />
        </svg>
      </div>

      {/* READING PROGRESS INDICATOR BAR */}
      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-aurora-cyan via-aurora-indigo to-aurora-violet transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* HEADER SECTION */}
      <div className="border-b border-white/15 pb-6 space-y-5 text-center sm:text-left">
        {/* Category & Favorite Star */}
        <div className="flex items-center justify-between gap-3">
          <span className="px-3.5 py-1.5 rounded-full bg-aurora-cyan/15 border border-aurora-cyan/40 text-xs font-bold text-aurora-cyan uppercase tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{safeMemory.category || "Personal"}</span>
          </span>

          {onFavoriteToggle && (
            <button
              type="button"
              onClick={() => onFavoriteToggle(safeMemory.id, !safeMemory.favorite)}
              className={`p-2.5 rounded-full border transition-all cursor-pointer ${
                safeMemory.favorite
                  ? "bg-rose-500/20 border-rose-500/40 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                  : "bg-white/[0.05] border-white/15 text-white/60 hover:text-white"
              }`}
              title={safeMemory.favorite ? "Favorited" : "Add to favorites"}
            >
              <Heart className={`w-4 h-4 ${safeMemory.favorite ? "fill-rose-500 text-rose-500" : ""}`} />
            </button>
          )}
        </div>

        {/* Huge Diary Title with Centered Luxury Typography */}
        <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-snug drop-shadow-[0_2px_10px_rgba(255,255,255,0.15)] text-center my-4">
          {safeMemory.title || "Untitled Journal Entry"}
        </h1>

        {/* Metadata Pill Bar: Date, 12-Hour Time, Mood, Location */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs sm:text-sm text-white/80 font-medium pt-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 text-aurora-cyan font-semibold">
            <Calendar className="w-4 h-4 text-aurora-cyan" />
            <span>📅 {dayAndDate}</span>
          </span>

          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 text-white font-mono text-xs font-bold">
            <Clock className="w-3.5 h-3.5 text-aurora-cyan" />
            <span>🕒 {timeStr}</span>
          </span>

          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold">
            <span>{safeMood.emoji}</span>
            <span>{safeMood.label}</span>
          </span>

          {safeMemory.location && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 text-aurora-violet font-medium">
              <MapPin className="w-3.5 h-3.5 text-aurora-violet" />
              <span>{safeMemory.location}</span>
            </span>
          )}
        </div>
      </div>

      {/* ELEGANT CHAPTER DIVIDER LINE */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-aurora-cyan/40 to-transparent" />

      {/* LUXURY READING CARD BACKDROP */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white/[0.02] border border-white/10 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* READING PROSE CONTAINER WITH SCROLL PROGRESS LISTENER */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="py-2 flex-1 overflow-y-auto max-h-[60vh] pr-3 custom-scrollbar space-y-4"
        >
          {renderLuxuryProseWithDropCap(safeMemory.description)}
        </div>
      </div>

      {/* USER-ENTERED TAGS & LAST EDITED ONLY */}
      {(userTags.length > 0 || isEdited) && (
        <div className="border-t border-white/15 pt-4 space-y-3">
          {userTags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="w-3.5 h-3.5 text-aurora-cyan" />
              {userTags.map((t, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full bg-aurora-cyan/15 border border-aurora-cyan/35 text-aurora-cyan text-xs font-semibold"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          {isEdited && (
            <div className="text-[11px] text-white/40 font-mono pt-1">
              Last Edited: {new Date(safeMemory.updated_at!).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
