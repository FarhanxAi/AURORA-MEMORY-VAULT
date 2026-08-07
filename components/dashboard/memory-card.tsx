"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Image as ImageIcon,
  FileText,
  Heart,
  MapPin,
  Calendar,
  Clock,
  Lock,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Memory } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { resolveMemoryImageUrl, resolveMemoryImageUrlAsync } from "@/lib/image-utils";
import { formatJournalDateTime } from "@/lib/journal-utils";

interface MemoryCardProps {
  memory: Memory;
  onFavoriteToggle: (id: string, newFavState: boolean) => void;
  onSelectMemory: (memory: Memory) => void;
}

export const MemoryCard = React.memo(function MemoryCard({
  memory,
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

          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-transparent to-black/20 pointer-events-none" />

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

        {/* Card Body Details: TITLE FIRST (Primary Focus), Category BELOW Title */}
        <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
          <div className="space-y-2">
            {/* 1. PRIMARY TITLE (Boldest & Largest) */}
            <h3 className="font-display font-extrabold text-white text-lg leading-snug group-hover:text-aurora-cyan transition-colors line-clamp-2">
              {memory.title}
            </h3>

            {/* 2. CATEGORY BADGE (Below Title, Never Above) */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-aurora-cyan/15 border border-aurora-cyan/35 text-[10px] font-bold text-aurora-cyan uppercase tracking-wider">
                {typeIcons[memory.memory_type]}
                <span>{memory.category || "Personal"}</span>
              </span>
            </div>

            {/* 3. DATE & 12-HOUR TIME */}
            <div className="flex items-center justify-between text-[11px] text-white/70 pt-1">
              <span className="flex items-center gap-1 font-semibold text-aurora-cyan">
                <Calendar className="w-3.5 h-3.5 text-aurora-cyan" />
                {formatJournalDateTime(memory.created_at || memory.memory_date).dayAndDate}
              </span>
              <span className="flex items-center gap-1 font-mono font-bold text-white/90 text-[10px]">
                <Clock className="w-3 h-3 text-aurora-cyan" />
                {formatJournalDateTime(memory.created_at || memory.memory_date).timeStr}
              </span>
            </div>

            {/* Description / Journal Snippet */}
            {memory.description && (
              <p className="text-xs text-white/60 line-clamp-2 leading-relaxed font-sans pt-1">
                {memory.description}
              </p>
            )}
          </div>

          {/* Footer Metadata Tags & Location */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 text-[11px] text-white/50">
            {memory.location ? (
              <span className="flex items-center gap-1 truncate max-w-[140px]">
                <MapPin className="w-3 h-3 text-aurora-violet shrink-0" />
                <span className="truncate">{memory.location}</span>
              </span>
            ) : (
              <span className="text-white/40 italic text-[10px]">No location</span>
            )}

            {Array.isArray(memory.tags) && memory.tags.length > 0 && (
              <div className="flex items-center gap-1 overflow-hidden">
                <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/10 font-mono text-[10px] text-aurora-cyan truncate">
                  #{memory.tags[0]}
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
