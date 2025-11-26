"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { useWeb3 } from "./web3-provider"
import { useFirebase } from "./firebase-provider"
import { Wallet, ArrowRight, Shield, Sparkles, Loader2, Lock, Zap } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signInWithCustomToken } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"

export function WalletConnectionCard() {
  const { connectWallet, isConnected, isConnecting, account, signer } = useWeb3()
  const { auth, user } = useFirebase()
  const router = useRouter()
  const { toast } = useToast()
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  // Firebase authentication function
  const ensureFirebaseAuth = useCallback(
    async (address: string) => {
      if (!auth || !signer) {
        throw new Error("Wallet signer or Firebase auth not available");
      }

      const normalizedAddress = address.toLowerCase();
      
      // Check if there's already a valid Firebase Auth session
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const tokenResult = await currentUser.getIdTokenResult();
          const tokenWalletAddress = (
            tokenResult.claims.walletAddress as string | undefined
          )?.toLowerCase();
          
          if (tokenWalletAddress === normalizedAddress) {
            return; // Session is valid
          }
        } catch (error) {
          console.warn("Failed to get token result, re-authenticating:", error);
        }
      }

      // Get nonce and sign message
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

  // Trigger authentication after wallet connection
  useEffect(() => {
    let cancelled = false;

    const authenticateWallet = async () => {
      if (!isConnected || !account || !signer || !auth) {
        return;
      }

      // If already authenticated, redirect
      if (user) {
        router.push("/dashboard");
        return;
      }

      setIsAuthenticating(true);

      try {
        await ensureFirebaseAuth(account);
        if (!cancelled) {
          // Successfully authenticated, redirect
          toast({
            title: "Connected successfully!",
            description: "Redirecting to dashboard...",
          });
          router.push("/dashboard");
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error authenticating wallet:", error);
          toast({
            title: "Authentication failed",
            description: error instanceof Error ? error.message : "Please try again.",
            variant: "destructive",
          });
          setIsAuthenticating(false);
        }
      }
    };

    authenticateWallet();

    return () => {
      cancelled = true;
    };
  }, [isConnected, account, signer, auth, user, ensureFirebaseAuth, router, toast])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100 p-4 transition-colors dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Ambient glow layers */}
      <div className="pointer-events-none absolute inset-0 opacity-60 transition-opacity duration-700 dark:opacity-80">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 bg-[radial-gradient(circle,_rgba(99,102,241,0.25),_transparent_70%)] blur-3xl transition-all duration-1000 dark:bg-[radial-gradient(circle,_rgba(124,136,255,0.4),_transparent_65%)]" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 bg-[radial-gradient(circle,_rgba(168,85,247,0.2),_transparent_70%)] blur-3xl transition-all duration-1000 dark:bg-[radial-gradient(circle,_rgba(147,51,234,0.35),_transparent_65%)]" />
      </div>

      <div className="relative z-10 w-full max-w-2xl animate-in fade-in duration-700">
        {/* Main Card */}
        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white/80 shadow-[0_20px_80px_rgba(99,102,241,0.15)] backdrop-blur-xl transition-all duration-500 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-[0_20px_80px_rgba(99,102,241,0.3)]">
          {/* Header with gradient accent */}
          <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-r from-indigo-50 via-purple-50 to-fuchsia-50 p-8 dark:border-slate-800 dark:from-indigo-950/50 dark:via-purple-950/50 dark:to-fuchsia-950/50 sm:p-10">
            <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/50 to-transparent dark:from-slate-900/50" />
            
            <div className="relative space-y-4 text-center">
              {/* Icon */}
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 shadow-[0_10px_40px_rgba(99,102,241,0.4)] transition-transform hover:scale-105 sm:h-20 sm:w-20">
                <Wallet className="h-8 w-8 text-white sm:h-10 sm:w-10" />
              </div>

              {/* Title */}
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 transition-colors sm:text-4xl dark:text-slate-50">
                  Connect Your Wallet
                </h1>
                <p className="mx-auto max-w-md text-base text-slate-600 transition-colors dark:text-slate-400">
                  Sign in securely with your Web3 wallet to access Task Wiser's collaborative workspace
                </p>
              </div>

              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/60 px-4 py-1.5 text-sm text-slate-700 backdrop-blur transition-all dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Powered by blockchain authentication
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-6 p-8 sm:p-10">
            {/* Features Grid */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 transition-all duration-300 hover:bg-slate-100/50 dark:border-slate-800 dark:bg-slate-800/30 dark:hover:bg-slate-800/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10 dark:bg-indigo-500/20">
                  <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Secure</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Your keys, your identity. Fully non-custodial.
                </p>
              </div>

              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 transition-all duration-300 hover:bg-slate-100/50 dark:border-slate-800 dark:bg-slate-800/30 dark:hover:bg-slate-800/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10 dark:bg-purple-500/20">
                  <Lock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Private</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  No personal data stored. Sign once to verify.
                </p>
              </div>

              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 transition-all duration-300 hover:bg-slate-100/50 dark:border-slate-800 dark:bg-slate-800/30 dark:hover:bg-slate-800/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fuchsia-500/10 dark:bg-fuchsia-500/20">
                  <Zap className="h-5 w-5 text-fuchsia-600 dark:text-fuchsia-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Instant</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Connect in seconds, start collaborating.
                </p>
              </div>
            </div>

            {/* Wallet Options */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Choose your wallet</p>
              
              {/* MetaMask Option */}
              <button
                onClick={connectWallet}
                disabled={isConnecting || isAuthenticating}
                className="group flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-300 hover:border-indigo-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:shadow-lg disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:shadow-none dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-indigo-700 dark:hover:from-indigo-950/30 dark:hover:to-purple-950/30 sm:p-5"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg transition-transform group-hover:scale-105">
                    <Wallet className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">MetaMask</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {isAuthenticating ? "Signing message..." : "Most popular browser wallet"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isConnecting || isAuthenticating ? (
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <ArrowRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                  )}
                </div>
              </button>

              {/* WalletConnect Option */}
              <div className="group flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 opacity-50 dark:border-slate-800 dark:bg-slate-900/50 sm:p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-cyan-600 shadow-lg">
                    <Wallet className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">WalletConnect</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Connect with mobile wallets
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  Coming Soon
                </span>
              </div>
            </div>

            {/* Primary CTA */}
            <Button
              onClick={connectWallet}
              disabled={isConnecting || isAuthenticating}
              className="h-12 w-full gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 text-base font-semibold text-white shadow-[0_10px_40px_rgba(99,102,241,0.4)] transition-all hover:scale-[1.02] hover:shadow-[0_15px_50px_rgba(99,102,241,0.5)] disabled:opacity-50 disabled:hover:scale-100"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Connecting to wallet...
                </>
              ) : isAuthenticating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Wallet className="h-5 w-5" />
                  Connect Wallet to Continue
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>

            {/* Footer Link */}
            <div className="text-center">
              <Link
                href="/landing"
                className="inline-flex items-center gap-1 text-sm text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                Return to home page
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Info */}
        <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          <p>
            Don't have a wallet?{" "}
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Get MetaMask
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
