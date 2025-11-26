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
  const { isConnected, account } = useWeb3()
  const { user, auth, isInitialized } = useFirebase()
  const [isClient, setIsClient] = useState(false)

  // This effect ensures we only check wallet connection status on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

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
