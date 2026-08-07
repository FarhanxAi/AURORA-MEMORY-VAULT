"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, ArrowLeft, ShieldCheck, Lock, Zap } from "lucide-react";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useToast } from "@/lib/toast-context";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");
  const [isLoading, setIsLoading] = useState(false);

  const { error } = useToast();

  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          router.push("/dashboard");
        }
      } catch (err) {
        console.warn("Signup session check notice:", err);
      }
    };
    checkActiveSession();
  }, [router]);

  useEffect(() => {
    if (oauthError) {
      const decoded = decodeURIComponent(oauthError);
      if (decoded === "oauth_failed") {
        error("Authentication Failed", "Google authentication could not be completed. Please try again.");
      } else {
        error("Authentication Error", decoded);
      }
    }
  }, [oauthError, error]);

  const handleGoogleSignup = async () => {
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
      const origin = window.location.origin.includes("0.0.0.0")
        ? window.location.origin.replace("0.0.0.0", "localhost")
        : window.location.origin;

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
      const message = err instanceof Error ? err.message : "Google signup failed";
      error("OAuth Error", message);
      setIsLoading(false);
    }
  };

  return (
    <AuroraBackground>
      <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 relative z-10">
        {/* Back Link */}
        <Link
          href="/"
          className="absolute top-8 left-8 flex items-center gap-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Landing</span>
        </Link>

        {/* Card Container */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <GlassCard className="p-8 sm:p-10 border-white/15 shadow-2xl">
            {/* Header */}
            <div className="text-center space-y-3 mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-aurora-cyan via-aurora-violet to-aurora-magenta p-0.5 shadow-aurora-glow mx-auto mb-1">
                <div className="w-full h-full bg-[#030712] rounded-[22px] flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-aurora-cyan animate-pulse" />
                </div>
              </div>
              <h1 className="font-display text-3xl font-bold text-white tracking-tight">
                Create Your Vault
              </h1>
              <p className="text-xs sm:text-sm text-white/60 leading-relaxed max-w-xs mx-auto">
                Sign up with Google to protect your digital memories forever.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 mb-8 text-xs text-white/70">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-aurora-cyan flex-shrink-0" />
                <span>Zero-Knowledge Encrypted Storage</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-aurora-violet flex-shrink-0" />
                <span>Seamless Single-Click Google Authentication</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Zap className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Instant Vault Creation & Restoration</span>
              </div>
            </div>

            {/* Main Action - Google OAuth */}
            <div className="space-y-4">
              <GlassButton
                variant="google"
                fullWidth
                size="lg"
                isLoading={isLoading}
                onClick={handleGoogleSignup}
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
                Sign up with Google
              </GlassButton>
            </div>

            {/* Footer Note */}
            <div className="mt-8 text-center text-xs text-white/50 pt-4 border-t border-white/10 space-y-2">
              <p>
                Already have a vault?{" "}
                <Link href="/login" className="text-aurora-cyan font-semibold hover:underline">
                  Sign In
                </Link>
              </p>
              <p className="text-[11px] text-white/40">
                Protected by Aurora Vault Security &bull; Google OAuth
              </p>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </AuroraBackground>
  );
}

export default function SignupPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-[#030712]" />}>
      <SignupForm />
    </React.Suspense>
  );
}
