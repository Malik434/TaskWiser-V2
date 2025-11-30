"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useWeb3 } from "./web3-provider";
import { useFirebase } from "./firebase-provider";
import { ProfileSetupForm } from "./profile-setup-form";
import { Wallet, Loader2 } from "lucide-react";
import type { UserProfile } from "@/lib/types";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { useToast } from "@/components/ui/use-toast";

const PROFILE_CACHE_PREFIX = "wallet-profile:";

const getProfileCacheKey = (address: string) =>
  `${PROFILE_CACHE_PREFIX}${address.toLowerCase()}`;

const readCachedProfile = (address: string): UserProfile | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(getProfileCacheKey(address));
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch (error) {
    console.warn("Failed to parse cached wallet profile, clearing cache.", error);
    window.sessionStorage.removeItem(getProfileCacheKey(address));
    return null;
  }
};

const writeProfileCache = (address: string, profile: UserProfile | null) => {
  if (typeof window === "undefined") {
    return;
  }

  const key = getProfileCacheKey(address);
  if (profile) {
    window.sessionStorage.setItem(key, JSON.stringify(profile));
  } else {
    window.sessionStorage.removeItem(key);
  }
};

export function WalletConnect() {
  const {
    account,
    connectWallet,
    disconnectWallet,
    isConnecting,
    isConnected,
    signer,
  } = useWeb3();
  const { auth, getUserProfile, ensureFirebaseAuth, isAuthenticating } = useFirebase();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    return account ? readCachedProfile(account) : null;
  });
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);
  const authRequestRef = useRef<Promise<void> | null>(null);
  const pathname = usePathname();
  const { toast } = useToast();
  const cachedProfileUsername = useMemo(() => {
    if (!account) {
      return undefined;
    }
    return readCachedProfile(account)?.username;
  }, [account]);

  // Check if we're on the landing page
  const isLandingPage = pathname === "/landing";

  useEffect(() => {
    if (!account || !isConnected) {
      setUserProfile(null);
      setShowProfileSetup(false);
      return;
    }

    const cachedProfile = readCachedProfile(account);
    if (cachedProfile) {
      setUserProfile((prev) => prev ?? cachedProfile);
      setShowProfileSetup(false);
    }
  }, [account, isConnected]);

  useEffect(() => {
    let cancelled = false;
    const activeAddress = account?.toLowerCase();

    const syncProfile = async () => {
      if (!account || !isConnected || !activeAddress) {
        setUserProfile(null);
        setShowProfileSetup(false);
        return;
      }

      if (!auth || !signer) {
        return;
      }

      // Prevent duplicate authentication requests
      if (authRequestRef.current) {
        try {
          await authRequestRef.current;
        } catch (error) {
          // Ignore errors from previous request
        }
      }

      setIsCheckingProfile(true);

      try {
        // Use centralized authentication function
        authRequestRef.current = ensureFirebaseAuth(account, signer);
        await authRequestRef.current;
        authRequestRef.current = null;

        if (cancelled) return;
        if (account?.toLowerCase() !== activeAddress) return;

        const profile = await getUserProfile(account);
        if (cancelled) return;
        if (account?.toLowerCase() !== activeAddress) return;

        setUserProfile(profile);
        setShowProfileSetup(!profile);
        writeProfileCache(account, profile);
      } catch (error) {
        authRequestRef.current = null;
        if (!cancelled) {
          console.error("Error syncing wallet profile:", error);
          toast({
            title: "Wallet authentication failed",
            description:
              error instanceof Error ? error.message : "Please try again.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) {
          setIsCheckingProfile(false);
        }
      }
    };

    void syncProfile();

    return () => {
      cancelled = true;
    };
  }, [
    account,
    isConnected,
    auth,
    signer,
    ensureFirebaseAuth,
    getUserProfile,
    toast,
  ]);

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

  const handleDisconnect = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch (error) {
      console.error("Error signing out of Firebase auth:", error);
    } finally {
      if (account) {
        writeProfileCache(account, null);
      }
      setUserProfile(null);
      setShowProfileSetup(false);
      disconnectWallet();
    }
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <>
      <div>
        {isConnected && account ? (
          <div className="flex items-center gap-2">
            <div className={`hidden rounded-full px-2 py-1 text-xs font-medium sm:block sm:px-3 sm:text-sm transition-all duration-300 ${
              isLandingPage 
                ? "bg-gradient-to-r from-indigo-500/10 to-fuchsia-500/10 text-slate-700 dark:from-indigo-500/20 dark:to-fuchsia-500/20 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                : "bg-primary/20 text-primary"
            }`}>
              {userProfile?.username ||
                cachedProfileUsername ||
                shortenAddress(account)}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDisconnect} 
              className={`text-xs transition-all duration-300 sm:text-sm ${
                isLandingPage
                  ? "rounded-full border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                  : ""
              }`}
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleConnect}
            disabled={isConnecting || isCheckingProfile || isAuthenticating}
            size={isLandingPage ? "default" : "sm"}
            className={`gap-1.5 text-xs transition-all duration-300 sm:gap-2 sm:text-sm ${
              isLandingPage
                ? "h-11 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 font-semibold text-white shadow-lg hover:scale-[1.02] hover:shadow-xl disabled:opacity-50 disabled:hover:scale-100"
                : ""
            }`}
          >
            {isConnecting || isCheckingProfile || isAuthenticating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">
                  {isConnecting ? "Connecting..." : isAuthenticating ? "Signing..." : "Checking..."}
                </span>
                <span className="sm:hidden">...</span>
              </>
            ) : (
              <>
                <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Connect Wallet</span>
                <span className="sm:hidden">Connect</span>
              </>
            )}
          </Button>
        )}
      </div>

      <ProfileSetupForm
        isOpen={showProfileSetup}
        onClose={() => setShowProfileSetup(false)}
      />
    </>
  );
}
