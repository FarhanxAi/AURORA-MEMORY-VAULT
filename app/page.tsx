import React from "react";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { FloatingNavbar } from "@/components/navbar";
import { HeroSection } from "@/components/hero";
import { LandingInfoCards } from "@/components/landing-info-cards";
import { FeaturesSection } from "@/components/features";
import { AboutSection } from "@/components/about-section";
import { Footer } from "@/components/footer";

export default function LandingPage() {
  return (
    <AuroraBackground>
      <FloatingNavbar />
      <main>
        <HeroSection />
        <LandingInfoCards />
        <FeaturesSection />
        <AboutSection />
      </main>
      <Footer />
    </AuroraBackground>
  );
}
