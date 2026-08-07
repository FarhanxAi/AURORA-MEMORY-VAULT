"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "warning" | "info";

interface GlassToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  onClose: (id: string) => void;
}

export function GlassToast({ id, type, title, message, onClose }: GlassToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    error: <XCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-aurora-cyan shrink-0" />,
  };

  const borderGlows = {
    success: "border-emerald-500/30 shadow-[0_8px_32px_rgba(16,185,129,0.2)]",
    error: "border-rose-500/30 shadow-[0_8px_32px_rgba(244,63,94,0.2)]",
    warning: "border-amber-500/30 shadow-[0_8px_32px_rgba(245,158,11,0.2)]",
    info: "border-aurora-cyan/30 shadow-[0_8px_32px_rgba(56,189,248,0.2)]",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "pointer-events-auto relative flex items-start gap-3 p-4 rounded-2xl",
        "bg-slate-950/80 backdrop-blur-2xl border text-white",
        borderGlows[type]
      )}
    >
      {icons[type]}
      <div className="flex-1 space-y-0.5 pr-2">
        <h4 className="text-sm font-semibold text-white">{title}</h4>
        {message && <p className="text-xs text-white/70 leading-relaxed">{message}</p>}
      </div>
      <button
        onClick={() => onClose(id)}
        className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
