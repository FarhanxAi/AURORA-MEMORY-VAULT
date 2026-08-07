"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Settings,
  Palette,
  Bell,
  Lock,
  Moon,
  Globe,
  Clock,
  Shield,
  Save,
  Check,
  Sparkles,
} from "lucide-react";
import { UserSettings } from "@/lib/types";
import { GlassButton } from "@/components/ui/glass-button";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/toast-context";

interface SettingsViewProps {
  userId: string;
}

export function SettingsView({ userId }: SettingsViewProps) {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings State
  const [theme, setTheme] = useState("Vision Pro Glass");
  const [dateFormat, setDateFormat] = useState("YYYY-MM-DD");
  const [timeFormat, setTimeFormat] = useState("12h");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [memoryReminders, setMemoryReminders] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(false);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [privateByDefault, setPrivateByDefault] = useState(true);
  const [autoLock, setAutoLock] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("30m");

  // Fetch settings from Supabase
  const fetchSettings = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (data) {
        setTheme(data.theme || "Vision Pro Glass");
        setDateFormat(data.date_format || "YYYY-MM-DD");
        setTimeFormat(data.time_format || "12h");
        setEmailNotifications(data.email_notifications ?? true);
        setMemoryReminders(data.memory_reminders ?? true);
        setWeeklySummary(data.weekly_summary ?? false);
        setSecurityAlerts(data.security_alerts ?? true);
        setPrivateByDefault(data.private_by_default ?? true);
        setAutoLock(data.auto_lock ?? false);
        setSessionTimeout(data.session_timeout || "30m");
      }
    } catch (err) {
      console.error("Fetch settings error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Save Settings to Supabase
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const supabase = createClient();
      const payload = {
        user_id: userId,
        theme,
        date_format: dateFormat,
        time_format: timeFormat,
        email_notifications: emailNotifications,
        memory_reminders: memoryReminders,
        weekly_summary: weeklySummary,
        security_alerts: securityAlerts,
        private_by_default: privateByDefault,
        auto_lock: autoLock,
        session_timeout: sessionTimeout,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertErr } = await supabase
        .from("user_settings")
        .upsert(payload, { onConflict: "user_id" });

      if (upsertErr) throw upsertErr;

      success("Settings Saved", "Your preferences have been synchronized.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save settings";
      error("Save Error", msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel p-12 rounded-3xl text-center text-xs text-white/50 space-y-2">
        <Sparkles className="w-6 h-6 text-aurora-cyan animate-pulse mx-auto" />
        <p>Loading Vault Preferences...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSaveSettings} className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="glass-panel p-6 rounded-3xl border border-white/12 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-aurora-cyan to-aurora-violet p-0.5 shadow-aurora-glow">
            <div className="w-full h-full bg-[#030712] rounded-[14px] flex items-center justify-center">
              <Settings className="w-5 h-5 text-aurora-cyan" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white tracking-tight">
              Vault Preferences & Settings
            </h2>
            <p className="text-xs text-white/50">
              Customize theme aesthetics, notifications, and security controls
            </p>
          </div>
        </div>

        <GlassButton
          type="submit"
          variant="primary"
          size="sm"
          isLoading={saving}
          leftIcon={<Save className="w-4 h-4" />}
        >
          Save Preferences
        </GlassButton>
      </div>

      {/* 1. GENERAL THEME & DISPLAY */}
      <div className="glass-panel p-6 rounded-3xl border border-white/12 space-y-4 shadow-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
          <Palette className="w-4 h-4 text-aurora-cyan" />
          <span>Appearance & Formatting</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Theme Selector */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-white/80">Design System Theme</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full p-3 rounded-2xl bg-[#0b1020] border border-white/10 text-xs text-white focus:outline-none focus:border-aurora-cyan/60 cursor-pointer"
            >
              <option value="Vision Pro Glass">Apple Vision Pro Liquid Glass</option>
              <option value="Dark Obsidian">Dark Obsidian Minimal</option>
              <option value="Cosmic Aurora">Cosmic Cyber Aurora</option>
            </select>
          </div>

          {/* Date Format */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-white/80">Date Format</label>
            <select
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
              className="w-full p-3 rounded-2xl bg-[#0b1020] border border-white/10 text-xs text-white focus:outline-none focus:border-aurora-cyan/60 cursor-pointer"
            >
              <option value="YYYY-MM-DD">YYYY-MM-DD (2026-07-27)</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY (07/27/2026)</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY (27/07/2026)</option>
            </select>
          </div>

          {/* Time Format */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-white/80">Time Display Format</label>
            <select
              value={timeFormat}
              onChange={(e) => setTimeFormat(e.target.value)}
              className="w-full p-3 rounded-2xl bg-[#0b1020] border border-white/10 text-xs text-white focus:outline-none focus:border-aurora-cyan/60 cursor-pointer"
            >
              <option value="12h">12-Hour Clock (e.g. 05:30 PM)</option>
              <option value="24h">24-Hour Clock (e.g. 17:30)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. NOTIFICATIONS PREFERENCES */}
      <div className="glass-panel p-6 rounded-3xl border border-white/12 space-y-4 shadow-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
          <Bell className="w-4 h-4 text-aurora-violet" />
          <span>Notification Preferences</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              id: "email",
              title: "Email Notifications",
              desc: "Receive security alerts & session verification links.",
              checked: emailNotifications,
              onChange: setEmailNotifications,
            },
            {
              id: "reminders",
              title: "Memory Reminders",
              desc: "Get periodic anniversary reminders of past memories.",
              checked: memoryReminders,
              onChange: setMemoryReminders,
            },
            {
              id: "weekly",
              title: "Weekly Vault Summary",
              desc: "Digest of memories captured and smart insights.",
              checked: weeklySummary,
              onChange: setWeeklySummary,
            },
            {
              id: "security",
              title: "Security & Login Alerts",
              desc: "Immediate alert when new sign-in is detected.",
              checked: securityAlerts,
              onChange: setSecurityAlerts,
            },
          ].map((item) => (
            <label
              key={item.id}
              className="p-4 rounded-2xl bg-white/[0.03] border border-white/8 hover:bg-white/[0.07] transition-all flex items-start gap-3 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => item.onChange(e.target.checked)}
                className="mt-1 rounded border-white/20 bg-white/5 text-aurora-cyan focus:ring-aurora-cyan"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white">{item.title}</span>
                <p className="text-[11px] text-white/50">{item.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 3. PRIVACY & SECURITY CONTROLS */}
      <div className="glass-panel p-6 rounded-3xl border border-white/12 space-y-4 shadow-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
          <Lock className="w-4 h-4 text-rose-400" />
          <span>Privacy & Security Controls</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Private by Default Toggle */}
          <label className="p-4 rounded-2xl bg-white/[0.03] border border-white/8 hover:bg-white/[0.07] transition-all flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={privateByDefault}
              onChange={(e) => setPrivateByDefault(e.target.checked)}
              className="mt-1 rounded border-white/20 bg-white/5 text-aurora-cyan focus:ring-aurora-cyan"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white">Private by Default</span>
              <p className="text-[11px] text-white/50">
                Newly created memories default to private visibility.
              </p>
            </div>
          </label>

          {/* Auto Lock */}
          <label className="p-4 rounded-2xl bg-white/[0.03] border border-white/8 hover:bg-white/[0.07] transition-all flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoLock}
              onChange={(e) => setAutoLock(e.target.checked)}
              className="mt-1 rounded border-white/20 bg-white/5 text-aurora-cyan focus:ring-aurora-cyan"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white">Auto Lock Vault</span>
              <p className="text-[11px] text-white/50">
                Lock memory interface after inactivity.
              </p>
            </div>
          </label>

          {/* Session Timeout */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/8 space-y-1">
            <label className="text-xs font-bold text-white">Session Timeout</label>
            <select
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(e.target.value)}
              className="w-full mt-1 p-2 rounded-xl bg-[#0b1020] border border-white/10 text-xs text-white focus:outline-none focus:border-aurora-cyan/60 cursor-pointer"
            >
              <option value="off">Off (Keep logged in)</option>
              <option value="15m">15 Minutes</option>
              <option value="30m">30 Minutes</option>
              <option value="1h">1 Hour</option>
            </select>
          </div>
        </div>
      </div>
    </form>
  );
}
