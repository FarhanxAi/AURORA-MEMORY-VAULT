"use client";

import React from "react";
import { Check, X } from "lucide-react";
import { motion } from "framer-motion";

interface PasswordStrengthProps {
  password?: string;
}

export function PasswordStrengthMeter({ password = "" }: PasswordStrengthProps) {
  const requirements = [
    { label: "8+ characters", pass: password.length >= 8 },
    { label: "Uppercase letter", pass: /[A-Z]/.exec(password) !== null },
    { label: "Number", pass: /[0-9]/.exec(password) !== null },
    { label: "Special character (!@#$%^&*)", pass: /[^A-Za-z0-9]/.exec(password) !== null },
  ];

  const score = requirements.filter((r) => r.pass).length;

  const getStrengthInfo = () => {
    if (password.length === 0) return { label: "", color: "bg-white/10", percentage: 0 };
    if (score <= 1) return { label: "Weak", color: "bg-rose-500", percentage: 25 };
    if (score <= 3) return { label: "Moderate", color: "bg-amber-400", percentage: 65 };
    return { label: "Strong", color: "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]", percentage: 100 };
  };

  const strength = getStrengthInfo();

  if (!password) return null;

  return (
    <div className="w-full space-y-3 pt-1">
      {/* Strength Bar */}
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-white/60 font-medium">Security Strength</span>
        <span
          className={`font-semibold ${
            score <= 1
              ? "text-rose-400"
              : score <= 3
              ? "text-amber-300"
              : "text-emerald-400"
          }`}
        >
          {strength.label}
        </span>
      </div>

      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden p-0.5">
        <motion.div
          className={`h-full rounded-full transition-all duration-500 ${strength.color}`}
          initial={{ width: 0 }}
          animate={{ width: `${strength.percentage}%` }}
        />
      </div>

      {/* Requirement List */}
      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
        {requirements.map((req, i) => (
          <div
            key={i}
            className={`flex items-center gap-1.5 transition-colors duration-300 ${
              req.pass ? "text-emerald-400" : "text-white/40"
            }`}
          >
            {req.pass ? (
              <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
            ) : (
              <X className="w-3.5 h-3.5 shrink-0 text-white/30" />
            )}
            <span>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
