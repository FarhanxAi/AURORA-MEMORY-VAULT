"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, Sparkles, LogOut, User, ShieldCheck, CheckCircle2, Shield } from "lucide-react";
import { UserProfile } from "@/lib/types";
import { resolveAvatarUrl } from "@/lib/image-utils";

interface DashboardNavbarProps {
  user: UserProfile | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onLogout: () => void;
  onOpenCreateModal?: () => void;
  notifications?: any[];
  onOpenProfile?: () => void;
}

export function DashboardNavbar({
  user,
  searchQuery,
  onSearchChange,
  onLogout,
  onOpenCreateModal,
  notifications = [],
  onOpenProfile,
}: DashboardNavbarProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSecurityDetails, setShowSecurityDetails] = useState(false);

  const resolvedAvatar = resolveAvatarUrl(user?.avatar_url);

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-2xl bg-[#030712]/80 border-b border-white/10 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3 sm:gap-4">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-aurora-cyan via-aurora-indigo to-aurora-violet flex items-center justify-center shadow-[0_0_25px_rgba(56,189,248,0.4)] border border-white/20">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg sm:text-xl font-display font-bold text-white tracking-tight leading-none">
              Aurora
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-aurora-cyan/90 mt-0.5">
              Memory Vault
            </p>
          </div>
        </div>

        {/* Realtime Search Input */}
        <div className="flex-1 max-w-md mx-2 sm:mx-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <input
              type="text"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Search memories, tags, categories, journals..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-2.5 rounded-2xl bg-white/[0.06] border border-white/12 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none focus:border-aurora-cyan/70 focus:bg-white/[0.09] focus:ring-1 focus:ring-aurora-cyan/40 transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Right Actions & Account Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Profile Avatar Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifications(false);
              }}
              className="flex items-center justify-center min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] p-0.5 rounded-full bg-white/[0.08] border border-white/15 hover:border-aurora-cyan/60 hover:shadow-[0_0_15px_rgba(56,189,248,0.3)] transition-all cursor-pointer"
              title="Profile & Settings"
            >
              {resolvedAvatar ? (
                <img
                  src={resolvedAvatar}
                  alt={user?.full_name || "User Profile"}
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                    const fb = e.currentTarget.parentElement?.querySelector(".nav-avatar-fallback") as HTMLElement;
                    if (fb) fb.style.display = "flex";
                  }}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-aurora-cyan/50"
                />
              ) : null}
              <div
                className={`nav-avatar-fallback w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-aurora-cyan via-aurora-indigo to-aurora-violet flex items-center justify-center text-white text-xs sm:text-sm font-bold shadow-aurora-glow ${
                  resolvedAvatar ? "hidden" : ""
                }`}
              >
                {user?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "A"}
              </div>
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

