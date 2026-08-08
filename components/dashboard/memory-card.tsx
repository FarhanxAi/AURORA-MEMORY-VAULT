"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Image as ImageIcon,
  FileText,
  Heart,
  MapPin,
  Calendar,
  Clock,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Memory } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { resolveMemoryImageUrl, resolveMemoryImageUrlAsync } from "@/lib/image-utils";
import { formatJournalDateTime, highlightMatchingText } from "@/lib/journal-utils";

interface MemoryCardProps {
  memory: Memory;
  searchQuery?: string;
  onFavoriteToggle: (id: string, newFavState: boolean) => void;
  onSelectMemory: (memory: Memory) => void;
}

export const MemoryCard = React.memo(function MemoryCard({
  memory,
  searchQuery = "",
  onFavoriteToggle,
  onSelectMemory,
}: MemoryCardProps) {
  const [isFavorite, setIsFavorite] = useState(memory.favorite);
  const [imageUrl, setImageUrl] = useState<string | null>(() => resolveMemoryImageUrl(memory));

  React.useEffect(() => {
    let isMounted = true;
    const initial = resolveMemoryImageUrl(memory);
    if (initial && isMounted) setImageUrl(initial);

    resolveMemoryImageUrlAsync(memory).then((res) => {
      if (!isMounted) return;
      const target = typeof res === "string" ? res : res?.url;
      if (target) setImageUrl(target);
    });

    return () => {
      isMounted = false;
    };
  }, [memory]);

  const typeIcons: Record<string, React.ReactNode> = {
    photo: <ImageIcon className="w-3.5 h-3.5 text-aurora-cyan" />,
    journal: <FileText className="w-3.5 h-3.5 text-amber-300" />,
  };

  const handleToggleFav = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !isFavorite;
    setIsFavorite(nextState);
    onFavoriteToggle(memory.id, nextState);

    try {
      const supabase = createClient();
      await supabase
        .from("memories")
        .update({ favorite: nextState })
        .eq("id", memory.id);
    } catch (err) {
      console.error("Favorite toggle error:", err);
    }
  };

  const formattedDate = formatJournalDateTime(memory.created_at || memory.memory_date);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4 }}
      onClick={() => onSelectMemory(memory)}
      className="cursor-pointer"
    >
      <GlassCard
        glowColor={memory.memory_type === "photo" ? "cyan" : "emerald"}
        className="p-0 overflow-hidden group flex flex-col justify-between h-full border-white/12 shadow-xl"
      >
        {/* Cover Media Header Canvas */}
        <div className="relative w-full h-44 sm:h-48 bg-[#0b1020] overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={memory.title || "Memory Photo"}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-aurora-cyan/10 via-[#0a0f1d] to-aurora-violet/10 p-6 text-center space-y-2">
              <div className="p-3.5 rounded-2xl bg-white/[0.06] border border-white/12 group-hover:scale-110 transition-transform">
                {typeIcons[memory.memory_type] || <FileText className="w-5 h-5 text-amber-300" />}
              </div>
              <span className="text-[10px] font-bold tracking-wider text-white/60 uppercase">
                {memory.memory_type} MEMORY
              </span>
            </div>
          )}

          {/* Multi-Photo Count Badge */}
          {Array.isArray(memory.gallery) && memory.gallery.length > 0 && (
            <div className="absolute bottom-3 left-3 z-10">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-[10px] font-bold text-white shadow-lg">
                <ImageIcon className="w-3 h-3 text-aurora-cyan" />
                <span>{memory.gallery.length + 1} Photos</span>
              </span>
            </div>
          )}

          {/* Favorite Button Overlay (Top Right) */}
          <div className="absolute top-3 right-3 z-10">
            <button
              onClick={handleToggleFav}
              className="p-2 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white/80 hover:text-rose-400 hover:border-rose-400/50 transition-all cursor-pointer shadow-lg"
              title={isFavorite ? "Favorited" : "Add to Favorites"}
            >
              <Heart
                className={`w-4 h-4 ${
                  isFavorite ? "fill-rose-500 text-rose-500" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {/* Card Body Details */}
        <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
          <div className="space-y-2">
            {/* 1. PRIMARY TITLE (Highlighted when searching) */}
            <h3 className="font-display font-extrabold text-white text-lg leading-snug group-hover:text-aurora-cyan transition-colors line-clamp-2">
              {highlightMatchingText(memory.title, searchQuery)}
            </h3>

            {/* 2. CATEGORY BADGE (Highlighted when searching) */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-aurora-cyan/15 border border-aurora-cyan/35 text-[10px] font-bold text-aurora-cyan uppercase tracking-wider">
                {typeIcons[memory.memory_type]}
                <span>{highlightMatchingText(memory.category || "Personal", searchQuery)}</span>
              </span>
            </div>

            {/* 3. DATE & 12-HOUR TIME (Highlighted when searching) */}
            <div className="flex items-center justify-between text-[11px] text-white/70 pt-1">
              <span className="flex items-center gap-1 font-semibold text-aurora-cyan">
                <Calendar className="w-3.5 h-3.5 text-aurora-cyan" />
                {highlightMatchingText(formattedDate.dayAndDate, searchQuery)}
              </span>
              <span className="flex items-center gap-1 font-mono font-bold text-white/90 text-[10px]">
                <Clock className="w-3 h-3 text-aurora-cyan" />
                {highlightMatchingText(formattedDate.timeStr, searchQuery)}
              </span>
            </div>

            {/* Description / Journal Snippet (Highlighted when searching) */}
            {memory.description && (
              <p className="text-xs text-white/60 line-clamp-2 leading-relaxed font-sans pt-1">
                {highlightMatchingText(memory.description, searchQuery)}
              </p>
            )}
          </div>

          {/* Footer Metadata Tags & Location */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 text-[11px] text-white/50">
            {memory.location ? (
              <span className="flex items-center gap-1 truncate max-w-[140px]">
                <MapPin className="w-3 h-3 text-aurora-violet shrink-0" />
                <span className="truncate">{highlightMatchingText(memory.location, searchQuery)}</span>
              </span>
            ) : (
              <span className="text-white/40 italic text-[10px]">No location</span>
            )}

            {Array.isArray(memory.tags) && memory.tags.length > 0 && (
              <div className="flex items-center gap-1 overflow-hidden">
                <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/10 font-mono text-[10px] text-aurora-cyan truncate">
                  #{highlightMatchingText(memory.tags[0], searchQuery)}
                </span>
                {memory.tags.length > 1 && (
                  <span className="text-[10px] text-white/40 font-mono">
                    +{memory.tags.length - 1}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
});
