import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { WalletConnect } from "@/components/wallet-connect";
import { LandingFeatures } from "@/components/landing-features";
import { LandingHero } from "@/components/landing-hero";
import { LandingFooter } from "@/components/landing-footer";
import { LandingAI } from "@/components/landing-ai";
import { LandingNav } from "@/components/landing-nav";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="container flex h-14 items-center justify-between px-4 sm:h-16">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary sm:h-10 sm:w-10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 text-white sm:h-5 sm:w-5"
              >
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <span className="text-base font-bold sm:text-lg md:text-xl">Task Wiser</span>
          </div>

          <LandingNav />

          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            <ThemeToggle />
            <Link href="/dashboard" className="hidden sm:block">
              <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                Dashboard
              </Button>
            </Link>
            <WalletConnect />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4">
        <LandingHero />
        <LandingFeatures />
        <LandingAI />
      </main>

      <LandingFooter />
    </div>
  );
}
