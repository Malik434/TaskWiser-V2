"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useWeb3 } from "./web3-provider";
import { useFirebase } from "./firebase-provider";
import { ProfileSetupForm } from "./profile-setup-form";
import { Wallet, Loader2 } from "lucide-react";
import type { UserProfile } from "@/lib/types";
import { usePathname } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function WalletConnect() {
  const {
    account,
    connectWallet,
    disconnectWallet,
    isConnecting,
    isConnected,
  } = useWeb3();
  const { getUserProfile } = useFirebase();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);
  const pathname = usePathname();

  // Check if we're on the landing page
  const isLandingPage = pathname === "/landing";

  useEffect(() => {
    if (account && isConnected) {
      checkUserProfile(account);
    } else {
      setUserProfile(null);
    }
  }, [account, isConnected]);

  const checkUserProfile = async (address: string) => {
    setIsCheckingProfile(true);
    try {
      const profile = await getUserProfile(address);
      setUserProfile(profile);

      if (!profile) {
        setShowProfileSetup(true);
      }
    } catch (error) {
      console.error("Error checking user profile:", error);
    } finally {
      setIsCheckingProfile(false);
    }
  };

  const handleConnect = async () => {
    let timeout: any;

    try {
      timeout = setTimeout(() => {
        console.warn("Wallet connection timeout");
      }, 15000);

      await connectWallet();
    } catch (error) {
      console.log("Wallet connect rejected");
    } finally {
      clearTimeout(timeout);
    }
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleProfileCreated = (profile: UserProfile) => {
    setUserProfile(profile);
    setShowProfileSetup(false);
  };

  return (
    <>
      <div>
        {isConnected && account ? (
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-primary/20 px-3 py-1 text-sm text-primary">
              {userProfile?.username || shortenAddress(account)}
            </div>
            <Button variant="outline" size="sm" onClick={disconnectWallet}>
              Disconnect
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleConnect}
            disabled={isConnecting || isCheckingProfile}
            className="gap-2"
            size={isLandingPage ? "lg" : "default"}
            variant={isLandingPage ? "default" : "default"}
          >
            {isConnecting || isCheckingProfile ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isConnecting ? "Connecting..." : "Checking..."}
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4" />
                Connect Wallet
              </>
            )}
          </Button>
        )}
      </div>

      {showProfileSetup && (
        <Dialog open={showProfileSetup} onOpenChange={setShowProfileSetup}>
          <DialogContent className="sm:max-w-[600px] md:max-w-[720px] lg:max-w-[800px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Set up your profile</DialogTitle>
            </DialogHeader>
            <ProfileSetupForm onSuccess={handleProfileCreated} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}