"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, ArrowLeft, ShieldCheck } from "lucide-react";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useToast } from "@/lib/toast-context";

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { error } = useToast();

  const handleGoogleLogin = async () => {
    if (!isSupabaseConfigured()) {
      error(
        "Supabase Credentials Missing",
        "Please update NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file."
      );
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";

      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      });
      if (authError) {
        error("Google OAuth Error", authError.message);
        setIsLoading(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Google login failed";
      error("OAuth Error", message);
      setIsLoading(false);
    }
  };

  return (
    <AuroraBackground>
      <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 relative z-10">
        <Link
          href="/login"
          className="absolute top-8 left-8 flex items-center gap-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sign In</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <GlassCard className="p-8 sm:p-10 border-white/15 shadow-2xl text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-aurora-cyan via-aurora-violet to-aurora-magenta p-0.5 shadow-aurora-glow mx-auto">
              <div className="w-full h-full bg-[#030712] rounded-[22px] flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-aurora-cyan" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="font-display text-2xl font-bold text-white tracking-tight">
                Google Authentication Active
              </h1>
              <p className="text-xs text-white/70 leading-relaxed">
                Aurora uses Single Sign-On powered by Google. You do not need to manage passwords or recovery links.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-white/70 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-aurora-cyan flex-shrink-0" />
              <span>Passwordless Google Single Sign-On Security</span>
            </div>

            <GlassButton
              variant="google"
              fullWidth
              size="lg"
              isLoading={isLoading}
              onClick={handleGoogleLogin}
              leftIcon={
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12.5s.7 2.8 1.9 5.2l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 22.3 12 23z"
                  />
                </svg>
              }
            >
              Continue with Google
            </GlassButton>
          </GlassCard>
        </motion.div>
      </div>
    </AuroraBackground>
  );
}
