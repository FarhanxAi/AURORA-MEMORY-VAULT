"use client";

import React, { useState } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GlassButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "google";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export function GlassButton({
  children,
  className,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  onClick,
  disabled,
  ...props
}: GlassButtonProps) {
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setTimeout(() => setCoords(null), 500);
    if (onClick) onClick(e);
  };

  const variants = {
    primary:
      "bg-gradient-to-r from-aurora-cyan via-aurora-indigo to-aurora-violet text-white shadow-aurora-glow hover:brightness-110 border-white/25 active:brightness-95",
    secondary:
      "bg-white/[0.06] backdrop-blur-xl text-white border-white/15 hover:bg-white/[0.12] hover:border-white/30 shadow-glass-sm active:bg-white/[0.18]",
    ghost:
      "bg-transparent text-white/80 border-transparent hover:bg-white/[0.08] hover:text-white active:bg-white/[0.12]",
    danger:
      "bg-rose-500/20 text-rose-300 border-rose-500/35 hover:bg-rose-500/30 hover:border-rose-500/55 active:bg-rose-500/40",
    google:
      "bg-white/[0.08] backdrop-blur-xl text-white border-white/20 hover:bg-white/[0.15] hover:border-white/35 shadow-glass-sm active:bg-white/[0.2]",
  };

  const sizes = {
    sm: "px-3.5 py-2 text-xs rounded-full gap-2 font-medium tracking-tight",
    md: "px-5 py-2.5 text-xs sm:text-sm rounded-full gap-2.5 font-semibold tracking-tight",
    lg: "px-7 py-3.5 text-sm sm:text-base rounded-full gap-3 font-semibold tracking-tight",
  };

  return (
    <motion.button
      whileHover={{ scale: disabled || isLoading ? 1 : 1.02, y: disabled ? 0 : -1 }}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.97 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={cn(
        "relative overflow-hidden inline-flex items-center justify-center border transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aurora-cyan/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030712] transform-gpu",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {/* Specular Edge Highlight Ring */}
      <span className="pointer-events-none absolute inset-0 rounded-full border border-white/20" />

      {/* Touch Ripple Animation */}
      {coords && (
        <span
          className="pointer-events-none absolute bg-white/30 rounded-full animate-ping"
          style={{
            left: coords.x - 10,
            top: coords.y - 10,
            width: 20,
            height: 20,
          }}
        />
      )}

      {/* Loading Spinner or Left Icon */}
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
      ) : (
        leftIcon && <span className="inline-flex shrink-0 items-center">{leftIcon}</span>
      )}

      {/* Centered Button Text */}
      <span className="relative z-10 font-sans leading-none">{children}</span>

      {/* Right Icon */}
      {!isLoading && rightIcon && (
        <span className="inline-flex shrink-0 items-center">{rightIcon}</span>
      )}
    </motion.button>
  );
}
