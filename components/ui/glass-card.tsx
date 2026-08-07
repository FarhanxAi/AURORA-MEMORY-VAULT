"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  glowColor?: "cyan" | "violet" | "emerald" | "none";
  interactive?: boolean;
}

export function GlassCard({
  children,
  className,
  glowColor = "none",
  interactive = true,
  ...props
}: GlassCardProps) {
  const glowStyles = {
    cyan: "hover:shadow-[0_0_40px_rgba(56,189,248,0.25)] hover:border-aurora-cyan/40",
    violet: "hover:shadow-[0_0_40px_rgba(168,85,247,0.25)] hover:border-aurora-violet/40",
    emerald: "hover:shadow-[0_0_40px_rgba(16,185,129,0.25)] hover:border-aurora-emerald/40",
    none: "",
  };

  return (
    <motion.div
      whileHover={interactive ? { y: -4, scale: 1.01 } : undefined}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative overflow-hidden rounded-3xl p-6 sm:p-8",
        "bg-white/[0.03] backdrop-blur-2xl backdrop-saturate-200",
        "border border-white/10 shadow-glass-md",
        "specular-border-top",
        interactive &&
          "transition-all duration-300 hover:bg-white/[0.06] hover:border-white/20",
        glowStyles[glowColor],
        className
      )}
      {...props}
    >
      {/* Liquid Reflection Glare */}
      <div className="pointer-events-none absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-white/15 to-transparent transform -rotate-45 transition-transform duration-700 group-hover:translate-x-full" />

      {/* Card Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
