import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { headers } from "next/headers"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import WIPBanner from "@/components/WIPBanner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  verification: {
    google: 'lBYzRmAK-62abICBuO0MNeS9Rte-nxq9s3kQmt0165k',
  },
  title: "Aggies Helping Aggies - Texas A&M Community Platform",
  description: "A verified community engagement platform for Texas A&M University affiliates",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Read the nonce injected by proxy.ts so ThemeProvider's inline theme-detection
  // script is allowed by the nonce-based CSP instead of requiring 'unsafe-inline'.
  const nonce = (await headers()).get('x-nonce') ?? undefined

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} flex flex-col h-[100dvh]`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          nonce={nonce}
        >
          <WIPBanner />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
