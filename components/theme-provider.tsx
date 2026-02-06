"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

/**
 * Theme Provider Component
 * 
 * Wraps the application with next-themes provider to enable dark mode.
 * Automatically detects and respects the user's OS theme preference.
 * 
 * Features:
 * - System-dependent theme detection (follows OS dark/light mode)
 * - Prevents flash-of-unstyled-content (FOUC) on page load
 * - Avoids hydration mismatch errors
 * - Ready for manual toggle implementation (via useTheme hook)
 * 
 * Usage in app/layout.tsx:
 * ```tsx
 * <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
 *   {children}
 * </ThemeProvider>
 * ```
 * 
 * To manually toggle theme (for future implementation):
 * ```tsx
 * import { useTheme } from "next-themes"
 * 
 * const { theme, setTheme } = useTheme()
 * 
 * <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
 *   Toggle Theme
 * </button>
 * ```
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
