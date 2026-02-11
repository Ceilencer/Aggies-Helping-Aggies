import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Logo } from "@/components/Logo"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <header className="border-b bg-header-bg">
        <nav className="container mx-auto flex items-center justify-between px-4 py-6">
          <div className="flex items-center space-x-2">
            <Logo href="/dashboard" />
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Content */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="mb-6 text-5xl font-bold text-page-heading-text">
          Support. Connect. Share.
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-xl text-page-subtext">
          A verified community platform exclusively for Texas A&M University students, 
          former students, and affiliates. Help fund aggie rings, graduation regalia and support the aggie network!
        </p>
        <div className="flex items-center justify-center space-x-4">
          <Link href="/signup">
            <Button size="lg" className="text-lg">
              Join the Community
            </Button>
          </Link>
          <Link href="/alumni-verification">
            <Button size="lg" variant="outline" className="text-lg">
              Former Student Verification
            </Button>
          </Link>
        </div>
        
        {/* Trust Badge */}
        <div className="mt-12 flex items-center justify-center space-x-2 text-sm text-page-subtext">
          <svg className="h-5 w-5 text-icon" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Verified TAMU-only community</span>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="mb-12 text-center text-3xl font-bold text-page-heading-text">
          Built for Aggies, by Aggies
        </h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="mb-4 text-4xl">🔒</div>
              <CardTitle className="text-page-heading-text">Verified Community</CardTitle>
              <CardDescription className="text-page-subtext">
                Multi-tier verification ensures only Texas A&M affiliates can access the platform
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-4 text-4xl">💼</div>
              <CardTitle className="text-page-heading-text">Job Opportunities</CardTitle>
              <CardDescription className="text-page-subtext">
                Discover career opportunities shared by fellow Aggies and local businesses
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-4 text-4xl">🎟️</div>
              <CardTitle className="text-page-heading-text">Tickets</CardTitle>
              <CardDescription className="text-page-subtext">
                Buy, sell, or trade game tickets safely within the verified Aggie community
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-4 text-4xl">📢</div>
              <CardTitle className="text-page-heading-text">Promotions & Events</CardTitle>
              <CardDescription className="text-page-subtext">
                Stay updated on local promotions and community events tailored for Aggies
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-4 text-4xl">💍</div>
              <CardTitle className="text-page-heading-text">Aggie Ring Fund</CardTitle>
              <CardDescription className="text-page-subtext">
                Support fellow Aggies in achieving their dream of earning their Aggie Ring
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-4 text-4xl">🛡️</div>
              <CardTitle className="text-page-heading-text">Content Moderation</CardTitle>
              <CardDescription className="text-page-subtext">
                Automated profanity filtering and admin oversight keep discussions respectful
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold text-page-heading">
            Getting Started is Easy
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-icon text-2xl text-steps-text">
                1
              </div>
              <h3 className="mb-2 text-xl font-semibold">Sign Up</h3>
              <p className="text-page-subtext">
                Register with your @tamu.edu email or submit alumni verification
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-icon text-2xl text-steps-text">
                2
              </div>
              <h3 className="mb-2 text-xl font-semibold">Get Verified</h3>
              <p className="text-page-subtext">
                Complete verification and fill out your profile
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-icon text-2xl text-steps-text">
                3
              </div>
              <h3 className="mb-2 text-xl font-semibold">Start Connecting</h3>
              <p className="text-page-subtext">
                Join channels, share posts, and engage with the Aggie community
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="mb-6 text-4xl font-bold text-page-heading-text">
          Ready to Join the Network?
        </h2>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-page-subtext">
          Be part of a trusted community where Aggies help Aggies thrive. 
          Whether you're looking for opportunities, offering support, or just 
          staying connected, this is your platform.
        </p>
        <Link href="/signup">
          <Button size="lg" className="text-lg">
            Create Your Account
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t bg-footer-bg py-8">
        <div className="container mx-auto px-4 text-center text-footer-text">
          <p className="mb-2">
            &copy; {new Date().getFullYear()} Aggies Helping Aggies. Built for Aggies by Aggies.
          </p>
          <p className="text-sm">
            This is an independent platform and is not officially affiliated with Texas A&M University.
          </p>
        </div>
      </footer>
    </div>
  )
}
