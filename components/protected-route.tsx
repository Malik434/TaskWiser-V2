"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useWeb3 } from "./web3-provider"
import { WalletConnectionCard } from "./wallet-connection-card"

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isConnected, account } = useWeb3()
  const [isClient, setIsClient] = useState(false)

  // This effect ensures we only check wallet connection status on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return null
  }

  // If wallet is not connected, show the wallet connection card
  if (!isConnected || !account) {
    return <WalletConnectionCard />
  }

  return <>{children}</>
}
