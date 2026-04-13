import Link from 'next/link'
import Image from 'next/image'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <Image
        src="/images/logos/logo-no-text.svg"
        alt="Aggies Helping Aggies"
        width={64}
        height={64}
        className="opacity-80"
      />

      <div className="space-y-2">
        <h1 className="text-5xl font-bold tracking-tight text-foreground">404</h1>
        <p className="text-lg font-medium text-foreground">Page not found</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          This page doesn&apos;t exist or may have been moved. Let&apos;s get you back on track.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
        >
          Home
        </Link>
      </div>
    </div>
  )
}
