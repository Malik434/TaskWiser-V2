"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { WalletConnect } from "@/components/wallet-connect"
import { BountiesList } from "@/components/bounties-list"
import { ThemeToggle } from "@/components/theme-toggle"
import { TopDAOs } from "@/components/top-daos"
import { Contributors } from "@/components/contributors"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Globe, Users, Flame } from "lucide-react"
import { useWeb3 } from "@/components/web3-provider"
import { WalletConnectionCard } from "@/components/wallet-connection-card"

export default function DashboardPage() {
  const { isConnected, account } = useWeb3()
  const [isClient, setIsClient] = useState(false)

  // This effect ensures we only check wallet connection status on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  // If we're on the server or haven't initialized client-side yet, return nothing to avoid hydration issues
  if (!isClient) {
    return null
  }

  // If wallet is not connected, show the wallet connection card
  if (!isConnected || !account) {
    return <WalletConnectionCard />
  }

  // If wallet is connected, show the dashboard
  return (
    <div className="flex h-screen dark-container">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-sm px-6 dark-header">
          <h1 className="text-xl font-bold">Task Wiser</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <WalletConnect />
          </div>
        </header>
        <main className="container mx-auto max-w-5xl py-6 px-4 animate-in fade-in duration-500 bg-white/50 dark:bg-gray-800/30 rounded-lg shadow-sm dark:shadow-lg dark:shadow-black/10 mt-4">
          <Tabs defaultValue="bounties">
            <TabsList className="mb-6 dark:bg-gray-700/50">
              <TabsTrigger value="bounties" className="gap-2 data-[state=active]:dark:bg-gray-800">
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-500">
                  <Flame className="h-2.5 w-2.5 text-white" />
                </div>
                Bounties
              </TabsTrigger>
              <TabsTrigger value="daos" className="gap-2 data-[state=active]:dark:bg-gray-800">
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500">
                  <Globe className="h-2.5 w-2.5 text-white" />
                </div>
                Top DAOs
              </TabsTrigger>
              <TabsTrigger value="contributors" className="gap-2 data-[state=active]:dark:bg-gray-800">
                <Users className="h-4 w-4" />
                Contributors
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bounties" className="dark:bg-gray-800/20 dark:p-4 dark:rounded-lg">
              <BountiesList />
            </TabsContent>

            <TabsContent value="daos" className="dark:bg-gray-800/20 dark:p-4 dark:rounded-lg">
              <TopDAOs />
            </TabsContent>

            <TabsContent value="contributors" className="dark:bg-gray-800/20 dark:p-4 dark:rounded-lg">
              <Contributors />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
