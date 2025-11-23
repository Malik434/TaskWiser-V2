"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { WalletConnect } from "@/components/wallet-connect";
import { ThemeToggle } from "@/components/theme-toggle";
import { useWeb3 } from "@/components/web3-provider";
import { WalletConnectionCard } from "@/components/wallet-connection-card";

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    <div className="flex h-screen dark-container">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}

