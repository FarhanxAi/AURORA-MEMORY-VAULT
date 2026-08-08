import React from "react";
import { motion } from "framer-motion";
import { HardDrive, Image, BookOpen, Heart } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Memory } from "@/lib/types";

export type DashboardFilterKey = "all" | "photo" | "journal" | "favorite";

interface StatsGridProps {
  memories: Memory[];
  activeFilter?: DashboardFilterKey;
  onSelectFilter?: (filter: DashboardFilterKey) => void;
}

export function StatsGrid({
  memories,
  activeFilter = "all",
  onSelectFilter,
}: StatsGridProps) {
  const totalMemories = memories.length;
  const photosCount = memories.reduce((acc, m) => {
    let count = 0;
    if (m.cover_image) count += 1;
    if (Array.isArray(m.gallery)) count += m.gallery.length;
    if (!m.cover_image && !m.gallery?.length && m.memory_type === "photo") count += 1;
    return acc + count;
  }, 0);
  const journalsCount = memories.filter(
    (m) => m.memory_type === "journal"
  ).length;
  const favoritesCount = memories.filter((m) => m.favorite).length;

  const stats: {
    id: DashboardFilterKey;
    label: string;
    value: number;
    icon: React.ReactNode;
    tag: string;
    glow: "cyan" | "violet" | "emerald" | "none";
  }[] = [
    {
      id: "all",
      label: "Total Memories",
      value: totalMemories,
      icon: <HardDrive className="w-5 h-5 text-aurora-cyan" />,
      tag: "All Vault Items",
      glow: "cyan",
    },
    {
      id: "photo",
      label: "Photos",
      value: photosCount,
      icon: <Image className="w-5 h-5 text-aurora-violet" />,
      tag: "Images",
      glow: "violet",
    },
    {
      id: "journal",
      label: "Journals",
      value: journalsCount,
      icon: <BookOpen className="w-5 h-5 text-amber-400" />,
      tag: "Written Logs",
      glow: "cyan",
    },
    {
      id: "favorite",
      label: "Favorites",
      value: favoritesCount,
      icon: <Heart className="w-5 h-5 text-rose-400 fill-rose-400/20" />,
      tag: "Starred Items",
      glow: "violet",
    },
  ];

  return (
    <section className="my-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((item, index) => {
          const isActive = activeFilter === item.id;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              onClick={() => {
                if (onSelectFilter) {
                  onSelectFilter(item.id);
                }
              }}
              className="cursor-pointer active:scale-95 transition-transform"
            >
              <GlassCard
                glowColor={isActive ? item.glow : "none"}
                className={`p-4 sm:p-5 flex flex-col justify-between h-full group transition-all duration-300 ${
                  isActive
                    ? "border-aurora-cyan/80 bg-aurora-cyan/[0.08] shadow-aurora-glow"
                    : "hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`p-2.5 rounded-xl border transition-transform duration-300 group-hover:scale-110 ${
                      isActive
                        ? "bg-aurora-cyan/20 border-aurora-cyan/50 text-white"
                        : "bg-white/[0.05] border-white/10"
                    }`}
                  >
                    {item.icon}
                  </div>
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider ${
                      isActive ? "text-aurora-cyan font-extrabold" : "text-white/40"
                    }`}
                  >
                    {item.tag}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight group-hover:text-aurora-cyan transition-colors">
                    {item.value}
                  </span>
                  <p className="text-xs text-white/70 font-medium truncate flex items-center justify-between">
                    <span>{item.label}</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-aurora-cyan animate-ping" />}
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
