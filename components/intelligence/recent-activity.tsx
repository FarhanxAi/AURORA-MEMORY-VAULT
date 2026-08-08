"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Clock,
  Sparkles,
  Eye,
  Edit,
  PlusCircle,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { Memory, RecentActivityItem } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

interface RecentActivityProps {
  memories: Memory[];
  onSelectMemory: (m: Memory) => void;
  userId?: string;
}

export function RecentActivity({ memories, onSelectMemory, userId: userIdProp }: RecentActivityProps) {
  const [activities, setActivities] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch recent activity items from Supabase
  const fetchRecentActivity = useCallback(async () => {
    try {
      const supabase = createClient();

      // Use the userId passed from the already-authenticated dashboard to avoid
      // a redundant supabase.auth.getUser() network round-trip on every render.
      let resolvedUserId = userIdProp;
      if (!resolvedUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        resolvedUserId = user.id;
      }

      const { data } = await supabase
        .from("recent_activity")
        .select("*")
        .eq("user_id", resolvedUserId)
        .order("timestamp", { ascending: false })
        .limit(10);

      if (data) {
        // Map memory details to activity
        const mapped = (data as RecentActivityItem[]).map((act) => ({
          ...act,
          memory: memories.find((m) => m.id === act.memory_id),
        }));
        setActivities(mapped);
      }
    } catch (err) {
      console.error("Fetch recent activity error:", err);
    } finally {
      setLoading(false);
    }
  }, [memories, userIdProp]);

  useEffect(() => {
    fetchRecentActivity();
  }, [fetchRecentActivity]);

  const getActionBadge = (type: string) => {
    switch (type) {
      case "opened":
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-aurora-cyan bg-aurora-cyan/15 px-2 py-0.5 rounded-full">
            <Eye className="w-3 h-3" /> Opened
          </span>
        );
      case "edited":
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-indigo-400 bg-indigo-500/15 px-2 py-0.5 rounded-full">
            <Edit className="w-3 h-3" /> Edited
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full">
            <PlusCircle className="w-3 h-3" /> Created
          </span>
        );
    }
  };

  const formatRelativeTime = (timestampStr: string) => {
    const d = new Date(timestampStr);
    if (isNaN(d.getTime())) return "Recently";
    const now = new Date();
    const diffSecs = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffSecs < 60) return "Just now";
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
    return `${Math.floor(diffSecs / 86400)}d ago`;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="glass-panel p-6 rounded-3xl border border-white/12 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-aurora-cyan to-aurora-violet p-0.5 shadow-aurora-glow">
            <div className="w-full h-full bg-[#030712] rounded-[14px] flex items-center justify-center">
              <Clock className="w-5 h-5 text-aurora-cyan" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white tracking-tight">
              Recent Activity & Visited
            </h2>
            <p className="text-xs text-white/50">
              Continue where you left off — tracked securely in Supabase
            </p>
          </div>
        </div>
      </div>

      {/* Activity List */}
      {activities.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border border-white/10 text-center space-y-2">
          <Sparkles className="w-8 h-8 text-aurora-cyan mx-auto opacity-50" />
          <p className="text-sm font-semibold text-white/80">No recent activity recorded yet</p>
          <p className="text-xs text-white/40">
            Open or edit any memory in your vault to track your journey here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((act) => {
            const mem = act.memory;
            if (!mem) return null;

            return (
              <div
                key={act.id}
                onClick={() => onSelectMemory(mem)}
                className="glass-panel p-4 rounded-2xl border border-white/10 hover:border-aurora-cyan/50 hover:bg-white/[0.08] transition-all cursor-pointer flex items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {mem.cover_image ? (
                    <img
                      src={mem.cover_image}
                      alt={mem.title}
                      className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-aurora-cyan/20 flex items-center justify-center text-aurora-cyan font-bold text-sm shrink-0">
                      {mem.memory_type.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white truncate group-hover:text-aurora-cyan transition-colors">
                        {mem.title}
                      </h4>
                      {getActionBadge(act.action_type)}
                    </div>
                    <p className="text-xs text-white/60 truncate">{mem.description || "No description"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-white/40 font-mono">
                    {formatRelativeTime(act.timestamp)}
                  </span>
                  <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-aurora-cyan group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
