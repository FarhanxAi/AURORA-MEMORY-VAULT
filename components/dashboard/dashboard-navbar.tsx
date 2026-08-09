"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Search,
  Plus,
  Bell,
  User,
  LogOut,
  X,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { UserProfile, NotificationItem } from "@/lib/types";

interface DashboardNavbarProps {
  user: UserProfile | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenCreateModal: () => void;
  onLogout: () => void;
  notifications: NotificationItem[];
  onOpenProfile?: () => void;
}

export function DashboardNavbar({
  user,
  searchQuery,
  onSearchChange,
  onOpenCreateModal,
  onLogout,
  notifications,
  onOpenProfile,
}: DashboardNavbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSecurityDetails, setShowSecurityDetails] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-40 w-full px-4 pt-4 sm:pt-6 pb-2">
      <div className="max-w-7xl mx-auto glass-navbar rounded-full px-4 sm:px-6 py-3 flex items-center justify-between gap-4 border border-white/12 shadow-glass-lg">
        {/* Brand / Logo */}
        <Link href="/dashboard" className="flex items-center gap-3 shrink-0 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-aurora-cyan via-aurora-indigo to-aurora-violet p-0.5 shadow-aurora-glow group-hover:scale-105 transition-transform duration-300">
            <div className="w-full h-full bg-[#030712] rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-aurora-cyan" />
            </div>
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="font-display font-bold text-white text-base tracking-tight group-hover:text-aurora-cyan transition-colors">
              Aurora
            </span>
            <span className="text-[9px] uppercase tracking-widest text-white/50 font-semibold">
              Vault Dashboard
            </span>
          </div>
        </Link>

        {/* Live Search Bar */}
        <div className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Search memories by title, tags, category..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-9 py-2 rounded-full text-xs text-white placeholder-white/40 bg-white/[0.04] border border-white/12 backdrop-blur-md focus:outline-none focus:bg-white/[0.08] focus:border-aurora-cyan/60 focus:shadow-[0_0_20px_rgba(56,189,248,0.2)] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Quick Add Memory */}
          <GlassButton
            variant="primary"
            size="sm"
            onClick={onOpenCreateModal}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            <span className="hidden sm:inline">Add Memory</span>
            <span className="sm:hidden">Add</span>
          </GlassButton>

          {/* Profile Avatar Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 p-1 rounded-full bg-white/[0.05] border border-white/10 hover:border-white/25 transition-all cursor-pointer"
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name || "User"}
                  onError={(e) => {
                    // Hide broken image and let gradient fallback appear
                    (e.target as HTMLElement).style.display = "none";
                  }}
                  className="w-8 h-8 rounded-full object-cover border border-aurora-cyan/50"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-aurora-cyan to-aurora-violet flex items-center justify-center text-white text-xs font-bold shadow-aurora-glow">
                  {user?.full_name?.charAt(0) || "A"}
                </div>
              )}
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-3 w-72 glass-panel bg-[#090d16] backdrop-blur-3xl rounded-3xl p-4 border border-white/20 shadow-2xl shadow-black/90 z-50 animate-fadeIn space-y-3">
                <div className="border-b border-white/12 pb-3 space-y-1">
                  <p className="text-sm font-bold text-white truncate tracking-tight">{user?.full_name || "Memory Collector"}</p>
                  <p className="text-xs text-white/70 font-mono truncate">{user?.email}</p>
                </div>

                <div className="space-y-1.5 text-xs font-medium text-white/80">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenProfile?.();
                    }}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-2xl hover:bg-white/[0.08] hover:text-white cursor-pointer transition-colors text-left"
                  >
                    <User className="w-4 h-4 text-aurora-cyan" />
                    <span>Profile Account</span>
                  </button>

                  {/* Interactive & Tappable Protected Badge */}
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setShowSecurityDetails(!showSecurityDetails)}
                      className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold hover:bg-emerald-500/25 transition-all cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Protected</span>
                      </div>
                      <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40 text-emerald-300 font-bold">
                        {showSecurityDetails ? "Hide Info" : "Tap for Info"}
                      </span>
                    </button>

                    {showSecurityDetails && (
                      <div className="p-3 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-[11px] text-emerald-200 leading-snug space-y-1 animate-fadeIn">
                        <p className="font-bold flex items-center gap-1.5 text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Row Level Security Active
                        </p>
                        <p className="text-white/80">
                          Your memory vault is encrypted and accessible only by your verified login credentials.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10">
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-2xl bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

