"use client";

import { useEffect, useRef } from "react";

const COLORS = [
  "22,163,74", // green
  "234,88,12", // orange
  "220,38,38", // red
  "37,99,235", // blue
  "147,51,234", // purple
  "6,182,212", // cyan
];

export function ParticleField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Reduce particles on mobile
    const isMobile = window.innerWidth < 768;
    const count = isMobile ? 80 : 160;

    const dots: {
      x: number;
      y: number;
      r: number;
      vx: number;
      vy: number;
      color: string;
      a: number;
      da: number;
    }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 80 + Math.random() * 260;
      const cx = canvas.width * 0.72;
      const cy = canvas.height * 0.45;
      dots.push({
        x: cx + Math.cos(angle) * radius + (Math.random() - 0.5) * 100,
        y: cy + Math.sin(angle) * radius + (Math.random() - 0.5) * 80,
        r: Math.random() * 2.8 + 0.8,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
        a: Math.random() * 0.6 + 0.3,
        da: (Math.random() * 0.004 + 0.001) * (Math.random() < 0.5 ? 1 : -1),
      });
    }

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const d of dots) {
        d.x += d.vx;
        d.y += d.vy;
        d.a += d.da;
        if (d.a >= 0.9 || d.a <= 0.15) d.da *= -1;
        if (d.x < 0 || d.x > canvas.width) d.vx *= -1;
        if (d.y < 0 || d.y > canvas.height) d.vy *= -1;
        ctx.globalAlpha = d.a;
        ctx.fillStyle = `rgba(${d.color},1)`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none absolute inset-0 z-0"
      aria-hidden
    />
  );
}
