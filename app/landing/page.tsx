"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";
import { ArrowRight, Sparkles, Shield, Cpu, Share2 } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { WalletConnect } from "@/components/wallet-connect";
import { LandingFeatures } from "@/components/landing-features";
import { LandingFooter } from "@/components/landing-footer";
import { LandingAI } from "@/components/landing-ai";
import { LandingNav } from "@/components/landing-nav";

const STAT_HIGHLIGHTS = [
  { label: "Automated payouts", value: "12K+" },
  { label: "Contributors onboarded", value: "8.4K" },
  { label: "DAOs powered", value: "160+" },
  { label: "AI insights / week", value: "35K" },
];

const WORKFLOW_STEPS = [
  {
    icon: Sparkles,
    title: "AI-assisted kickoff",
    copy: "Spin up bounty boards in seconds with prompts instead of spreadsheets.",
  },
  {
    icon: Shield,
    title: "Trustless execution",
    copy: "Escrow budgets, auto-release rewards, and keep everything on-chain.",
  },
  {
    icon: Cpu,
    title: "Adaptive prioritization",
    copy: "Our AI observes progress and reshuffles workstreams dynamically.",
  },
  {
    icon: Share2,
    title: "Seamless handoff",
    copy: "Ship work to dashboards, Discord, or Mirror with one tap.",
  },
];

function HeroScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const sceneRef = useRef<{
    orb: THREE.Mesh;
    material: THREE.MeshStandardMaterial;
    glow: THREE.PointLight;
    fillLight: THREE.AmbientLight;
    starMaterial: THREE.PointsMaterial;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update colors when theme changes
  useEffect(() => {
    if (!sceneRef.current || !mounted) return;
    const isDark = resolvedTheme === "dark";

    // Orb colors - brighter in dark mode, softer in light
    sceneRef.current.material.color.setHex(isDark ? 0x8a9aff : 0x6366f1);
    sceneRef.current.material.emissive.setHex(isDark ? 0x5555ff : 0x3333aa);
    sceneRef.current.material.emissiveIntensity = isDark ? 0.7 : 0.4;

    // Lighting - more dramatic in dark mode
    sceneRef.current.glow.color.setHex(isDark ? 0x9d7fff : 0x8b5cf6);
    sceneRef.current.glow.intensity = isDark ? 1.4 : 0.8;

    sceneRef.current.fillLight.intensity = isDark ? 0.2 : 0.35;

    // Stars - more visible in dark mode
    sceneRef.current.starMaterial.color.setHex(isDark ? 0xffffff : 0xaaaacc);
    sceneRef.current.starMaterial.opacity = isDark ? 0.8 : 0.4;
  }, [resolvedTheme, mounted]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mounted) return;

    const isDark = resolvedTheme === "dark";

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 4.2;

    const geometry = new THREE.IcosahedronGeometry(1.2, 2);
    const material = new THREE.MeshStandardMaterial({
      color: isDark ? 0x8a9aff : 0x6366f1,
      wireframe: true,
      emissive: isDark ? 0x5555ff : 0x3333aa,
      emissiveIntensity: isDark ? 0.7 : 0.4,
    });
    const orb = new THREE.Mesh(geometry, material);
    scene.add(orb);

    const glow = new THREE.PointLight(isDark ? 0x9d7fff : 0x8b5cf6, isDark ? 1.4 : 0.8, 10);
    glow.position.set(1, 2, 3);
    scene.add(glow);

    const fillLight = new THREE.AmbientLight(0xffffff, isDark ? 0.2 : 0.35);
    scene.add(fillLight);

    const starGeometry = new THREE.BufferGeometry();
    const starVertices = [];
    for (let i = 0; i < 500; i++) {
      starVertices.push((Math.random() - 0.5) * 10);
      starVertices.push((Math.random() - 0.5) * 10);
      starVertices.push((Math.random() - 0.5) * 10);
    }
    starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starVertices, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: isDark ? 0xffffff : 0xaaaacc,
      size: 0.015,
      transparent: true,
      opacity: isDark ? 0.8 : 0.4,
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Store references for theme updates
    sceneRef.current = { orb, material, glow, fillLight, starMaterial };

    const resize = () => {
      const { clientWidth, clientHeight } = canvas;
      if (!clientWidth || !clientHeight) return;
      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      orb.rotation.x += 0.003;
      orb.rotation.y += 0.004;
      stars.rotation.y += 0.0008;
      renderer.render(scene, camera);
    };

    resize();
    animate();
    window.addEventListener("resize", resize);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resize);
      renderer.dispose();
      geometry.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      material.dispose();
      sceneRef.current = null;
    };
  }, [resolvedTheme, mounted]);

  return <canvas ref={canvasRef} className="h-full w-full" />;
}

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100 text-slate-900 transition-colors dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-50">
      {/* Light/Dark adaptive ambient glow layers with smooth transitions */}
      <div className="pointer-events-none absolute inset-0 opacity-60 transition-opacity duration-700 dark:opacity-80">
        <div className="absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(circle_at_top,_rgba(147,197,253,0.4),_transparent_60%)] blur-3xl transition-all duration-1000 dark:bg-[radial-gradient(circle_at_top,_rgba(124,136,255,0.5),_transparent_55%)]" />
        <div className="absolute bottom-0 left-1/2 h-[360px] w-[360px] -translate-x-1/2 bg-[radial-gradient(circle,_rgba(99,102,241,0.3),_transparent_70%)] blur-2xl transition-all duration-1000 dark:bg-[radial-gradient(circle,_rgba(147,51,234,0.45),_transparent_65%)]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl transition-colors dark:border-slate-800/60 dark:bg-slate-950/80">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white font-semibold shadow-md">
              TW
            </div>
            <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">Task Wiser</span>
          </div>

          <LandingNav />

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/dashboard" className="hidden md:block">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800"
              >
                Dashboard
              </Button>
            </Link>
            <WalletConnect />
          </div>
        </div>
      </header>

      <main className="container relative z-10 mx-auto space-y-24 px-4 pb-16 pt-12 sm:pt-20 lg:space-y-32">
        {/* Hero Section */}
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-100 px-4 py-1 text-sm text-slate-700 backdrop-blur dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Modular OS for Web3 contributors
            </div>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-slate-50">
              Orchestrate tasks, bounties, & payouts in one cinematic canvas.
            </h1>
            <p className="max-w-xl text-base text-slate-600 sm:text-lg dark:text-slate-400">
              Task Wiser fuses AI copilots with trust-minimized rails so your DAO can move at product speed. Draft scopes, match the right talent, and automate releases without leaving the flow.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/dashboard" className="flex-1">
                <Button className="h-12 w-full gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 text-base font-semibold text-white shadow-[0_20px_60px_rgba(99,102,241,0.4)] transition hover:scale-[1.01] hover:shadow-[0_20px_70px_rgba(99,102,241,0.5)]">
                  Launch Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <button
                onClick={() => {
                  const target = document.getElementById("features");
                  if (!target) return;
                  target.scrollIntoView({ behavior: "smooth" });
                }}
                className="h-12 rounded-full border border-slate-300 bg-white px-6 text-base font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800"
              >
                Explore the stack
              </button>
            </div>
            <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white/60 p-4 shadow-lg backdrop-blur transition-all duration-500 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center justify-between text-sm text-slate-600 transition-colors duration-300 dark:text-slate-400">
                <span>Live payment stream</span>
                <span className="font-semibold text-slate-900 transition-colors duration-300 dark:text-slate-100">Ξ 48.3 released</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 transition-colors duration-500 dark:bg-slate-800">
                <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 animate-pulse" />
              </div>
              <p className="text-xs text-slate-600 transition-colors duration-300 dark:text-slate-500">
                Smart contracts authed the latest milestone drop for the Zeta public goods fund 12 minutes ago.
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-indigo-400/20 via-transparent to-purple-400/10 blur-3xl transition-all duration-1000 dark:from-indigo-500/30 dark:to-purple-500/20" />
            <div className="relative rounded-[32px] border border-slate-300 bg-slate-100/80 p-1 shadow-2xl backdrop-blur transition-all duration-500 dark:border-slate-700 dark:bg-slate-900/80">
              <div className="rounded-[28px] bg-slate-50 p-8 transition-colors duration-500 dark:bg-slate-950/90">
                <div className="h-[320px] w-full rounded-3xl border border-slate-200 bg-gradient-to-b from-slate-100 to-slate-50 shadow-inner transition-all duration-500 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
                  <HeroScene />
                </div>
                <div className="mt-6 grid gap-3">
                  <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                    <span>Orbit velocity</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">92%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                    <span>Signal quality</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">Stable</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    The 3D control stack visualizes contributors moving through workstreams in real-time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-lg backdrop-blur transition-all duration-500 md:grid-cols-4 dark:border-slate-800 dark:bg-slate-900/70">
          {STAT_HIGHLIGHTS.map((stat) => (
            <div key={stat.label} className="space-y-2 border-slate-200 transition-colors duration-300 md:border-l md:pl-6 first:md:border-none first:md:pl-0 dark:border-slate-800">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500 transition-colors duration-300 dark:text-slate-500">{stat.label}</p>
              <p className="text-3xl font-semibold text-slate-900 transition-colors duration-300 dark:text-slate-100">{stat.value}</p>
            </div>
          ))}
        </section>

        <LandingFeatures />

        {/* Workflow Section */}
        <section className="grid gap-8 rounded-[32px] border border-slate-200 bg-gradient-to-b from-slate-100 to-slate-50 p-8 shadow-xl backdrop-blur transition-all duration-500 lg:grid-cols-[0.9fr_1.1fr] dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-1 text-sm text-slate-700 shadow-sm transition-all duration-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Sparkles className="h-4 w-4 text-primary" />
              Adaptive workflow engine
            </span>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 transition-colors duration-300 sm:text-4xl dark:text-slate-50">The flow from idea to payout is choreographed for you.</h2>
            <p className="text-base text-slate-600 transition-colors duration-300 dark:text-slate-400">
              Mix AI copilots, contributor reputation, and on-chain automations. Task Wiser keeps everyone aligned while surfacing the next-best action automatically.
            </p>
            <Link href="/projects">
              <Button variant="outline" className="mt-4 rounded-full border-slate-300 bg-white text-slate-700 transition-all duration-300 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800">
                Browse live projects
              </Button>
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {WORKFLOW_STEPS.map((step) => (
              <div key={step.title} className="space-y-2 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-md backdrop-blur transition-all duration-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/80">
                <step.icon className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-slate-900 transition-colors duration-300 dark:text-slate-100">{step.title}</h3>
                <p className="text-sm text-slate-600 transition-colors duration-300 dark:text-slate-400">{step.copy}</p>
              </div>
            ))}
          </div>
        </section>

        <LandingAI />

        {/* CTA Section */}
        <section className="rounded-[32px] border border-indigo-300 bg-gradient-to-r from-indigo-200 via-purple-200 to-fuchsia-200 p-10 text-center shadow-[0_20px_80px_rgba(99,102,241,0.3)] backdrop-blur transition-all duration-700 dark:border-indigo-600 dark:from-indigo-950/80 dark:via-purple-950/80 dark:to-fuchsia-950/80 dark:shadow-[0_20px_80px_rgba(99,102,241,0.4)]">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-600 transition-colors duration-300 dark:text-slate-400">Ready to deploy?</p>
          <h3 className="mt-4 text-3xl font-semibold text-slate-900 transition-colors duration-300 sm:text-4xl dark:text-slate-50">Launch the command center for your DAO in minutes.</h3>
          <p className="mt-3 text-base text-slate-700 transition-colors duration-300 dark:text-slate-300">
            Connect a wallet, invite contributors, and let Task Wiser choreograph the heavy lifting.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/dashboard">
              <Button className="h-12 rounded-full bg-slate-900 text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">Get started free</Button>
            </Link>
            <Link href="/explore">
              <Button variant="outline" className="h-12 rounded-full border-slate-400 bg-white text-slate-700 transition-all duration-300 hover:border-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-800">
                Explore public bounties
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
