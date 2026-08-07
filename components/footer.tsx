"use client";

import React from "react";
import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/40 backdrop-blur-2xl py-12 px-4 mt-20">
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center text-center space-y-3">
        {/* Brand Icon & Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-aurora-cyan to-aurora-violet p-0.5 shadow-aurora-glow">
            <div className="w-full h-full bg-[#030712] rounded-[9px] flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-aurora-cyan" />
            </div>
          </div>
          <span className="font-display font-bold text-white text-lg tracking-tight">
            Aurora Digital Memory Vault
          </span>
        </div>

        {/* Subtitle Quote */}
        <p className="text-xs text-white/60 font-light italic tracking-wide">
          &ldquo;Preserving life&apos;s most meaningful memories.&rdquo;
        </p>

        {/* Minimal Copyright */}
        <div className="text-[11px] text-white/40 font-mono pt-1">
          © 2026 Aurora
        </div>
      </div>
    </footer>
  );
}
