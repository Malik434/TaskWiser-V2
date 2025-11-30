"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useWeb3 } from "./web3-provider"
import { useFirebase } from "./firebase-provider"
import { WalletConnectionCard } from "./wallet-connection-card"
import { Loader2 } from "lucide-react"

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isConnected, account, signer } = useWeb3()
  const { user, auth, isInitialized, isAuthenticating, ensureFirebaseAuth } = useFirebase()
  const [isClient, setIsClient] = useState(false)
  const [isWaitingForAuth, setIsWaitingForAuth] = useState(false)

  // This effect ensures we only check wallet connection status on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Trigger authentication automatically when wallet is connected but user is not authenticated
  // IMPORTANT: All hooks must be called before any conditional returns
  useEffect(() => {
    let cancelled = false;
    
    const authenticateIfNeeded = async () => {
      // Only authenticate if wallet is connected, no user, and we have signer/auth
      if (!isConnected || !account || !signer || !auth || user || isAuthenticating || isWaitingForAuth || !isClient || !isInitialized) {
        return;
      }

      // Verify signer is ready and has signMessage method
      if (typeof signer.signMessage !== "function") {
        console.warn("Signer is not ready yet, waiting...");
        // Wait a bit and retry
        await new Promise(resolve => setTimeout(resolve, 500));
        if (cancelled || !signer || typeof signer.signMessage !== "function") {
          console.error("Signer is still not ready after wait");
          return;
        }
      }

      setIsWaitingForAuth(true);
      try {
        console.log("Starting authentication for account:", account);
        await ensureFirebaseAuth(account, signer);
        console.log("Authentication completed successfully");
      } catch (error) {
        console.error("Authentication failed:", error);
        // Don't set waiting to false immediately - let user see error and retry
      } finally {
        if (!cancelled) {
          setIsWaitingForAuth(false);
        }
      }
    };

    // Add a small delay to ensure signer is fully initialized
    const timeoutId = setTimeout(() => {
      authenticateIfNeeded();
    }, 100);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [isConnected, account, signer, auth, user, isAuthenticating, isWaitingForAuth, ensureFirebaseAuth, isClient, isInitialized]);

  // Don't render anything until client-side
  if (!isClient) {
    return null
  }

  // Wait for Firebase to initialize before checking anything
  if (!isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Initializing...</p>
        </div>
      </div>
    )
  }

  // If wallet is not connected, show the wallet connection card
  if (!isConnected || !account) {
    return <WalletConnectionCard />
  }

  // If authentication is in progress, show loading state
  if (isAuthenticating || isWaitingForAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {isAuthenticating ? "Please sign the message in your wallet..." : "Waiting for authentication..."}
          </p>
        </div>
      </div>
    )
  }

  // If wallet is connected but user hasn't signed (no Firebase auth), show connection card
  // This means they need to sign the nonce message
  // CRITICAL: Only render children if user exists (authenticated with signed nonce)
  if (!user) {
    return <WalletConnectionCard />
  }

  // User is authenticated (has signed nonce), allow access
  // This is the ONLY path that allows children to render
  return <>{children}</>
}
