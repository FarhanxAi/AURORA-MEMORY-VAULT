"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Menu, X } from "lucide-react";
import { GlassButton } from "./ui/glass-button";
import { createClient } from "@/lib/supabase/client";

export function FloatingNavbar() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  const handleVaultClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    try {
      const supabase = createClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";

      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      });
    } catch (err) {
      console.error("OAuth error:", err);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4 sm:pt-6">
      <nav
        className={`w-full max-w-6xl transition-all duration-500 rounded-full px-6 py-3.5 flex items-center justify-between ${
          scrolled
            ? "glass-navbar shadow-[0_16px_40px_rgba(0,0,0,0.7)]"
            : "bg-white/[0.04] backdrop-blur-xl border border-white/10"
        }`}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-aurora-cyan via-aurora-indigo to-aurora-violet p-0.5 shadow-aurora-glow group-hover:scale-105 transition-transform duration-300">
            <div className="w-full h-full bg-[#030712] rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-aurora-cyan group-hover:rotate-12 transition-transform duration-300" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-display text-xl font-bold tracking-tight text-white group-hover:text-aurora-cyan transition-colors">
              Aurora
            </span>
            <span className="text-[10px] tracking-widest text-white/50 uppercase font-semibold">
              Memory Vault
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
          <Link
            href="#features"
            className="hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all"
          >
            Features
          </Link>
          <Link
            href="#security"
            className="hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all"
          >
            Security
          </Link>
          <Link
            href="#about"
            className="hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all"
          >
            About
          </Link>
        </div>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <GlassButton
            variant="primary"
            size="sm"
            onClick={handleVaultClick}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Continue with Google
          </GlassButton>
        </div>

        {/* Mobile Menu Trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-white/80 hover:text-white p-2 rounded-xl bg-white/5 border border-white/10"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-4 top-24 z-50 glass-panel rounded-3xl p-6 border border-white/15 space-y-4 animate-fadeIn">
          <div className="flex flex-col gap-4 text-base font-medium text-white/80">
            <Link
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-white"
            >
              Features
            </Link>
            <Link
              href="#security"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-white"
            >
              Security
            </Link>
            <Link
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-white"
            >
              About
            </Link>
          </div>
          <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
            <GlassButton
              variant="primary"
              fullWidth
              size="md"
              onClick={handleVaultClick}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Continue with Google
            </GlassButton>
          </div>
        </div>
      )}
    </header>
  );
}

