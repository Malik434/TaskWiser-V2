"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useScrollSpy } from "@/hooks/use-scroll-spy"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface NavItem {
  name: string
  href: string
}

export function LandingNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const activeSection = useScrollSpy(["features", "ai", "testimonials", "pricing"], 100)

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (mobileMenuOpen && !target.closest("[data-mobile-menu]")) {
        setMobileMenuOpen(false)
      }
    }

    document.addEventListener("click", handleClickOutside)
    return () => {
      document.removeEventListener("click", handleClickOutside)
    }
  }, [mobileMenuOpen])

  // Close mobile menu when window is resized to desktop size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  const navItems: NavItem[] = [
    // { name: "Features", href: "#features" },
    // { name: "AI Integration", href: "#ai" },
    // { name: "Testimonials", href: "#testimonials" },
    // { name: "Pricing", href: "#pricing" },
  ]

  const scrollToSection = (href: string) => {
    setMobileMenuOpen(false)

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
    // <>
    //   {/* Desktop Navigation */}
    //   <nav className="hidden md:flex items-center gap-6">
    //     {navItems.map((item) => (
    //       <Link
    //         key={item.name}
    //         href={item.href}
    //         className={cn(
    //           "text-sm font-medium transition-colors hover:text-primary",
    //           activeSection === item.href.replace("#", "") ? "text-primary" : "text-foreground/70",
    //         )}
    //         onClick={(e) => {
    //           e.preventDefault()
    //           scrollToSection(item.href)
    //         }}
    //       >
    //         {item.name}
    //       </Link>
    //     ))}
    //   </nav>

    //   {/* Mobile Navigation Toggle */}
    //   <Button
    //     variant="ghost"
    //     size="icon"
    //     className="md:hidden"
    //     onClick={(e) => {
    //       e.stopPropagation()
    //       setMobileMenuOpen(!mobileMenuOpen)
    //     }}
    //     aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
    //   >
    //     {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    //   </Button>

    //   {/* Mobile Navigation Menu */}
    //   {mobileMenuOpen && (
    //     <div
    //       className="absolute top-16 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b md:hidden"
    //       data-mobile-menu
    //     >
    //       <nav className="container py-4">
    //         <ul className="flex flex-col space-y-4">
    //           {navItems.map((item) => (
    //             <li key={item.name}>
    //               <Link
    //                 href={item.href}
    //                 className={cn(
    //                   "block py-2 text-base font-medium transition-colors hover:text-primary",
    //                   activeSection === item.href.replace("#", "") ? "text-primary" : "text-foreground/70",
    //                 )}
    //                 onClick={(e) => {
    //                   e.preventDefault()
    //                   scrollToSection(item.href)
    //                 }}
    //               >
    //                 {item.name}
    //               </Link>
    //             </li>
    //           ))}
    //         </ul>
    //       </nav>
    //     </div>
    //   )}
    // </>
  null )
}
