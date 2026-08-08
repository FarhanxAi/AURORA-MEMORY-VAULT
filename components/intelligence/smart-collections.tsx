"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Layers,
  Sparkles,
  Heart,
  Calendar,
  Clock,
  Compass,
  Gift,
  Users,
  GraduationCap,
  Gamepad2,
  Pin,
  Check,
  ArrowRight,
} from "lucide-react";
import { Memory, SmartCollectionDef, PinnedCollection } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

interface SmartCollectionsProps {
  memories: Memory[];
  onSelectCollectionFilter: (filterFn: (memories: Memory[]) => Memory[], title: string) => void;
}

export function SmartCollections({
  memories,
  onSelectCollectionFilter,
}: SmartCollectionsProps) {
  const [pinnedKeys, setPinnedKeys] = useState<string[]>([]);
  const [loadingPins, setLoadingPins] = useState(true);

  // Fetch pinned collections from Supabase
  const fetchPinnedCollections = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("pinned_collections")
        .select("collection_key")
        .eq("user_id", user.id);

      if (data) {
        setPinnedKeys(data.map((item) => item.collection_key));
      }
    } catch (err) {
      console.error("Fetch pinned collections error:", err);
    } finally {
      setLoadingPins(false);
    }
  }, []);

  useEffect(() => {
    fetchPinnedCollections();
  }, [fetchPinnedCollections]);

  // Toggle pin state in Supabase
  const togglePin = async (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const isPinned = pinnedKeys.includes(key);
      if (isPinned) {
        await supabase
          .from("pinned_collections")
          .delete()
          .eq("user_id", user.id)
          .eq("collection_key", key);
        setPinnedKeys((prev) => prev.filter((k) => k !== key));
      } else {
        await supabase
          .from("pinned_collections")
          .insert({ user_id: user.id, collection_key: key });
        setPinnedKeys((prev) => [...prev, key]);
      }
    } catch (err) {
      console.error("Toggle pin error:", err);
    }
  };

  // Define standard smart collections
  const smartCollections: SmartCollectionDef[] = useMemo(
    () => [
      {
        key: "this_week",
        title: "This Week",
        description: "Memories logged in the last 7 days",
        icon: "Clock",
        badgeColor: "text-aurora-cyan bg-aurora-cyan/15",
        filterFn: (mems) => {
          const now = new Date();
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return mems.filter((m) => new Date(m.memory_date || m.created_at) >= sevenDaysAgo);
        },
      },
      {
        key: "this_month",
        title: "This Month",
        description: "Captured during the current month",
        icon: "Calendar",
        badgeColor: "text-indigo-400 bg-indigo-500/15",
        filterFn: (mems) => {
          const now = new Date();
          return mems.filter((m) => {
            const d = new Date(m.memory_date || m.created_at);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          });
        },
      },
      {
        key: "this_year",
        title: "This Year",
        description: `Memories from ${new Date().getFullYear()}`,
        icon: "Sparkles",
        badgeColor: "text-aurora-violet bg-aurora-violet/15",
        filterFn: (mems) => {
          const now = new Date();
          return mems.filter((m) => new Date(m.memory_date || m.created_at).getFullYear() === now.getFullYear());
        },
      },
      {
        key: "favorites",
        title: "Favorites",
        description: "Your most cherished memories",
        icon: "Heart",
        badgeColor: "text-rose-400 bg-rose-500/15",
        filterFn: (mems) => mems.filter((m) => m.favorite),
      },
      {
        key: "travel",
        title: "Travel & Vacations",
        description: "Trips, destinations, and getaways",
        icon: "Compass",
        badgeColor: "text-emerald-400 bg-emerald-500/15",
        filterFn: (mems) =>
          mems.filter(
            (m) =>
              m.category?.toLowerCase().includes("travel") ||
              m.tags?.some((t) => t.toLowerCase().includes("travel") || t.toLowerCase().includes("trip")) ||
              Boolean(m.location)
          ),
      },
      {
        key: "birthdays",
        title: "Birthdays & Celebrations",
        description: "Special party moments & milestones",
        icon: "Gift",
        badgeColor: "text-amber-400 bg-amber-500/15",
        filterFn: (mems) =>
          mems.filter(
            (m) =>
              m.title.toLowerCase().includes("birthday") ||
              m.description?.toLowerCase().includes("birthday") ||
              m.tags?.some((t) => t.toLowerCase().includes("birthday") || t.toLowerCase().includes("party"))
          ),
      },
      {
        key: "family",
        title: "Family & Friends",
        description: "Gatherings, reunions, and loved ones",
        icon: "Users",
        badgeColor: "text-sky-400 bg-sky-500/15",
        filterFn: (mems) =>
          mems.filter(
            (m) =>
              m.category?.toLowerCase().includes("family") ||
              m.tags?.some((t) => t.toLowerCase().includes("family") || t.toLowerCase().includes("friend"))
          ),
      },
      {
        key: "school",
        title: "School & Education",
        description: "Academic journeys & graduation",
        icon: "GraduationCap",
        badgeColor: "text-purple-400 bg-purple-500/15",
        filterFn: (mems) =>
          mems.filter(
            (m) =>
              m.category?.toLowerCase().includes("school") ||
              m.tags?.some((t) => t.toLowerCase().includes("school") || t.toLowerCase().includes("study"))
          ),
      },
      {
        key: "gaming",
        title: "Gaming & Esports",
        description: "Gaming clips, victories, and achievements",
        icon: "Gamepad2",
        badgeColor: "text-fuchsia-400 bg-fuchsia-500/15",
        filterFn: (mems) =>
          mems.filter(
            (m) =>
              m.category?.toLowerCase().includes("gaming") ||
              m.tags?.some((t) => t.toLowerCase().includes("game") || t.toLowerCase().includes("gaming"))
          ),
      },
    ],
    []
  );

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case "Clock":
        return <Clock className="w-5 h-5" />;
      case "Calendar":
        return <Calendar className="w-5 h-5" />;
      case "Heart":
        return <Heart className="w-5 h-5" />;
      case "Compass":
        return <Compass className="w-5 h-5" />;
      case "Gift":
        return <Gift className="w-5 h-5" />;
      case "Users":
        return <Users className="w-5 h-5" />;
      case "GraduationCap":
        return <GraduationCap className="w-5 h-5" />;
      case "Gamepad2":
        return <Gamepad2 className="w-5 h-5" />;
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  // Sort pinned collections first
  const sortedCollections = useMemo(() => {
    return [...smartCollections].sort((a, b) => {
      const aPinned = pinnedKeys.includes(a.key) ? 1 : 0;
      const bPinned = pinnedKeys.includes(b.key) ? 1 : 0;
      return bPinned - aPinned;
    });
  }, [smartCollections, pinnedKeys]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-3xl border border-white/12 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-aurora-cyan to-aurora-violet p-0.5 shadow-aurora-glow">
            <div className="w-full h-full bg-[#030712] rounded-[14px] flex items-center justify-center">
              <Layers className="w-5 h-5 text-aurora-cyan" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white tracking-tight">
              Smart Collections
            </h2>
            <p className="text-xs text-white/50">
              Automated memory grouping & pinned favorites
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Smart Collections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {sortedCollections.map((col) => {
          const matchingMemories = col.filterFn(memories);
          const isPinned = pinnedKeys.includes(col.key);
          const previewCover = matchingMemories.find((m) => m.cover_image)?.cover_image;

          return (
            <div
              key={col.key}
              onClick={() => onSelectCollectionFilter(col.filterFn, col.title)}
              className={`group relative glass-panel p-5 rounded-3xl border transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between space-y-4 ${
                isPinned
                  ? "border-aurora-cyan/60 bg-gradient-to-tr from-aurora-cyan/10 to-transparent shadow-[0_0_20px_rgba(56,189,248,0.15)]"
                  : "border-white/10 hover:border-white/25 hover:bg-white/[0.08]"
              }`}
            >
              {/* Background Art Overlay if preview available */}
              {previewCover && (
                <div className="absolute inset-0 z-0 opacity-15 group-hover:opacity-25 transition-opacity">
                  <img src={previewCover} alt="Collection preview cover" className="w-full h-full object-cover blur-sm" />
                </div>
              )}

              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 rounded-2xl ${col.badgeColor}`}>
                    {getIconComponent(col.icon)}
                  </div>

                  {/* Pin Button */}
                  <button
                    onClick={(e) => togglePin(e, col.key)}
                    className={`p-2 rounded-xl transition-all cursor-pointer ${
                      isPinned
                        ? "bg-aurora-cyan/20 text-aurora-cyan border border-aurora-cyan/40"
                        : "bg-white/[0.05] text-white/40 hover:text-white hover:bg-white/10"
                    }`}
                    title={isPinned ? "Unpin collection" : "Pin collection"}
                  >
                    <Pin className={`w-3.5 h-3.5 ${isPinned ? "fill-aurora-cyan" : ""}`} />
                  </button>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-aurora-cyan transition-colors flex items-center gap-2">
                    <span>{col.title}</span>
                    {isPinned && <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-aurora-cyan/30 text-aurora-cyan">PINNED</span>}
                  </h3>
                  <p className="text-xs text-white/60 line-clamp-2">{col.description}</p>
                </div>
              </div>

              <div className="relative z-10 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
                <span className="font-semibold text-aurora-cyan">
                  {matchingMemories.length} {matchingMemories.length === 1 ? "memory" : "memories"}
                </span>
                <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-aurora-cyan group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
