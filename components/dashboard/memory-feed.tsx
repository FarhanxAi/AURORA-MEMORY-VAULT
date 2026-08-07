"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Grid,
  Image as ImageIcon,
  Mic,
  FileText,
  Heart,
  Plus,
  Sparkles,
  ArrowUpDown,
  Upload,
} from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassCard } from "@/components/ui/glass-card";
import { MemoryCard } from "./memory-card";
import { Memory, MemoryType } from "@/lib/types";
import { getMemoryTimestamp } from "@/lib/journal-utils";

interface MemoryFeedProps {
  memories: Memory[];
  searchQuery: string;
  onOpenCreateModal: (defaultType?: MemoryType) => void;
  onFavoriteToggle: (id: string, newFavState: boolean) => void;
  onSelectMemory: (memory: Memory) => void;
}

export function MemoryFeed({
  memories,
  searchQuery,
  onOpenCreateModal,
  onFavoriteToggle,
  onSelectMemory,
}: MemoryFeedProps) {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  // Filtering Logic
  const filteredMemories = memories.filter((m) => {
    // 1. Category / Type filter
    if (activeFilter === "photos" && m.memory_type !== "photo" && !m.cover_image) return false;
    if (activeFilter === "journal" && m.memory_type !== "journal") return false;
    if (activeFilter === "favorites" && !m.favorite) return false;

    // 2. Search Query filter (matches Title, Description, Category, Tags)
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchTitle = m.title.toLowerCase().includes(q);
      const matchDesc = m.description ? m.description.toLowerCase().includes(q) : false;
      const matchCategory = m.category ? m.category.toLowerCase().includes(q) : false;
      const matchTags = m.tags ? m.tags.some((t: string) => t.toLowerCase().includes(q)) : false;
      return matchTitle || matchDesc || matchCategory || matchTags;
    }

    return true;
  });

  // Strict Sorting Logic
  const sortedMemories = [...filteredMemories].sort((a, b) => {
    const timeA = getMemoryTimestamp(a);
    const timeB = getMemoryTimestamp(b);
    if (timeA === timeB) {
      return (b.id || "").localeCompare(a.id || "");
    }
    return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
  });

  const filterTabs = [
    { id: "all", label: "All Vault Items", icon: <Grid className="w-3.5 h-3.5" /> },
    { id: "photos", label: "Photos", icon: <ImageIcon className="w-3.5 h-3.5" /> },
    { id: "journal", label: "Journal", icon: <FileText className="w-3.5 h-3.5" /> },
    { id: "favorites", label: "Favorites", icon: <Heart className="w-3.5 h-3.5 text-rose-400" /> },
  ];

  return (
    <section className="space-y-6 my-8">
      {/* Quick Action Bar Requested in Prompt */}
      <div className="p-4 rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-bold tracking-wider text-aurora-cyan px-2">
            Quick Actions
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <GlassButton
            variant="secondary"
            size="sm"
            onClick={() => onOpenCreateModal("photo")}
            leftIcon={<ImageIcon className="w-3.5 h-3.5 text-aurora-cyan" />}
          >
            Upload Photos
          </GlassButton>
          <GlassButton
            variant="secondary"
            size="sm"
            onClick={() => onOpenCreateModal("journal")}
            leftIcon={<FileText className="w-3.5 h-3.5 text-amber-300" />}
          >
            Create Journal
          </GlassButton>
        </div>
      </div>

      {/* Filter Tabs & Sort Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-none">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeFilter === tab.id
                  ? "bg-aurora-cyan/20 border border-aurora-cyan/50 text-white shadow-[0_0_15px_rgba(56,189,248,0.3)]"
                  : "bg-white/[0.04] border border-white/10 text-white/60 hover:text-white hover:bg-white/[0.08]"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Sort Order Selector */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <ArrowUpDown className="w-3.5 h-3.5 text-white/40" />
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
            className="bg-[#0b1020] text-xs text-white/80 border border-white/12 rounded-xl py-1.5 px-3 focus:outline-none cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Memory Cards Feed Grid */}
      {sortedMemories.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {sortedMemories.map((m) => (
              <MemoryCard
                key={m.id}
                memory={m}
                onFavoriteToggle={onFavoriteToggle}
                onSelectMemory={onSelectMemory}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="my-12"
        >
          <GlassCard className="p-12 text-center max-w-lg mx-auto flex flex-col items-center justify-center space-y-5 border-white/15">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-aurora-cyan via-aurora-indigo to-aurora-violet p-0.5 shadow-aurora-glow">
              <div className="w-full h-full bg-[#030712] rounded-[22px] flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-aurora-cyan" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-display text-2xl font-bold text-white">
                Start Your Journey
              </h3>
              <p className="text-xs text-white/60 font-light max-w-sm leading-relaxed">
                {searchQuery
                  ? `No memories match "${searchQuery}". Try clearing your search.`
                  : "Your digital vault is ready. Preserve your first photo, video, or voice recording today."}
              </p>
            </div>

            <GlassButton
              variant="primary"
              size="lg"
              onClick={() => onOpenCreateModal()}
              leftIcon={<Plus className="w-5 h-5" />}
            >
              Create First Memory
            </GlassButton>
          </GlassCard>
        </motion.div>
      )}
    </section>
  );
}
