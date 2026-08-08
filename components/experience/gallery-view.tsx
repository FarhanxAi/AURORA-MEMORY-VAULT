"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, Grid3x3, Rows3, Maximize2, Image as ImageIcon } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Memory } from "@/lib/types";
import { resolveMemoryImageUrl } from "@/lib/image-utils";

export type GalleryLayoutMode = "grid" | "masonry" | "compact" | "large";

interface GalleryViewProps {
  memories: Memory[];
  onSelectMemory: (memory: Memory) => void;
  onFavoriteToggle: (id: string, newFavState: boolean) => void;
}

export function GalleryView({
  memories,
  onSelectMemory,
}: GalleryViewProps) {
  const [layoutMode, setLayoutMode] = useState<GalleryLayoutMode>("grid");

  const activeMemories = memories.filter((m) => !m.deleted && !m.archived);

  const layoutButtons = [
    { id: "grid", label: "Grid View", icon: <LayoutGrid className="w-4 h-4" /> },
    { id: "masonry", label: "Masonry View", icon: <Grid3x3 className="w-4 h-4" /> },
    { id: "compact", label: "Compact View", icon: <Rows3 className="w-4 h-4" /> },
    { id: "large", label: "Large Stream", icon: <Maximize2 className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 my-8">
      {/* Layout Mode Control Bar */}
      <div className="p-4 rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-bold tracking-wider text-aurora-cyan">
            Apple Photos Gallery Experience
          </span>
        </div>

        {/* Layout Switcher Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/10">
          {layoutButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => setLayoutMode(btn.id as GalleryLayoutMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                layoutMode === btn.id
                  ? "bg-aurora-cyan/20 border border-aurora-cyan/50 text-white shadow-[0_0_15px_rgba(56,189,248,0.3)]"
                  : "text-white/60 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              {btn.icon}
              <span className="hidden sm:inline">{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Render selected Layout Mode */}
      <AnimatePresence mode="wait">
        {layoutMode === "grid" && (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
          >
            {activeMemories.map((m) => {
              const img = resolveMemoryImageUrl(m);
              const hasMultiple = Array.isArray(m.gallery) && m.gallery.length > 0;
              return (
                <div
                  key={m.id}
                  onClick={() => onSelectMemory(m)}
                  className="cursor-pointer group"
                >
                  <GlassCard glowColor="cyan" className="p-0 overflow-hidden border-white/12 h-full">
                    <div className="relative w-full h-56 bg-white/[0.04]">
                      {img ? (
                        <img
                          src={img}
                          alt={m.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-6 text-center text-xs text-white/50">
                          {m.title}
                        </div>
                      )}
                      {hasMultiple && (
                        <div className="absolute top-3 right-3 z-10">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-[10px] font-bold text-white shadow-lg">
                            <ImageIcon className="w-3 h-3 text-aurora-cyan" />
                            <span>{m.gallery.length + 1} Photos</span>
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                        <h4 className="font-display font-bold text-white text-sm">
                          {m.title}
                        </h4>
                        <p className="text-[10px] text-white/70">{m.memory_date}</p>
                      </div>
                    </div>
                  </GlassCard>
                </div>
              );
            })}
          </motion.div>
        )}

        {layoutMode === "masonry" && (
          <motion.div
            key="masonry"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6"
          >
            {activeMemories.map((m, idx) => {
              const img = resolveMemoryImageUrl(m);
              const hasMultiple = Array.isArray(m.gallery) && m.gallery.length > 0;
              return (
                <div
                  key={m.id}
                  onClick={() => onSelectMemory(m)}
                  className="cursor-pointer break-inside-avoid group"
                >
                  <GlassCard glowColor="violet" className="p-0 overflow-hidden border-white/12">
                    <div
                      className="relative w-full bg-white/[0.04]"
                      style={{ height: `${200 + (idx % 3) * 60}px` }}
                    >
                      {img ? (
                        <img
                          src={img}
                          alt={m.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-6 text-center text-xs text-white/50">
                          {m.title}
                        </div>
                      )}
                      {hasMultiple && (
                        <div className="absolute top-3 right-3 z-10">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-[10px] font-bold text-white shadow-lg">
                            <ImageIcon className="w-3 h-3 text-aurora-cyan" />
                            <span>{m.gallery.length + 1} Photos</span>
                          </span>
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                        <h4 className="font-display font-bold text-white text-xs truncate">
                          {m.title}
                        </h4>
                        <span className="text-[9px] text-aurora-cyan font-mono">
                          {m.memory_date}
                        </span>
                      </div>
                    </div>
                  </GlassCard>
                </div>
              );
            })}
          </motion.div>
        )}

        {layoutMode === "compact" && (
          <motion.div
            key="compact"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3"
          >
            {activeMemories.map((m) => {
              const img = resolveMemoryImageUrl(m);
              return (
                <div
                  key={m.id}
                  onClick={() => onSelectMemory(m)}
                  className="cursor-pointer group aspect-square rounded-2xl overflow-hidden relative bg-white/[0.05] border border-white/10"
                >
                  {img ? (
                    <img
                      src={img}
                      alt={m.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-white/40 p-2 text-center">
                      {m.title}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-aurora-cyan/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              );
            })}
          </motion.div>
        )}

        {layoutMode === "large" && (
          <motion.div
            key="large"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-3xl mx-auto space-y-8"
          >
            {activeMemories.map((m) => {
              const img = resolveMemoryImageUrl(m);
              return (
                <div
                  key={m.id}
                  onClick={() => onSelectMemory(m)}
                  className="cursor-pointer group"
                >
                  <GlassCard glowColor="emerald" className="p-6 space-y-4 border-white/15">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-xl font-bold text-white group-hover:text-aurora-cyan transition-colors">
                        {m.title}
                      </h3>
                      <span className="text-xs font-mono text-aurora-cyan">
                        {m.memory_date}
                      </span>
                    </div>

                    {img && (
                      <div className="w-full h-96 rounded-2xl overflow-hidden">
                        <img
                          src={img}
                          alt={m.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}

                    {m.description && (
                      <p className="text-sm text-white/80 leading-relaxed font-light">
                        {m.description}
                      </p>
                    )}
                  </GlassCard>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
