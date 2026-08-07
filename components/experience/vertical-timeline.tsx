"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, ChevronRight, Sparkles, Clock, MapPin, Heart } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Memory } from "@/lib/types";

interface VerticalTimelineProps {
  memories: Memory[];
  onSelectMemory: (memory: Memory) => void;
  onFavoriteToggle: (id: string, newFavState: boolean) => void;
}

export function VerticalTimeline({
  memories,
  onSelectMemory,
  onFavoriteToggle,
}: VerticalTimelineProps) {
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>("all");

  // Group memories by Year -> Month
  const activeMemories = memories.filter((m) => !m.deleted && !m.archived);

  const yearsList = Array.from(
    new Set(
      activeMemories.map((m) =>
        new Date(m.memory_date || m.created_at).getFullYear().toString()
      )
    )
  ).sort((a, b) => parseInt(b) - parseInt(a));

  const filteredMemories =
    selectedYearFilter === "all"
      ? activeMemories
      : activeMemories.filter(
          (m) =>
            new Date(m.memory_date || m.created_at).getFullYear().toString() ===
            selectedYearFilter
        );

  // Group by "Year Month" string e.g. "2026 July"
  const groupedGroups = filteredMemories.reduce<{ [key: string]: Memory[] }>(
    (acc, memory) => {
      const dateObj = new Date(memory.memory_date || memory.created_at);
      const groupKey = dateObj.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(memory);
      return acc;
    },
    {}
  );

  const groupKeys = Object.keys(groupedGroups);

  return (
    <div className="space-y-8 my-8">
      {/* Timeline Controls Header */}
      <div className="p-4 rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-aurora-cyan" />
          <h3 className="font-display text-lg font-bold text-white">
            Immersive Timeline
          </h3>
        </div>

        {/* Jump Navigation Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedYearFilter("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              selectedYearFilter === "all"
                ? "bg-aurora-cyan/20 border border-aurora-cyan/50 text-white"
                : "bg-white/[0.04] text-white/60 hover:text-white"
            }`}
          >
            All Years
          </button>
          {yearsList.map((yr) => (
            <button
              key={yr}
              onClick={() => setSelectedYearFilter(yr)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                selectedYearFilter === yr
                  ? "bg-aurora-cyan/20 border border-aurora-cyan/50 text-white"
                  : "bg-white/[0.04] text-white/60 hover:text-white"
              }`}
            >
              {yr}
            </button>
          ))}
          <button
            onClick={() => {
              setSelectedYearFilter("all");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-aurora-violet/20 border border-aurora-violet/40 text-aurora-violet hover:bg-aurora-violet/30 transition-all flex items-center gap-1"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Jump to Today</span>
          </button>
        </div>
      </div>

      {groupKeys.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Sparkles className="w-8 h-8 text-aurora-cyan mx-auto" />
          <p className="text-sm text-white/60">No timeline items found for this period.</p>
        </div>
      ) : (
        <div className="relative pl-4 sm:pl-8 space-y-12 border-l border-aurora-cyan/30 ml-2 sm:ml-4">
          {groupKeys.map((groupTitle, groupIndex) => (
            <div key={groupTitle} className="space-y-6 relative">
              {/* Sticky Month/Year Node */}
              <div className="sticky top-20 z-20 flex items-center gap-3 -ml-[25px] sm:-ml-[41px]">
                <div className="w-5 h-5 rounded-full bg-aurora-cyan border-4 border-[#030712] shadow-aurora-glow" />
                <span className="px-4 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-xl border border-aurora-cyan/40 text-xs font-bold text-aurora-cyan uppercase tracking-wider shadow-glass-sm">
                  {groupTitle}
                </span>
              </div>

              {/* Cards under this Month */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                {groupedGroups[groupTitle].map((memory, mIndex) => (
                  <motion.div
                    key={memory.id}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: mIndex * 0.08 }}
                    onClick={() => onSelectMemory(memory)}
                    className="cursor-pointer group"
                  >
                    <GlassCard glowColor="cyan" className="p-4 space-y-3 border-white/12 h-full">
                      {memory.cover_image && (
                        <div className="relative w-full h-40 rounded-xl overflow-hidden">
                          <img
                            src={memory.cover_image}
                            alt={memory.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-white/50">
                          <span className="font-mono text-aurora-cyan">
                            {memory.memory_date}
                          </span>
                          <span className="uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-white/[0.05]">
                            {memory.category || "Personal"}
                          </span>
                        </div>

                        <h4 className="font-display font-bold text-base text-white group-hover:text-aurora-cyan transition-colors">
                          {memory.title}
                        </h4>

                        {memory.description && (
                          <p className="text-xs text-white/60 line-clamp-2 font-light">
                            {memory.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
                        {memory.location && (
                          <span className="flex items-center gap-1 text-white/40">
                            <MapPin className="w-3 h-3 text-aurora-violet" />
                            {memory.location}
                          </span>
                        )}
                        <span className="text-aurora-cyan font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform ml-auto">
                          View Story <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
