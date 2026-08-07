"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface GlassInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ className, label, error, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs uppercase tracking-wider font-semibold text-white/70 ml-1"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-4 pointer-events-none text-white/40">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              "w-full rounded-2xl py-3.5 px-4 text-sm text-white placeholder-white/30",
              "bg-white/[0.04] backdrop-blur-xl border border-white/12 shadow-glass-sm",
              "focus:bg-white/[0.08] focus:border-aurora-cyan/60 focus:shadow-[0_0_20px_rgba(56,189,248,0.2)] focus:outline-none",
              "transition-all duration-300",
              leftIcon && "pl-11",
              rightIcon && "pr-11",
              error && "border-rose-500/60 focus:border-rose-500 focus:shadow-[0_0_20px_rgba(244,63,94,0.2)]",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-4 text-white/40">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs text-rose-400 font-medium ml-1 animate-fadeIn">
            {error}
          </p>
        )}
      </div>
    );
  }
);

GlassInput.displayName = "GlassInput";
