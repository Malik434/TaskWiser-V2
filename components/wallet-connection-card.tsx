"use client"

import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useWeb3 } from "./web3-provider"
import { Wallet, ArrowRight, ShieldAlert, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export function WalletConnectionCard() {
  const { connectWallet, isConnected, isConnecting, account } = useWeb3()
  const router = useRouter()

  // If wallet is connected, redirect to dashboard
  useEffect(() => {
    if (isConnected && account) {
      router.refresh()
    }
  }, [isConnected, account, router])

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Connect Your Wallet</CardTitle>
          <CardDescription>
            You need to connect your Web3 wallet to access the Task Wiser dashboard and features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-dashed p-4">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 rounded-full bg-primary/10 p-1">
                <ShieldAlert className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Why connect a wallet?</p>
                <p className="text-sm text-muted-foreground">
                  Task Wiser uses blockchain technology to secure your tasks, manage bounties, and build your on-chain
                  reputation. Your wallet serves as your secure identity in the Web3 ecosystem.
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background">
                  <img src="/images/metamask-logo.png" alt="MetaMask" className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium">MetaMask</p>
                  <p className="text-xs text-muted-foreground">Connect using browser wallet</p>
                </div>
              </div>
              <Button size="sm" onClick={connectWallet} disabled={isConnecting}>
                {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                Connect
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background">
                  <img src="/images/walletconnect-logo.png" alt="WalletConnect" className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium">WalletConnect</p>
                  <p className="text-xs text-muted-foreground">Connect using mobile wallet</p>
                </div>
              </div>
              <Button size="sm" variant="outline" disabled>
                Coming Soon
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button className="w-full" onClick={connectWallet} disabled={isConnecting}>
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...
              </>
            ) : (
              <>
                Connect Wallet <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
          <div className="text-center text-sm text-muted-foreground">
            <Link href="/landing" className="underline underline-offset-4 hover:text-primary">
              Return to home page
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
