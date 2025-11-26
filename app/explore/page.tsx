"use client"

import { Sidebar } from "@/components/sidebar"
import { WalletConnect } from "@/components/wallet-connect"
import { BountiesList } from "@/components/bounties-list"
import { ThemeToggle } from "@/components/theme-toggle"
import { TopDAOs } from "@/components/top-daos"
import { Contributors } from "@/components/contributors"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Globe, Users, Flame, Sparkles, TrendingUp } from "lucide-react"
import { ProtectedRoute } from "@/components/protected-route"

export default function ExplorePage() {
  return (
    <ProtectedRoute>
    <div className="flex h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        {/* Enhanced Header */}
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3 md:ml-0 ml-12">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                  Explore
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Discover opportunities
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <ThemeToggle />
              <div className="hidden sm:block">
                <WalletConnect />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="animate-in fade-in duration-500 p-4 sm:p-6">
          <div className="mx-auto max-w-7xl">
            {/* Page Header */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm text-slate-700 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                <TrendingUp className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                Web3 Ecosystem
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
                Explore the Ecosystem
              </h2>
              <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
                Find bounties, join DAOs, and connect with top contributors across the Web3 space
              </p>
            </div>

            {/* Enhanced Tabs */}
            <Tabs defaultValue="bounties" className="space-y-6">
              <TabsList className="flex h-auto w-full gap-2 rounded-2xl border border-slate-200 bg-white/80 p-1.5 shadow-lg backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80 sm:inline-flex sm:w-auto">
                <TabsTrigger
                  value="bounties"
                  className="flex-1 gap-1.5 rounded-xl px-3 py-2.5 text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white data-[state=active]:shadow-lg sm:flex-none sm:gap-2 sm:px-6 sm:py-3 sm:text-base transition-all"
                >
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 data-[state=active]:bg-white/20 sm:h-5 sm:w-5">
                    <Flame className="h-2.5 w-2.5 text-white sm:h-3 sm:w-3" />
                  </div>
                  <span className="font-semibold">Bounties</span>
                </TabsTrigger>
                <TabsTrigger
                  value="daos"
                  className="flex-1 gap-1.5 rounded-xl px-3 py-2.5 text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg sm:flex-none sm:gap-2 sm:px-6 sm:py-3 sm:text-base transition-all"
                >
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 data-[state=active]:bg-white/20 sm:h-5 sm:w-5">
                    <Globe className="h-2.5 w-2.5 text-white sm:h-3 sm:w-3" />
                  </div>
                  <span className="font-semibold">DAOs</span>
                </TabsTrigger>
                <TabsTrigger
                  value="contributors"
                  className="flex-1 gap-1.5 rounded-xl px-3 py-2.5 text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-fuchsia-500 data-[state=active]:text-white data-[state=active]:shadow-lg sm:flex-none sm:gap-2 sm:px-6 sm:py-3 sm:text-base transition-all"
                >
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 data-[state=active]:bg-white/20 sm:h-5 sm:w-5">
                    <Users className="h-2.5 w-2.5 text-white sm:h-3 sm:w-3" />
                  </div>
                  <span className="font-semibold">Contributors</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="bounties" className="mt-6">
                <BountiesList />
              </TabsContent>

              <TabsContent value="daos" className="mt-6">
                <TopDAOs />
              </TabsContent>

              <TabsContent value="contributors" className="mt-6">
                <Contributors />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
    </ProtectedRoute>
  )
}
