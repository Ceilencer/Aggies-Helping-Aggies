"use client"
import { useEffect, useState } from "react"

export default function DonateFooter() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function checkBottom() {
      const scrollY = window.scrollY || window.pageYOffset
      const viewport = window.innerHeight
      const fullHeight = document.documentElement.scrollHeight
      const nearBottom = scrollY + viewport >= fullHeight - 120
      setVisible(nearBottom)
    }

    checkBottom()
    window.addEventListener("scroll", checkBottom, { passive: true })
    window.addEventListener("resize", checkBottom)
    return () => {
      window.removeEventListener("scroll", checkBottom)
      window.removeEventListener("resize", checkBottom)
    }
  }, [])

  return (
    <div
      className={`fixed bottom-4 left-0 w-full z-50 pointer-events-none transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center">
        <a
          href="https://www.zeffy.com/en-US/donation-form/donate-to-aggies-helping-aggies"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Donate to Aggies Helping Aggies"
          className="pointer-events-auto inline-flex items-center justify-center rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-medium shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          Donate to Aggies Helping Aggies
        </a>
      </div>
    </div>
  )
}
