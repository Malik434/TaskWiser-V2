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
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-gray-200 dark:border-[#333] bg-white/80 dark:bg-[#121212] backdrop-blur-sm px-6">
          <h1 className="text-xl font-bold">Kanban Board</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <WalletConnect />
          </div>
        </header>
        <main className="animate-in fade-in duration-500">
          <KanbanBoard />
        </main>
      </div>
    </div>
  );
}
