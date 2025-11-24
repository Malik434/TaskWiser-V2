"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useWeb3 } from "./web3-provider";
import { useFirebase } from "./firebase-provider";
import { ProfileSetupForm } from "./profile-setup-form";
import { Wallet, Loader2 } from "lucide-react";
import type { UserProfile } from "@/lib/types";
import { usePathname } from "next/navigation";
import { signInWithCustomToken, signOut } from "firebase/auth";
import { useToast } from "@/components/ui/use-toast";

export function WalletConnect() {
  const {
    account,
    connectWallet,
    disconnectWallet,
    isConnecting,
    isConnected,
    signer,
  } = useWeb3();
  const { auth, getUserProfile } = useFirebase();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);
  const pathname = usePathname();
  const { toast } = useToast();

  // Check if we're on the landing page
  const isLandingPage = pathname === "/landing";

  const ensureFirebaseAuth = useCallback(
    async (address: string) => {
      if (!auth || !signer) {
        throw new Error("Wallet signer or Firebase auth not available");
      }

      const normalizedAddress = address.toLowerCase();
      
      // Check if there's already a valid Firebase Auth session with matching wallet address
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          // Get the token with custom claims to check walletAddress
          const tokenResult = await currentUser.getIdTokenResult();
          const tokenWalletAddress = (
            tokenResult.claims.walletAddress as string | undefined
          )?.toLowerCase();
          
          // If the token's walletAddress matches the current wallet, we're good
          if (tokenWalletAddress === normalizedAddress) {
            return; // Session is valid, no need to re-authenticate
          }
        } catch (error) {
          // If token refresh fails, continue with authentication flow
          console.warn("Failed to get token result, re-authenticating:", error);
        }
      }

      // No valid session or wallet mismatch - proceed with authentication
      const nonceResponse = await fetch("/api/auth/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: normalizedAddress }),
      });

      const noncePayload = await nonceResponse.json();
      if (!nonceResponse.ok) {
        throw new Error(noncePayload?.error || "Failed to request nonce.");
      }

      const message = `TaskWiser authentication nonce:\n${noncePayload.nonce}`;
      const signature = await signer.signMessage(message);

      const tokenResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: normalizedAddress, signature }),
      });

      const tokenPayload = await tokenResponse.json();
      if (!tokenResponse.ok) {
        throw new Error(tokenPayload?.error || "Failed to verify signature.");
      }

      await signInWithCustomToken(auth, tokenPayload.token);
    },
    [auth, signer]
  );

  useEffect(() => {
    let cancelled = false;

    const syncProfile = async () => {
      if (!account || !isConnected) {
        setUserProfile(null);
        setShowProfileSetup(false);
        return;
      }

      if (!auth || !signer) {
        return;
      }

      setIsCheckingProfile(true);

      try {
        await ensureFirebaseAuth(account);
        const profile = await getUserProfile(account);
        if (cancelled) return;
        setUserProfile(profile);
        setShowProfileSetup(!profile);
      } catch (error) {
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
            <div className="rounded-full bg-primary/20 px-3 py-1 text-sm text-primary">
              {userProfile?.username || shortenAddress(account)}
            </div>
            <Button variant="outline" size="sm" onClick={handleDisconnect}>
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

      <ProfileSetupForm
        isOpen={showProfileSetup}
        onClose={() => setShowProfileSetup(false)}
      />
    </>
  );
}
