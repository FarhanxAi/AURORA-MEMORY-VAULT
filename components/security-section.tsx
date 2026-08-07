"use client";

import React from "react";
import { motion } from "framer-motion";
import { Lock, KeyRound, Database, FileCheck } from "lucide-react";
import { GlassCard } from "./ui/glass-card";

export function SecuritySection() {
  const points = [
    {
      icon: <Lock className="w-6 h-6 text-aurora-cyan" />,
      title: "Strict Row Level Security",
      description: "Database policies strictly limit SQL access to your authenticated UUID. Nobody else can query your data.",
    },
    {
      icon: <Database className="w-6 h-6 text-aurora-violet" />,
      title: "Private Storage Buckets",
      description: "Memory uploads are stored in private Supabase buckets where object paths match your user ownership token.",
    },
    {
      icon: <KeyRound className="w-6 h-6 text-aurora-emerald" />,
      title: "Google & OAuth PKCE",
      description: "Industry-standard Proof Key for Code Exchange (PKCE) auth flow prevents authorization code interception.",
    },
    {
      icon: <FileCheck className="w-6 h-6 text-aurora-cyan" />,
      title: "Automated Profile Triggers",
      description: "Postgres triggers atomically provision your user profile row upon signup without client-side risk.",
    },
  ];

  return (
    <section id="security" className="py-24 px-4 max-w-6xl mx-auto">
      <GlassCard className="p-8 sm:p-14 bg-gradient-to-b from-white/[0.05] to-white/[0.02] border-white/15">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column Text */}
          <div className="lg:col-span-5 space-y-6">
            <span className="text-xs uppercase tracking-widest font-bold text-aurora-emerald">
              Uncompromising Protection
            </span>
            <h3 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
              Bank-Grade Security Architecture
            </h3>
            <p className="text-white/70 text-base font-light leading-relaxed">
              Aurora was designed from the database up with a zero-trust model. Your memories belong strictly to you, governed by cryptographically verified policies.
            </p>
            <div className="pt-2">
              <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>100% RLS Policy Enforced</span>
              </div>
            </div>
          </div>

          {/* Right Column Points */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {points.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3"
              >
                <div className="p-2.5 rounded-xl bg-white/[0.06] w-fit">
                  {p.icon}
                </div>
                <h4 className="font-display text-base font-bold text-white">
                  {p.title}
                </h4>
                <p className="text-xs text-white/60 leading-relaxed font-normal">
                  {p.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </GlassCard>
    </section>
  );
}
