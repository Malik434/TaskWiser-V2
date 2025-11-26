"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Twitter, Github, Linkedin, Mail } from "lucide-react"

export function LandingFooter() {
  const scrollToSection = (href: string) => {
    // Extract the ID from the href
    const id = href.replace("#", "")
    const element = document.getElementById(id)

    if (element) {
      // Get the header height to offset the scroll position
      const headerHeight = document.querySelector("header")?.offsetHeight || 0
      const elementPosition = element.getBoundingClientRect().top + window.scrollY
      const offsetPosition = elementPosition - headerHeight - 20

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      })
    }
  }

  return (
    <footer className="border-t border-slate-200 bg-white transition-colors dark:border-slate-800 dark:bg-slate-950">
      <div className="container px-4 py-12 md:px-6 md:py-16 lg:py-20">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary sm:h-10 sm:w-10">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 text-white sm:h-5 sm:w-5"
                >
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <span className="text-lg font-bold text-slate-900 sm:text-xl dark:text-slate-50">Task Wiser</span>
            </div>
            <p className="text-xs text-slate-600 sm:text-sm dark:text-slate-400">
              Revolutionizing task management for Web3 teams with AI-powered tools and blockchain integration.
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" asChild className="h-8 w-8 sm:h-10 sm:w-10">
                <Link href="https://twitter.com" target="_blank" rel="noopener noreferrer">
                  <Twitter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="sr-only">Twitter</span>
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild className="h-8 w-8 sm:h-10 sm:w-10">
                <Link href="https://github.com" target="_blank" rel="noopener noreferrer">
                  <Github className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="sr-only">GitHub</span>
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild className="h-8 w-8 sm:h-10 sm:w-10">
                <Link href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
                  <Linkedin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="sr-only">LinkedIn</span>
                </Link>
              </Button>
            </div>
          </div>
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-base font-medium text-slate-900 sm:text-lg dark:text-slate-100">Product</h3>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <button
                  onClick={() => scrollToSection("#features")}
                  className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                >
                  Features
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection("#ai")} className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                  AI Integration
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection("#pricing")}
                  className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                >
                  Pricing
                </button>
              </li>
              <li>
                <Link href="/docs" className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                  Roadmap
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-base font-medium text-slate-900 sm:text-lg dark:text-slate-100">Resources</h3>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <Link href="/docs" className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/docs" className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/docs" className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                  Tutorials
                </Link>
              </li>
              <li>
                <Link href="/docs" className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                  Support
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-base font-medium text-slate-900 sm:text-lg dark:text-slate-100">Subscribe</h3>
            <p className="text-xs text-slate-600 sm:text-sm dark:text-slate-400">Stay updated with the latest features and releases.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input placeholder="Enter your email" type="email" className="w-full sm:max-w-[220px]" />
              <Button type="submit" size="sm" className="w-full sm:w-auto">
                <Mail className="mr-2 h-4 w-4" />
                Subscribe
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-12 border-t border-slate-200 pt-6 dark:border-slate-800">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              © {new Date().getFullYear()} Task Wiser. All rights reserved.
            </p>
            <div className="flex gap-4 text-sm">
              <Link href="/docs" className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                Terms of Service
              </Link>
              <Link href="/docs" className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
