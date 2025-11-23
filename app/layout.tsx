import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { Web3Provider } from "@/components/web3-provider"
import { FirebaseProvider } from "@/components/firebase-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Web3 Project Management",
  description: "A web3 project management tool with kanban board",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} bg-gradient-to-br from-[hsl(210,40%,98%)] to-[hsl(250,40%,98%)] dark:bg-background`}
      >
        <FirebaseProvider>
          <Web3Provider>
            <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
              {children}
              <Toaster />
            </ThemeProvider>
          </Web3Provider>
        </FirebaseProvider>
      </body>
    </html>
  )
}
