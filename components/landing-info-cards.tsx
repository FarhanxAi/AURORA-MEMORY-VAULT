"use client";

import React from "react";
import { Laptop, HardDrive } from "lucide-react";
import { GlassCard } from "./ui/glass-card";

export function LandingInfoCards() {
  return (
    <section className="px-4 max-w-5xl mx-auto -mt-4 sm:-mt-8 mb-12 sm:mb-16 relative z-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {/* CARD 1 — PERFORMANCE */}
        <GlassCard
          glowColor="cyan"
          interactive={false}
          className="p-6 sm:p-7 flex flex-col justify-between space-y-3 border-white/10 bg-white/[0.02] shadow-glass-md rounded-3xl"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-aurora-cyan/10 border border-aurora-cyan/25 text-aurora-cyan shrink-0">
                <Laptop className="w-5 h-5" />
              </div>
              <h3 className="font-display text-lg sm:text-xl font-bold text-white tracking-tight">
                Best Experience on PC
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-light">
              Aurora Memory Vault is designed to provide a smoother and more comfortable experience on a laptop or PC, especially when managing larger memory collections, images, journals, and exports.
            </p>
          </div>
        </GlassCard>

        {/* CARD 2 — MEMORY RESPONSIBILITY */}
        <GlassCard
          glowColor="violet"
          interactive={false}
          className="p-6 sm:p-7 flex flex-col justify-between space-y-3 border-white/10 bg-white/[0.02] shadow-glass-md rounded-3xl"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-aurora-violet/10 border border-aurora-violet/25 text-aurora-violet shrink-0">
                <HardDrive className="w-5 h-5" />
              </div>
              <h3 className="font-display text-lg sm:text-xl font-bold text-white tracking-tight">
                Keep a Personal Backup
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-light">
              Aurora is built to protect and organize your memories, but you should also keep your own backup of important memories. Future updates or unexpected technical issues may occasionally affect how the service works.
            </p>
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
