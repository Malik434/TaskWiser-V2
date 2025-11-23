"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { WalletConnect } from "./wallet-connect";
import { useWeb3 } from "./web3-provider";

export function LandingHero() {
  const { isConnected } = useWeb3();

  const scrollToFeatures = () => {
    const featuresSection = document.getElementById("features");
    if (featuresSection) {
      const headerHeight = document.querySelector("header")?.offsetHeight || 0;
      const elementPosition =
        featuresSection.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - headerHeight - 20;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="pt-4 pb-20 md:pb-32">
      <div className="container px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_500px] lg:gap-12 xl:grid-cols-[1fr_650px]">
          <div className="flex flex-col justify-center space-y-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                Web3 Task Management with AI Superpowers
              </h1>
              <p className="max-w-[600px] text-muted-foreground md:text-xl">
                Task Wiser combines blockchain technology with artificial
                intelligence to revolutionize how DAOs and Web3 teams manage
                tasks, bounties, and contributors.
              </p>
            </div>
            <div className="flex flex-col gap-2 min-[400px]:flex-row">
              {isConnected ? (
                <Link href="/dashboard">
                  <Button size="lg" className="gap-1">
                    Go to Dashboard <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <WalletConnect />
              )}
              <Button size="lg" variant="outline" onClick={scrollToFeatures}>
                Learn More
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative w-full aspect-[4/3] max-w-[650px]">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[95%] h-[95%] rounded-lg border bg-card p-4 shadow-lg">
                  <div className="relative w-full h-full overflow-hidden rounded-md">
                    <Image
                      src="/images/LandingPlaceholder.png"
                      alt="Task Wiser Kanban Board"
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      style={{ objectFit: "cover", objectPosition: "center" }}
                      priority
                      className="transition-all duration-200 hover:scale-[1.02]"
                    />
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 rounded-lg border bg-card p-4 shadow-lg z-10">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium">
                    Smart Contract Integration
                  </span>
                </div>
              </div>
              <div className="absolute -right-6 top-1/4 rounded-lg border bg-card p-4 shadow-lg z-10">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm font-medium">
                    AI Task Prioritization
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
