"use client"

import * as React from "react"

export function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = React.useState(false)

  React.useEffect(() => {
    // Check system preference
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    setIsDarkMode(mediaQuery.matches)

    // Listen for changes
    const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches)
    mediaQuery.addEventListener("change", handler)

    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  return isDarkMode
}
