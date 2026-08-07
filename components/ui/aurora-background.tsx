"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export function AuroraBackground({ children }: { children?: React.ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mouse reactive glow coordinates
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Floating Glass Particles Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Particle Object setup
    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2.2 + 0.6,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.5 + 0.15,
      pulseSpeed: Math.random() * 0.02 + 0.005,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw floating particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha += Math.sin(Date.now() * p.pulseSpeed) * 0.003;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.05, Math.min(0.7, p.alpha))})`;
        ctx.shadowBlur = 12;
        ctx.shadowColor = "rgba(56, 189, 248, 0.6)";
        ctx.fill();
      });

      // Mouse reactive glow line connections
      ctx.shadowBlur = 0;
      const { x: mx, y: my } = mouseRef.current;
      particles.forEach((p) => {
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 140) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mx, my);
          ctx.strokeStyle = `rgba(56, 189, 248, ${(1 - dist / 140) * 0.25})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#030712] text-foreground">
      {/* Animated Aurora Glow Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Cyan Aurora Mesh */}
        <motion.div
          className="absolute -top-[20%] left-[10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-aurora-cyan/25 to-aurora-teal/10 blur-[130px]"
          animate={{
            x: [0, 80, -50, 0],
            y: [0, -60, 40, 0],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Violet Aurora Mesh */}
        <motion.div
          className="absolute top-[30%] -right-[10%] w-[650px] h-[650px] rounded-full bg-gradient-to-br from-aurora-violet/20 to-aurora-indigo/15 blur-[140px]"
          animate={{
            x: [0, -70, 40, 0],
            y: [0, 50, -40, 0],
            scale: [1, 1.15, 0.95, 1],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Emerald Glow Bottom */}
        <motion.div
          className="absolute -bottom-[20%] left-[30%] w-[700px] h-[500px] rounded-full bg-gradient-to-t from-aurora-emerald/15 to-transparent blur-[160px]"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Mouse Reactive Specular Spotlight */}
        <div
          className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(650px circle at ${mouseRef.current.x || 500}px ${
              mouseRef.current.y || 300
            }px, rgba(56, 189, 248, 0.06), transparent 80%)`,
          }}
        />
      </div>

      {/* Floating Glass Particles Canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-0"
      />

      {/* Main Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
