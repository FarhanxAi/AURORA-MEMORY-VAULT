"use client";

import React from "react";
import { Sparkles, Eye, Heart, Compass } from "lucide-react";
import { GlassCard } from "./ui/glass-card";

export function AboutSection() {
  return (
    <section id="about" className="py-24 px-4 max-w-6xl mx-auto">
      <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
        <h2 className="text-xs uppercase tracking-widest font-semibold text-aurora-violet">
          Our Philosophy
        </h2>
        <h3 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white">
          Crafted for Moments That Matter
        </h3>
        <p className="text-white/70 text-base sm:text-lg font-light">
          We built Aurora because memories are too sacred to be lost in chaotic feeds, social algorithms, or unorganized camera rolls.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="space-y-4">
          <div className="p-3 rounded-2xl bg-aurora-cyan/10 border border-aurora-cyan/20 w-fit text-aurora-cyan">
            <Eye className="w-6 h-6" />
          </div>
          <h4 className="font-display text-xl font-bold text-white">Vision Pro Elegance</h4>
          <p className="text-sm text-white/65 leading-relaxed">
            Minimal, liquid glass user interfaces designed to remove friction and put your most cherished moments in focus.
          </p>
        </GlassCard>

        <GlassCard className="space-y-4">
          <div className="p-3 rounded-2xl bg-aurora-violet/10 border border-aurora-violet/20 w-fit text-aurora-violet">
            <Heart className="w-6 h-6" />
          </div>
          <h4 className="font-display text-xl font-bold text-white">Forever Intact</h4>
          <p className="text-sm text-white/65 leading-relaxed">
            Your images, journals, and timeline stories remain intact with zero compression degradation or forced ads.
          </p>
        </GlassCard>

        <GlassCard className="space-y-4">
          <div className="p-3 rounded-2xl bg-aurora-emerald/10 border border-aurora-emerald/20 w-fit text-aurora-emerald">
            <Compass className="w-6 h-6" />
          </div>
          <h4 className="font-display text-xl font-bold text-white">Sovereign Ownership</h4>
          <p className="text-sm text-white/65 leading-relaxed">
            You hold total sovereignty over your memory archives. Secure, manage, or encrypt at any time with total freedom.
          </p>
        </GlassCard>
      </div>
    </section>
  );
}
