"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { WalletConnect } from "@/components/wallet-connect";
import { KanbanBoard } from "@/components/kanban-board";
import { ThemeToggle } from "@/components/theme-toggle";
import { useWeb3 } from "@/components/web3-provider";
import { WalletConnectionCard } from "@/components/wallet-connection-card";

export default function BoardPage() {
  const { isConnected, account } = useWeb3();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  if (!isConnected || !account) {
    return <WalletConnectionCard />;
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-[hsl(210,40%,98%)] to-[hsl(250,40%,98%)] dark:bg-[#121212]">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-gray-200 dark:border-[#333] bg-white/80 dark:bg-[#121212] backdrop-blur-sm px-4 sm:h-16 sm:px-6">
          <h1 className="text-lg font-bold sm:text-xl md:ml-0 ml-12">Kanban Board</h1>
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <div className="hidden sm:block">
              <WalletConnect />
            </div>
          </div>
        </header>
        <main className="animate-in fade-in duration-500">
          <KanbanBoard />
        </main>
      </div>
    </div>
  );
}
