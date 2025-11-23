"use client"

import { useState, useEffect } from "react"

export function useScrollSpy(sectionIds: string[], offset = 100) {
  const [activeSection, setActiveSection] = useState<string | null>(null)

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + offset

      // Find the section that is currently in view
      const currentSection = sectionIds
        .map((id) => {
          const element = document.getElementById(id)
          if (!element) return { id, top: -1, bottom: -1 }

          const rect = element.getBoundingClientRect()
          const top = rect.top + window.scrollY
          const bottom = rect.bottom + window.scrollY

          return { id, top, bottom }
        })
        .find((section) => {
          return scrollPosition >= section.top && scrollPosition < section.bottom
        })

      if (currentSection) {
        setActiveSection(currentSection.id)
      }
    }

    // Initial check
    handleScroll()

    // Add scroll event listener
    window.addEventListener("scroll", handleScroll)

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [sectionIds, offset])

  return activeSection
}
