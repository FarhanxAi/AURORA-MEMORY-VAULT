"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Image, BookOpen, Clock, Download, ShieldCheck, Tag, X } from "lucide-react";
import { GlassCard } from "./ui/glass-card";

interface FeatureItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  modalText: string;
  glow: "cyan" | "violet" | "emerald";
  tag: string;
}

export function FeaturesSection() {
  const [selectedFeature, setSelectedFeature] = useState<FeatureItem | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedFeature(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const features: FeatureItem[] = [
    {
      icon: <Image className="w-8 h-8 text-aurora-cyan" />,
      title: "Images",
      description: "Store high-resolution personal photography in crystal-clear glass vaults without compression loss.",
      modalText: "Store your original quality images securely inside Aurora.",
      glow: "cyan",
      tag: "Ultra HD",
    },
    {
      icon: <BookOpen className="w-8 h-8 text-aurora-violet" />,
      title: "Journals",
      description: "Capture intimate text journals, personal thoughts, and notes protected inside liquid glass vaults.",
      modalText: "Write and preserve personal memories forever.",
      glow: "violet",
      tag: "Text Vault",
    },
    {
      icon: <Clock className="w-8 h-8 text-aurora-emerald" />,
      title: "Timeline",
      description: "Navigate your life stories chronologically through a fluid, interactive visual memory stream.",
      modalText: "Browse memories in chronological order.",
      glow: "emerald",
      tag: "Interactive",
    },
    {
      icon: <Download className="w-8 h-8 text-aurora-cyan" />,
      title: "Export Vault",
      description: "Securely export all your Images and Journals into a portable Aurora Vault package that can be viewed anytime, even offline.",
      modalText: "Export your complete vault for offline viewing.",
      glow: "cyan",
      tag: "PORTABLE EXPORT",
    },
    {
      icon: <Tag className="w-8 h-8 text-aurora-violet" />,
      title: "Smart Tagging",
      description: "Organize memories with custom tags, locations, and instant search capabilities.",
      modalText: "Organize memories using custom tags.",
      glow: "violet",
      tag: "Instant Search",
    },
    {
      icon: <ShieldCheck className="w-8 h-8 text-aurora-emerald" />,
      title: "Privacy",
      description: "Strict Supabase Row Level Security ensures only your authenticated key unlocks your personal vault.",
      modalText: "Your memories remain private and protected.",
      glow: "emerald",
      tag: "RLS Protected",
    },
  ];

  return (
    <section id="features" className="py-24 px-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
        <h2 className="text-xs uppercase tracking-widest font-semibold text-aurora-cyan">
          Engineered for Permanence
        </h2>
        <h3 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white">
          Six Core Pillars of Your Legacy
        </h3>
        <p className="text-white/70 text-base sm:text-lg font-light">
          Built with precision technology to ensure your digital memories are preserved for generations.
        </p>
      </div>

      {/* Grid of 6 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {features.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            <GlassCard
              glowColor={item.glow}
              className="h-full flex flex-col justify-between group cursor-pointer"
              onClick={() => setSelectedFeature(item)}
            >
              <div className="space-y-4">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-2xl bg-white/[0.05] border border-white/10 group-hover:scale-110 transition-transform duration-300">
                    {item.icon}
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-white/70">
                    {item.tag}
                  </span>
                </div>

                {/* Title & Description */}
                <h4 className="font-display text-xl font-bold text-white group-hover:text-aurora-cyan transition-colors">
                  {item.title}
                </h4>
                <p className="text-sm text-white/65 leading-relaxed font-normal">
                  {item.description}
                </p>
              </div>

              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFeature(item);
                }}
                className="pt-6 mt-6 border-t border-white/5 flex items-center text-xs font-semibold text-aurora-cyan opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <span>Learn how it works</span>
                <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1">→</span>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Learn How It Works - Premium Info Modal */}
      <AnimatePresence>
        {selectedFeature && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedFeature(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-xl"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 border border-white/20 shadow-2xl z-10 space-y-5 bg-[#0b1020]/95"
            >
              {/* Top Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-white/[0.06] border border-white/12">
                    {selectedFeature.icon}
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-white">
                      {selectedFeature.title}
                    </h3>
                    <span className="text-[10px] font-bold text-aurora-cyan uppercase tracking-wider">
                      {selectedFeature.tag}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedFeature(null)}
                  className="p-2 rounded-full bg-white/[0.05] border border-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
                  title="Close (ESC)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Short Feature Explanation */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <p className="text-sm font-medium text-white/90 leading-relaxed font-sans">
                  {selectedFeature.modalText}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
