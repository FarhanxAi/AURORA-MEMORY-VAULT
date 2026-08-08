"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sun, Moon, Sunrise, Calendar, Clock, Sparkles } from "lucide-react";
import { UserProfile } from "@/lib/types";

interface WelcomeHeaderProps {
  user: UserProfile | null;
}

export function WelcomeHeader({ user }: WelcomeHeaderProps) {
  const [greeting, setGreeting] = useState("Good Day");
  const [greetingIcon, setGreetingIcon] = useState<React.ReactNode>(
    <Sun className="w-5 h-5 text-amber-300" />
  );
  const [currentTimeStr, setCurrentTimeStr] = useState("");
  const [currentDateStr, setCurrentDateStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hour = now.getHours();

      if (hour >= 5 && hour < 12) {
        setGreeting("Good Morning");
        setGreetingIcon(<Sunrise className="w-5 h-5 text-amber-300 animate-pulse" />);
      } else if (hour >= 12 && hour < 18) {
        setGreeting("Good Afternoon");
        setGreetingIcon(<Sun className="w-5 h-5 text-amber-400" />);
      } else {
        setGreeting("Good Evening");
        setGreetingIcon(<Moon className="w-5 h-5 text-aurora-cyan" />);
      }

      setCurrentTimeStr(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
      setCurrentDateStr(
        now.toLocaleDateString([], {
          weekday: "long",
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-white/[0.05] via-white/[0.03] to-white/[0.01] backdrop-blur-2xl border border-white/12 shadow-glass-md my-6"
    >
      {/* Background Specular Flare */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-aurora-cyan/15 blur-[90px]" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Left Welcome Text */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-xs font-semibold text-white/80">
            {greetingIcon}
            <span>{greeting}</span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
            Welcome back,{" "}
            <span className="gradient-text-aurora">
              {user?.full_name || "Memory Collector"}
            </span>
          </h1>

          <p className="text-sm text-white/60 font-light max-w-xl">
            Your personal digital memory vault is active and secured with 256-bit RLS encryption.
          </p>
        </div>

        {/* Right Date / Time Glass Pill */}
        <div className="flex flex-row sm:flex-col items-center md:items-end gap-3 self-stretch md:self-auto justify-between border-t md:border-t-0 border-white/10 pt-4 md:pt-0">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/[0.04] border border-white/10 text-xs font-semibold text-white/80 backdrop-blur-md">
            <Calendar className="w-4 h-4 text-aurora-cyan" />
            <span>{currentDateStr || "Today"}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-aurora-cyan/10 border border-aurora-cyan/20 text-xs font-bold text-aurora-cyan shadow-aurora-glow">
            <Clock className="w-4 h-4" />
            <span className="font-mono tracking-wider">{currentTimeStr || "00:00"}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
