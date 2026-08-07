"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { GlassButton } from "./ui/glass-button";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/toast-context";

export function HeroSection() {
  const router = useRouter();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setIsAuthenticated(!!user);
      } catch (err) {
        setIsAuthenticated(false);
      }
    };
    checkSession();
  }, []);

  const handleGoogleButtonClick = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    try {
      const supabase = createClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      });
      if (error) {
        toast(error.message, "Please check Google OAuth setup in Supabase dashboard", "error");
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Google Sign-In failed";
      toast(errorMsg, "Please configure SUPABASE_URL and SUPABASE_ANON_KEY", "error");
    }
  };

  return (
    <section className="relative pt-36 pb-24 md:pt-48 md:pb-36 px-4 max-w-6xl mx-auto text-center flex flex-col items-center justify-center">
      {/* Specular Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] backdrop-blur-xl border border-white/15 text-xs font-semibold text-aurora-cyan shadow-glass-sm mb-8"
      >
        <ShieldCheck className="w-4 h-4 text-aurora-cyan" />
        <span className="tracking-wide">Next-Generation Zero-Knowledge Vault</span>
        <span className="w-1.5 h-1.5 rounded-full bg-aurora-cyan animate-pulse" />
      </motion.div>

      {/* Main Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="font-display text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight max-w-4xl leading-[1.08] text-white"
      >
        Aurora
        <span className="block mt-2 font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold gradient-text-aurora">
          Your Digital Memory Vault
        </span>
      </motion.h1>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6 text-lg sm:text-xl lg:text-2xl text-white/70 max-w-2xl font-light leading-relaxed"
      >
        Store your memories securely.
        <br />
        Relive them beautifully.
        <br />
        Protect them forever.
      </motion.p>

      {/* Primary CTA Button - Continue with Google */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="mt-10 flex items-center justify-center w-full max-w-sm"
      >
        <GlassButton
          variant="google"
          size="lg"
          fullWidth
          onClick={handleGoogleButtonClick}
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
      </motion.div>
    </section>
  );
}

